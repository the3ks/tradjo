"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  parsePortfolioCsvImport,
  portfolioImportDraftsSchema,
  type PortfolioImportDraft
} from "@/lib/portfolio-import-parser";
import {
  buildCashSettlementLedger,
  PortfolioBalanceError,
  recalculatePortfolioPosition
} from "@/lib/portfolio-ledger";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const importTargetSchema = z.enum(["PORTFOLIO_LEDGER"]);
const parsePortfolioImportSchema = z.object({
  csvText: z.string().trim().min(1),
  targetDomain: importTargetSchema
});
const savePortfolioImportSchema = z.object({
  cashPositionId: z.string().trim().optional(),
  draftJson: z.string().trim().min(1),
  settleWithCash: z.enum(["on"]).optional(),
  targetDomain: importTargetSchema
});

export type PortfolioImportActionState = {
  drafts?: PortfolioImportDraft[];
  error?: string;
  success?: string;
};

export async function parsePortfolioImportAction(
  _state: PortfolioImportActionState,
  formData: FormData
): Promise<PortfolioImportActionState> {
  const parsed = parsePortfolioImportSchema.safeParse({
    csvText: formData.get("csvText"),
    targetDomain: formData.get("targetDomain")
  });

  if (!parsed.success) {
    return { error: "Choose Portfolio Ledger and paste CSV text before parsing." };
  }

  try {
    const drafts = parsePortfolioCsvImport(parsed.data.csvText);

    if (drafts.length === 0) {
      return { error: "No portfolio ledger rows were found in the CSV text." };
    }

    return { drafts };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not parse portfolio CSV rows."
    };
  }
}

export async function savePortfolioImportAction(
  _state: PortfolioImportActionState,
  formData: FormData
): Promise<PortfolioImportActionState> {
  const userId = await requireUserId();
  const parsed = savePortfolioImportSchema.safeParse({
    cashPositionId: formData.get("cashPositionId") || undefined,
    draftJson: formData.get("draftJson"),
    settleWithCash: formData.get("settleWithCash") || undefined,
    targetDomain: formData.get("targetDomain")
  });

  if (!parsed.success) {
    return { error: "Review portfolio ledger JSON before saving." };
  }

  let drafts: PortfolioImportDraft[];

  try {
    drafts = portfolioImportDraftsSchema.parse(JSON.parse(parsed.data.draftJson));
  } catch {
    return { error: "Portfolio ledger JSON is not valid. Fix it and try again." };
  }

  if (drafts.length === 0) {
    return { error: "At least one portfolio ledger row is required." };
  }

  const shouldSettle = parsed.data.settleWithCash === "on";

  if (shouldSettle && !parsed.data.cashPositionId) {
    return { error: "Select a cash balance for batch settlement." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const draft of drafts) {
        if (draft.assetClass === "CASH") {
          await saveCashDraft(tx, userId, draft);
        } else {
          await saveAssetDraft({
            cashPositionId: parsed.data.cashPositionId,
            draft,
            shouldSettle,
            tx,
            userId
          });
        }
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
  revalidatePath("/portfolio/import");

  return {
    success:
      drafts.length === 1
        ? "1 portfolio ledger row imported."
        : `${drafts.length} portfolio ledger rows imported.`
  };
}

async function saveCashDraft(
  tx: Prisma.TransactionClient,
  userId: string,
  draft: PortfolioImportDraft
) {
  if (draft.action !== "DEPOSIT" && draft.action !== "WITHDRAWAL") {
    throw new PortfolioBalanceError("Cash import rows must use deposit or withdrawal.");
  }

  const position = await findOrCreatePosition(tx, userId, draft);
  const quantityChange =
    draft.action === "WITHDRAWAL" ? -draft.quantity : draft.quantity;

  await tx.portfolioLedger.create({
    data: {
      userId,
      positionId: position.id,
      action: draft.action,
      quantityChange: new Prisma.Decimal(quantityChange),
      price: new Prisma.Decimal(draft.price),
      currency: draft.currency,
      transactionDate: parseTransactionDate(draft.transactionDate),
      source: "CSV_IMPORT"
    }
  });
  await recalculatePortfolioPosition(tx, position.id, userId);
}

async function saveAssetDraft({
  cashPositionId,
  draft,
  shouldSettle,
  tx,
  userId
}: {
  cashPositionId: string | undefined;
  draft: PortfolioImportDraft;
  shouldSettle: boolean;
  tx: Prisma.TransactionClient;
  userId: string;
}) {
  if (draft.action !== "BUY" && draft.action !== "SELL") {
    throw new PortfolioBalanceError("Asset import rows must use buy or sell.");
  }

  const position = await findOrCreatePosition(tx, userId, draft);
  const quantityChange = draft.action === "SELL" ? -draft.quantity : draft.quantity;
  const transactionDate = parseTransactionDate(draft.transactionDate);
  const assetLedger = await tx.portfolioLedger.create({
    data: {
      userId,
      positionId: position.id,
      action: draft.action,
      quantityChange: new Prisma.Decimal(quantityChange),
      price: new Prisma.Decimal(draft.price),
      feeAmount: new Prisma.Decimal(draft.feeAmount),
      currency: draft.currency,
      transactionDate,
      source: "CSV_IMPORT"
    },
    select: { id: true }
  });

  await recalculatePortfolioPosition(tx, position.id, userId);

  if (!shouldSettle || !cashPositionId) {
    return;
  }

  const cashPosition = await tx.portfolioPosition.findFirst({
    where: {
      id: cashPositionId,
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

  const settlement = buildCashSettlementLedger({
    action: draft.action,
    settlementAmount: draft.quantity * draft.price
  });
  const cashLedger = await tx.portfolioLedger.create({
    data: {
      userId,
      positionId: cashPosition.id,
      action: settlement.action,
      quantityChange: new Prisma.Decimal(settlement.quantityChange?.toString() ?? 0),
      price: new Prisma.Decimal(1),
      currency: cashPosition.currency,
      linkedLedgerId: assetLedger.id,
      transactionDate,
      source: "CSV_IMPORT_SETTLEMENT"
    },
    select: { id: true }
  });

  await tx.portfolioLedger.update({
    where: { id: assetLedger.id },
    data: { linkedLedgerId: cashLedger.id }
  });
  await recalculatePortfolioPosition(tx, cashPosition.id, userId);
}

async function findOrCreatePosition(
  tx: Prisma.TransactionClient,
  userId: string,
  draft: PortfolioImportDraft
) {
  const existingPosition = await tx.portfolioPosition.findFirst({
    where: {
      userId,
      symbol: draft.symbol,
      assetClass: draft.assetClass,
      positionType: draft.positionType,
      exchange: draft.exchange
    },
    select: { id: true }
  });

  if (existingPosition) {
    return existingPosition;
  }

  return tx.portfolioPosition.create({
    data: {
      userId,
      symbol: draft.symbol,
      assetClass: draft.assetClass,
      positionType: draft.positionType,
      exchange: draft.exchange,
      currentQuantity: new Prisma.Decimal(0),
      averageCost: new Prisma.Decimal(draft.price),
      currency: draft.currency
    },
    select: { id: true }
  });
}

function parseTransactionDate(value: string | null) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}
