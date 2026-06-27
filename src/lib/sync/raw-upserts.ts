import { Prisma, type MarketType } from "@prisma/client";

import {
  normalizeBingXFill,
  normalizeBingXIncome,
  normalizeBingXOrder,
  normalizeBingXPosition
} from "@/lib/bingx/normalize";
import { prisma } from "@/lib/prisma";

type UpsertContext = {
  userId: string;
  exchangeConnectionId: string;
  marketType: MarketType;
};

export async function upsertRawOrders(
  rows: Array<Record<string, unknown>>,
  context: UpsertContext
) {
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let latestEventTime: Date | null = null;

  for (const row of rows) {
    const normalized = normalizeBingXOrder(row, context.marketType);

    if (!normalized) {
      skippedCount += 1;
      continue;
    }

    latestEventTime = maxDate(latestEventTime, normalized.updatedTime);
    latestEventTime = maxDate(latestEventTime, normalized.createdTime);

    const existing = await prisma.rawOrder.findUnique({
      where: {
        exchangeConnectionId_exchangeOrderId: {
          exchangeConnectionId: context.exchangeConnectionId,
          exchangeOrderId: normalized.exchangeOrderId
        }
      },
      select: { id: true }
    });

    await prisma.rawOrder.upsert({
      where: {
        exchangeConnectionId_exchangeOrderId: {
          exchangeConnectionId: context.exchangeConnectionId,
          exchangeOrderId: normalized.exchangeOrderId
        }
      },
      create: {
        userId: context.userId,
        exchangeConnectionId: context.exchangeConnectionId,
        exchangeOrderId: normalized.exchangeOrderId,
        symbol: normalized.symbol,
        marketType: normalized.marketType,
        side: normalized.side,
        orderType: normalized.orderType,
        price: toDecimal(normalized.price),
        quantity: toDecimal(normalized.quantity),
        filledQuantity: toDecimal(normalized.filledQuantity),
        status: normalized.status,
        createdTime: normalized.createdTime,
        updatedTime: normalized.updatedTime,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
        isTerminal: normalized.isTerminal,
        lastSeenAt: new Date()
      },
      update: {
        symbol: normalized.symbol,
        marketType: normalized.marketType,
        side: normalized.side,
        orderType: normalized.orderType,
        price: toDecimal(normalized.price),
        quantity: toDecimal(normalized.quantity),
        filledQuantity: toDecimal(normalized.filledQuantity),
        status: normalized.status,
        createdTime: normalized.createdTime,
        updatedTime: normalized.updatedTime,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
        isTerminal: normalized.isTerminal,
        lastSeenAt: new Date()
      }
    });

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
    latestEventTime
  };
}

export async function upsertRawFills(
  rows: Array<Record<string, unknown>>,
  context: UpsertContext
) {
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let latestEventTime: Date | null = null;

  for (const row of rows) {
    const normalized = normalizeBingXFill(row, context.marketType);

    if (!normalized) {
      skippedCount += 1;
      continue;
    }

    latestEventTime = maxDate(latestEventTime, normalized.executedAt);

    const existing = await prisma.rawFill.findUnique({
      where: {
        exchangeConnectionId_exchangeFillId: {
          exchangeConnectionId: context.exchangeConnectionId,
          exchangeFillId: normalized.exchangeFillId
        }
      },
      select: { id: true }
    });

    await prisma.rawFill.upsert({
      where: {
        exchangeConnectionId_exchangeFillId: {
          exchangeConnectionId: context.exchangeConnectionId,
          exchangeFillId: normalized.exchangeFillId
        }
      },
      create: {
        userId: context.userId,
        exchangeConnectionId: context.exchangeConnectionId,
        exchangeFillId: normalized.exchangeFillId,
        exchangeOrderId: normalized.exchangeOrderId,
        symbol: normalized.symbol,
        marketType: normalized.marketType,
        side: normalized.side,
        price: toDecimal(normalized.price),
        quantity: toDecimal(normalized.quantity),
        fee: toDecimal(normalized.fee),
        feeCurrency: normalized.feeCurrency,
        executedAt: normalized.executedAt,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
        lastSeenAt: new Date()
      },
      update: {
        exchangeOrderId: normalized.exchangeOrderId,
        symbol: normalized.symbol,
        marketType: normalized.marketType,
        side: normalized.side,
        price: toDecimal(normalized.price),
        quantity: toDecimal(normalized.quantity),
        fee: toDecimal(normalized.fee),
        feeCurrency: normalized.feeCurrency,
        executedAt: normalized.executedAt,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
        lastSeenAt: new Date()
      }
    });

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
    latestEventTime
  };
}

export async function upsertRawPositions(
  rows: Array<Record<string, unknown>>,
  context: UpsertContext
) {
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let latestEventTime: Date | null = null;

  for (const row of rows) {
    const normalized = normalizeBingXPosition(row, context.marketType);

    if (!normalized) {
      skippedCount += 1;
      continue;
    }

    latestEventTime = maxDate(latestEventTime, normalized.updatedTime);

    const where = {
      exchangeConnectionId_exchangePositionId: {
        exchangeConnectionId: context.exchangeConnectionId,
        exchangePositionId: normalized.exchangePositionId
      }
    };
    const existing = await prisma.rawPosition.findUnique({
      where,
      select: { id: true }
    });

    await prisma.rawPosition.upsert({
      where,
      create: {
        userId: context.userId,
        exchangeConnectionId: context.exchangeConnectionId,
        exchangePositionId: normalized.exchangePositionId,
        symbol: normalized.symbol,
        marketType: normalized.marketType,
        side: normalized.side,
        quantity: toDecimal(normalized.quantity),
        entryPrice: toDecimal(normalized.entryPrice),
        markPrice: toDecimal(normalized.markPrice),
        unrealizedPnl: toDecimal(normalized.unrealizedPnl),
        realizedPnl: toDecimal(normalized.realizedPnl),
        openedAt: normalized.openedAt,
        updatedTime: normalized.updatedTime,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
        lastSeenAt: new Date()
      },
      update: {
        symbol: normalized.symbol,
        marketType: normalized.marketType,
        side: normalized.side,
        quantity: toDecimal(normalized.quantity),
        entryPrice: toDecimal(normalized.entryPrice),
        markPrice: toDecimal(normalized.markPrice),
        unrealizedPnl: toDecimal(normalized.unrealizedPnl),
        realizedPnl: toDecimal(normalized.realizedPnl),
        openedAt: normalized.openedAt,
        updatedTime: normalized.updatedTime,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
        lastSeenAt: new Date()
      }
    });

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
    latestEventTime
  };
}

export async function upsertRawIncomes(
  rows: Array<Record<string, unknown>>,
  context: UpsertContext
) {
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let latestEventTime: Date | null = null;

  for (const row of rows) {
    const normalized = normalizeBingXIncome(row, context.marketType);

    if (!normalized) {
      skippedCount += 1;
      continue;
    }

    latestEventTime = maxDate(latestEventTime, normalized.occurredAt);

    const where = {
      exchangeConnectionId_exchangeIncomeId: {
        exchangeConnectionId: context.exchangeConnectionId,
        exchangeIncomeId: normalized.exchangeIncomeId
      }
    };
    const existing = await prisma.rawIncome.findUnique({
      where,
      select: { id: true }
    });

    await prisma.rawIncome.upsert({
      where,
      create: {
        userId: context.userId,
        exchangeConnectionId: context.exchangeConnectionId,
        exchangeIncomeId: normalized.exchangeIncomeId,
        symbol: normalized.symbol,
        marketType: normalized.marketType,
        incomeType: normalized.incomeType,
        amount: toDecimal(normalized.amount),
        asset: normalized.asset,
        occurredAt: normalized.occurredAt,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
        lastSeenAt: new Date()
      },
      update: {
        symbol: normalized.symbol,
        marketType: normalized.marketType,
        incomeType: normalized.incomeType,
        amount: toDecimal(normalized.amount),
        asset: normalized.asset,
        occurredAt: normalized.occurredAt,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
        lastSeenAt: new Date()
      }
    });

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
    latestEventTime
  };
}

function toDecimal(value: string | null) {
  if (!value) {
    return null;
  }

  return new Prisma.Decimal(value);
}

function maxDate(left: Date | null, right: Date | null) {
  if (!right) {
    return left;
  }

  if (!left || right > left) {
    return right;
  }

  return left;
}
