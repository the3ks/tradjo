"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  buildCashSettlementLedger,
  PortfolioBalanceError,
  recalculatePortfolioPosition
} from "@/lib/portfolio-ledger";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const cashLedgerSchema = z.object({
  action: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  exchange: z.string().trim().max(80).optional(),
  price: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  symbol: z.string().trim().min(1).max(16),
  transactionDate: z.string().trim().optional()
});
const assetLedgerSchema = z.object({
  action: z.enum(["BUY", "SELL"]),
  assetClass: z.enum(["CRYPTO", "STOCK", "FOREX", "COMMODITY"]),
  cashPositionId: z.string().trim().optional(),
  currency: z.string().trim().min(1).max(16),
  exchange: z.string().trim().max(80).optional(),
  feeAmount: z.coerce.number().min(0).default(0),
  positionType: z.enum(["SPOT", "FUTURES"]),
  price: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  settlementAmount: z.coerce.number().positive().optional(),
  settleWithCash: z.enum(["on"]).optional(),
  symbol: z.string().trim().min(1).max(24),
  transactionDate: z.string().trim().optional()
});

export type PortfolioActionState = {
  error?: string;
  success?: string;
};

export async function createCashLedgerAction(
  _state: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  const userId = await requireUserId();
  const parsed = cashLedgerSchema.safeParse({
    action: formData.get("action"),
    exchange: formData.get("exchange") || undefined,
    price: formData.get("price"),
    quantity: formData.get("quantity"),
    symbol: formData.get("symbol"),
    transactionDate: formData.get("transactionDate") || undefined
  });

  if (!parsed.success) {
    return { error: "Enter a symbol, amount, price, and transaction type." };
  }

  const symbol = parsed.data.symbol.toUpperCase();
  const exchange = parsed.data.exchange || null;
  const signedQuantity =
    parsed.data.action === "WITHDRAWAL"
      ? -parsed.data.quantity
      : parsed.data.quantity;

  try {
    await prisma.$transaction(async (tx) => {
      const existingPosition = await tx.portfolioPosition.findFirst({
        where: {
          userId,
          symbol,
          assetClass: "CASH",
          positionType: "BALANCE",
          exchange
        },
        select: { id: true }
      });
      const position =
        existingPosition ??
        (await tx.portfolioPosition.create({
          data: {
            userId,
            symbol,
            assetClass: "CASH",
            positionType: "BALANCE",
            exchange,
            currentQuantity: new Prisma.Decimal(0),
            averageCost: new Prisma.Decimal(parsed.data.price),
            currency: symbol
          },
          select: { id: true }
        }));

      await tx.portfolioLedger.create({
        data: {
          userId,
          positionId: position.id,
          action: parsed.data.action,
          quantityChange: new Prisma.Decimal(signedQuantity),
          price: new Prisma.Decimal(parsed.data.price),
          currency: symbol,
          transactionDate: parseTransactionDate(parsed.data.transactionDate),
          source: "MANUAL_CASH"
        }
      });

      await recalculatePortfolioPosition(tx, position.id, userId);
    });
  } catch (error) {
    if (error instanceof PortfolioBalanceError) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath("/portfolio");
  revalidatePath("/portfolio/ledger");

  return { success: "Portfolio cash ledger saved." };
}

export async function createAssetLedgerAction(
  _state: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  const userId = await requireUserId();
  const parsed = assetLedgerSchema.safeParse({
    action: formData.get("action"),
    assetClass: formData.get("assetClass"),
    cashPositionId: formData.get("cashPositionId") || undefined,
    currency: formData.get("currency"),
    exchange: formData.get("exchange") || undefined,
    feeAmount: formData.get("feeAmount") || 0,
    positionType: formData.get("positionType"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
    settlementAmount: formData.get("settlementAmount") || undefined,
    settleWithCash: formData.get("settleWithCash") || undefined,
    symbol: formData.get("symbol"),
    transactionDate: formData.get("transactionDate") || undefined
  });

  if (!parsed.success) {
    return { error: "Enter an asset, quantity, price, and transaction type." };
  }

  const shouldSettle = parsed.data.settleWithCash === "on";

  if (shouldSettle && (!parsed.data.cashPositionId || !parsed.data.settlementAmount)) {
    return { error: "Select a cash balance and settlement amount." };
  }

  const symbol = parsed.data.symbol.toUpperCase();
  const currency = parsed.data.currency.toUpperCase();
  const exchange = parsed.data.exchange || null;
  const transactionDate = parseTransactionDate(parsed.data.transactionDate);
  const signedQuantity =
    parsed.data.action === "SELL" ? -parsed.data.quantity : parsed.data.quantity;

  try {
    await prisma.$transaction(async (tx) => {
      const existingPosition = await tx.portfolioPosition.findFirst({
        where: {
          userId,
          symbol,
          assetClass: parsed.data.assetClass,
          positionType: parsed.data.positionType,
          exchange
        },
        select: { id: true }
      });
      const assetPosition =
        existingPosition ??
        (await tx.portfolioPosition.create({
          data: {
            userId,
            symbol,
            assetClass: parsed.data.assetClass,
            positionType: parsed.data.positionType,
            exchange,
            currentQuantity: new Prisma.Decimal(0),
            averageCost: new Prisma.Decimal(parsed.data.price),
            currency
          },
          select: { id: true }
        }));

      const assetLedger = await tx.portfolioLedger.create({
        data: {
          userId,
          positionId: assetPosition.id,
          action: parsed.data.action,
          quantityChange: new Prisma.Decimal(signedQuantity),
          price: new Prisma.Decimal(parsed.data.price),
          feeAmount: new Prisma.Decimal(parsed.data.feeAmount),
          currency,
          transactionDate,
          source: "MANUAL_ASSET"
        },
        select: { id: true }
      });

      await recalculatePortfolioPosition(tx, assetPosition.id, userId);

      if (shouldSettle && parsed.data.cashPositionId && parsed.data.settlementAmount) {
        const cashPosition = await tx.portfolioPosition.findFirst({
          where: {
            id: parsed.data.cashPositionId,
            userId,
            assetClass: "CASH",
            positionType: "BALANCE"
          },
          select: {
            currency: true,
            id: true
          }
        });

        if (!cashPosition) {
          throw new PortfolioBalanceError("Selected cash balance was not found.");
        }

        const settlementLedger = buildCashSettlementLedger({
          action: parsed.data.action,
          settlementAmount: parsed.data.settlementAmount
        });
        const cashLedger = await tx.portfolioLedger.create({
          data: {
            userId,
            positionId: cashPosition.id,
            action: settlementLedger.action,
            quantityChange: new Prisma.Decimal(
              settlementLedger.quantityChange?.toString() ?? 0
            ),
            price: new Prisma.Decimal(1),
            currency: cashPosition.currency,
            linkedLedgerId: assetLedger.id,
            transactionDate,
            source: "MANUAL_SETTLEMENT"
          },
          select: { id: true }
        });

        await tx.portfolioLedger.update({
          where: { id: assetLedger.id },
          data: { linkedLedgerId: cashLedger.id }
        });
        await recalculatePortfolioPosition(tx, cashPosition.id, userId);
      }
    });
  } catch (error) {
    if (error instanceof PortfolioBalanceError) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath("/portfolio");
  revalidatePath("/portfolio/ledger");

  return { success: "Portfolio asset ledger saved." };
}

function parseTransactionDate(value: string | undefined) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}
