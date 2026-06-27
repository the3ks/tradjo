import { Prisma, type CollectionSyncSource, type TradeStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type RawJson = Prisma.JsonValue;
type RawObject = Record<string, unknown>;

type NormalizationResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
};

type SyncSourceForTrades = Pick<
  CollectionSyncSource,
  "id" | "userId" | "collectionId" | "exchangeConnectionId" | "marketType"
> & {
  symbols: Array<{ symbol: string }>;
  symbolFilterMode: "ALL" | "INCLUDE" | "EXCLUDE";
};

export async function normalizeTradesForSyncSource(
  syncSource: SyncSourceForTrades
): Promise<NormalizationResult> {
  if (syncSource.marketType === "PERPETUAL") {
    return normalizePerpetualTrades(syncSource);
  }

  if (syncSource.marketType === "FUTURES") {
    return normalizeStandardFuturesTrades(syncSource);
  }

  return { createdCount: 0, updatedCount: 0, skippedCount: 0 };
}

async function normalizePerpetualTrades(syncSource: SyncSourceForTrades) {
  const rawPositions = await prisma.rawPosition.findMany({
    where: {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: "PERPETUAL",
      ...symbolWhere(syncSource)
    },
    orderBy: [{ updatedTime: "asc" }, { createdAt: "asc" }]
  });
  const rawIncomes = await prisma.rawIncome.findMany({
    where: {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: "PERPETUAL",
      ...symbolWhere(syncSource)
    }
  });
  const incomesBySymbol = groupBySymbol(rawIncomes);
  const result = emptyResult();

  for (const position of rawPositions) {
    const relatedIncomes = filterIncomesForTrade(
      incomesBySymbol.get(position.symbol) ?? [],
      position.openedAt,
      position.updatedTime
    );
    const incomeTotals = totalIncomes(relatedIncomes);
    const grossPnl = incomeTotals.realizedPnl ?? position.realizedPnl;
    const tradingFee = incomeTotals.tradingFee;
    const fundingFee = incomeTotals.fundingFee;
    const netPnl = sumDecimals(grossPnl, tradingFee, fundingFee);
    const status = inferPerpetualStatus(position.quantity, position.updatedTime);
    const settledAt = inferSettledAt(status, position.updatedTime);

    await upsertTrade({
      result,
      syncSource,
      externalTradeId: `PERPETUAL:${position.exchangePositionId}`,
      sourceRecordType: "RAW_POSITION",
      sourceRecordId: position.id,
      symbol: position.symbol,
      marketType: "PERPETUAL",
      side: position.side,
      status: settledAt ? "SETTLED" : status,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      exitPrice: position.markPrice,
      grossPnl,
      tradingFee,
      fundingFee,
      netPnl,
      openedAt: position.openedAt,
      closedAt: status === "OPEN" ? null : position.updatedTime,
      settledAt,
      rawSummary: {
        rawPositionId: position.id,
        rawIncomeIds: relatedIncomes.map((income) => income.id)
      }
    });
  }

  return result;
}

async function normalizeStandardFuturesTrades(syncSource: SyncSourceForTrades) {
  const rawOrders = await prisma.rawOrder.findMany({
    where: {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: "FUTURES",
      status: "FILLED",
      ...symbolWhere(syncSource)
    },
    orderBy: [{ updatedTime: "asc" }, { createdAt: "asc" }]
  });
  const result = emptyResult();

  for (const order of rawOrders) {
    const payload = asObject(order.rawPayload);
    const grossPnl = decimalFromPayload(payload, [
      "profit",
      "realizedPnl",
      "realisedPnl",
      "realizedProfit"
    ]);
    const tradingFee = decimalFromPayload(payload, ["commission", "fee"]);
    const netPnl = sumDecimals(grossPnl, tradingFee);
    const closedAt = order.updatedTime ?? order.createdTime;
    const settledAt = inferSettledAt("CLOSED", closedAt);

    await upsertTrade({
      result,
      syncSource,
      externalTradeId: `FUTURES:${order.exchangeOrderId}`,
      sourceRecordType: "RAW_ORDER",
      sourceRecordId: order.id,
      symbol: order.symbol,
      marketType: "FUTURES",
      side: order.side,
      status: settledAt ? "SETTLED" : "CLOSED",
      quantity: order.filledQuantity ?? order.quantity,
      entryPrice: order.price,
      exitPrice: order.price,
      grossPnl,
      tradingFee,
      fundingFee: null,
      netPnl,
      openedAt: order.createdTime,
      closedAt,
      settledAt,
      rawSummary: { rawOrderId: order.id }
    });
  }

  return result;
}

async function upsertTrade({
  result,
  syncSource,
  externalTradeId,
  sourceRecordType,
  sourceRecordId,
  symbol,
  marketType,
  side,
  status,
  quantity,
  entryPrice,
  exitPrice,
  grossPnl,
  tradingFee,
  fundingFee,
  netPnl,
  openedAt,
  closedAt,
  settledAt,
  rawSummary
}: {
  result: NormalizationResult;
  syncSource: SyncSourceForTrades;
  externalTradeId: string;
  sourceRecordType: string;
  sourceRecordId: string;
  symbol: string;
  marketType: "PERPETUAL" | "FUTURES";
  side: string | null;
  status: TradeStatus;
  quantity: Prisma.Decimal | null;
  entryPrice: Prisma.Decimal | null;
  exitPrice: Prisma.Decimal | null;
  grossPnl: Prisma.Decimal | null;
  tradingFee: Prisma.Decimal | null;
  fundingFee: Prisma.Decimal | null;
  netPnl: Prisma.Decimal | null;
  openedAt: Date | null;
  closedAt: Date | null;
  settledAt: Date | null;
  rawSummary: RawObject;
}) {
  const where = {
    collectionId_externalTradeId: {
      collectionId: syncSource.collectionId,
      externalTradeId
    }
  };
  const existing = await prisma.trade.findUnique({
    where,
    select: { id: true, status: true }
  });

  if (existing?.status === "SETTLED" && status !== "SETTLED") {
    result.skippedCount += 1;
    return;
  }

  await prisma.trade.upsert({
    where,
    create: {
      userId: syncSource.userId,
      collectionId: syncSource.collectionId,
      collectionSyncSourceId: syncSource.id,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      externalTradeId,
      sourceRecordType,
      sourceRecordId,
      symbol,
      marketType,
      side,
      status,
      quantity,
      entryPrice,
      exitPrice,
      grossPnl,
      tradingFee,
      fundingFee,
      netPnl,
      openedAt,
      closedAt,
      settledAt,
      rawSummary: rawSummary as Prisma.InputJsonValue
    },
    update: {
      sourceRecordType,
      sourceRecordId,
      symbol,
      marketType,
      side,
      status,
      quantity,
      entryPrice,
      exitPrice,
      grossPnl,
      tradingFee,
      fundingFee,
      netPnl,
      openedAt,
      closedAt,
      settledAt,
      rawSummary: rawSummary as Prisma.InputJsonValue
    }
  });

  if (existing) {
    result.updatedCount += 1;
  } else {
    result.createdCount += 1;
  }
}

function symbolWhere(syncSource: SyncSourceForTrades) {
  const symbols = syncSource.symbols.map((symbol) => symbol.symbol);

  if (syncSource.symbolFilterMode === "INCLUDE") {
    return { symbol: { in: symbols } };
  }

  if (syncSource.symbolFilterMode === "EXCLUDE") {
    return { symbol: { notIn: symbols } };
  }

  return {};
}

function groupBySymbol<T extends { symbol: string | null }>(rows: T[]) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    if (!row.symbol) {
      continue;
    }

    grouped.set(row.symbol, [...(grouped.get(row.symbol) ?? []), row]);
  }

  return grouped;
}

function filterIncomesForTrade<
  T extends { occurredAt: Date | null; incomeType: string }
>(incomes: T[], openedAt: Date | null, closedAt: Date | null) {
  return incomes.filter((income) => {
    if (!income.occurredAt) {
      return false;
    }

    if (openedAt && income.occurredAt < openedAt) {
      return false;
    }

    if (closedAt && income.occurredAt > closedAt) {
      return false;
    }

    return true;
  });
}

function totalIncomes<T extends { incomeType: string; amount: Prisma.Decimal | null }>(
  incomes: T[]
) {
  let realizedPnl: Prisma.Decimal | null = null;
  let tradingFee: Prisma.Decimal | null = null;
  let fundingFee: Prisma.Decimal | null = null;

  for (const income of incomes) {
    if (!income.amount) {
      continue;
    }

    const type = income.incomeType.toUpperCase();

    if (type.includes("REALIZED") || type.includes("REALISED")) {
      realizedPnl = addDecimal(realizedPnl, income.amount);
    } else if (type.includes("FUNDING")) {
      fundingFee = addDecimal(fundingFee, income.amount);
    } else if (type.includes("FEE") || type.includes("COMMISSION")) {
      tradingFee = addDecimal(tradingFee, income.amount);
    }
  }

  return { realizedPnl, tradingFee, fundingFee };
}

function inferPerpetualStatus(
  quantity: Prisma.Decimal | null,
  updatedTime: Date | null
): TradeStatus {
  if (!quantity) {
    return updatedTime ? "CLOSED" : "OPEN";
  }

  return quantity.equals(0) ? "CLOSED" : "OPEN";
}

function inferSettledAt(status: TradeStatus, closedAt: Date | null) {
  if (status !== "CLOSED" || !closedAt) {
    return null;
  }

  const settlementAgeMs = 48 * 60 * 60 * 1000;

  return Date.now() - closedAt.getTime() >= settlementAgeMs ? closedAt : null;
}

function decimalFromPayload(payload: RawObject, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];

    if (value !== undefined && value !== null && value !== "") {
      return new Prisma.Decimal(String(value));
    }
  }

  return null;
}

function asObject(value: RawJson): RawObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sumDecimals(...values: Array<Prisma.Decimal | null>) {
  return values.reduce<Prisma.Decimal | null>(
    (sum, value) => (value ? addDecimal(sum, value) : sum),
    null
  );
}

function addDecimal(left: Prisma.Decimal | null, right: Prisma.Decimal) {
  return left ? left.add(right) : right;
}

function emptyResult(): NormalizationResult {
  return { createdCount: 0, updatedCount: 0, skippedCount: 0 };
}
