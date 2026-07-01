import { Prisma, type AssetClass, type LedgerAction, type PositionType } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export type PortfolioLedgerCalculationInput = {
  action: LedgerAction;
  quantityChange: DecimalLike;
  price: DecimalLike;
  feeAmount?: DecimalLike;
};

export type PortfolioPositionCalculation = {
  averageCost: number;
  currentQuantity: number;
  realizedPnl: number;
};

export type PortfolioPositionIdentity = {
  assetClass: AssetClass;
  positionType: PositionType;
};

export type PortfolioSettlementInput = {
  action: Extract<LedgerAction, "BUY" | "SELL">;
  settlementAmount: DecimalLike;
};

export class PortfolioBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortfolioBalanceError";
  }
}

export function buildCashSettlementLedger({
  action,
  settlementAmount
}: PortfolioSettlementInput): PortfolioLedgerCalculationInput {
  const amount = decimalNumber(settlementAmount);

  return {
    action: action === "BUY" ? "WITHDRAWAL" : "DEPOSIT",
    price: 1,
    quantityChange: action === "BUY" ? -amount : amount
  };
}

export function calculatePortfolioPosition(
  position: PortfolioPositionIdentity,
  ledgers: PortfolioLedgerCalculationInput[]
): PortfolioPositionCalculation {
  let averageCost = 0;
  let currentQuantity = 0;
  let realizedPnl = 0;

  for (const ledger of ledgers) {
    const quantityChange = decimalNumber(ledger.quantityChange);
    const price = decimalNumber(ledger.price);
    const feeAmount = decimalNumber(ledger.feeAmount);

    if (quantityChange > 0) {
      const existingCost = currentQuantity * averageCost;
      const addedCost = quantityChange * price + feeAmount;
      const nextQuantity = currentQuantity + quantityChange;

      currentQuantity = nextQuantity;
      averageCost = nextQuantity > 0 ? (existingCost + addedCost) / nextQuantity : 0;
    } else if (quantityChange < 0) {
      const removedQuantity = Math.abs(quantityChange);

      if (ledger.action === "SELL") {
        realizedPnl += removedQuantity * (price - averageCost) - feeAmount;
      }

      currentQuantity += quantityChange;

      if (currentQuantity === 0) {
        averageCost = 0;
      }
    } else if (ledger.action === "FEE" || ledger.action === "FUNDING") {
      realizedPnl -= feeAmount;
    }

    if (isStrictBalance(position) && currentQuantity < 0) {
      throw new PortfolioBalanceError("Portfolio cash balances cannot go negative.");
    }
  }

  return {
    averageCost,
    currentQuantity,
    realizedPnl
  };
}

export async function recalculatePortfolioPosition(
  tx: Prisma.TransactionClient,
  positionId: string,
  userId: string
) {
  const position = await tx.portfolioPosition.findFirst({
    where: { id: positionId, userId },
    select: {
      assetClass: true,
      positionType: true
    }
  });

  if (!position) {
    throw new Error("Portfolio position was not found.");
  }

  const ledgers = await tx.portfolioLedger.findMany({
    where: {
      positionId,
      userId
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    select: {
      action: true,
      feeAmount: true,
      price: true,
      quantityChange: true
    }
  });
  const calculation = calculatePortfolioPosition(position, ledgers);

  return tx.portfolioPosition.update({
    where: { id: positionId },
    data: {
      averageCost: new Prisma.Decimal(calculation.averageCost),
      currentQuantity: new Prisma.Decimal(calculation.currentQuantity),
      realizedPnl: new Prisma.Decimal(calculation.realizedPnl)
    }
  });
}

function isStrictBalance(position: PortfolioPositionIdentity) {
  return position.assetClass === "CASH" && position.positionType === "BALANCE";
}

function decimalNumber(value: DecimalLike) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}
