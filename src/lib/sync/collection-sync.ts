import type {
  CollectionSyncSource,
  ExchangeConnection,
  MarketType,
  UserProfile
} from "@prisma/client";

import { BingXClient } from "@/lib/bingx/client";
import { extractBingXRows } from "@/lib/bingx/normalize";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-crypto";
import { determineFetchWindow } from "@/lib/sync-ranges";
import {
  upsertRawFills,
  upsertRawIncomes,
  upsertRawOrders,
  upsertRawPositions
} from "@/lib/sync/raw-upserts";
import { normalizeTradesForSyncSource } from "@/lib/sync/trade-normalization";

type SyncSourceWithConnection = CollectionSyncSource & {
  exchangeConnection: ExchangeConnection;
  symbols: Array<{
    symbol: string;
  }>;
  user: {
    profile: UserProfile | null;
  };
};

export async function runBingXCollectionSync(syncSource: SyncSourceWithConnection) {
  if (!isSupportedMarketType(syncSource.marketType)) {
    throw new Error(
      "Only BingX perpetual and Standard Futures sync are implemented in this phase."
    );
  }

  const env = getEnv();
  const client = new BingXClient({
    baseUrl: env.BINGX_BASE_URL,
    apiKey: decryptSecret(
      syncSource.exchangeConnection.apiKeyEncrypted,
      env.ENCRYPTION_KEY
    ),
    apiSecret: decryptSecret(
      syncSource.exchangeConnection.apiSecretEncrypted,
      env.ENCRYPTION_KEY
    )
  });
  const now = new Date();
  const fetchWindow = determineFetchWindow({
    lastEventTime: syncSource.lastEventTime,
    initialSync: {
      mode: syncSource.initialSyncMode,
      now,
      timezone: syncSource.user.profile?.timezone ?? "UTC",
      customStart: syncSource.initialSyncStartTime,
      customEnd: syncSource.initialSyncEndTime
    }
  });

  if (fetchWindow.kind === "open-only") {
    return runOpenOnlySync({ client, syncSource });
  }

  const symbols = syncSource.symbolFilterMode === "INCLUDE"
    ? syncSource.symbols.map((symbol) => symbol.symbol)
    : [undefined];
  const orderRows: Array<Record<string, unknown>> = [];
  const fillRows: Array<Record<string, unknown>> = [];
  const positionRows: Array<Record<string, unknown>> = [];
  const incomeRows: Array<Record<string, unknown>> = [];

  for (const symbol of symbols) {
    const params = {
      symbol,
      startTime: fetchWindow.from.getTime(),
      endTime: fetchWindow.to.getTime(),
      limit: 500
    };

    const [ordersPayload, fillsPayload, positionsPayload, incomesPayload] =
      await fetchTimeRangePayloads({
        client,
        marketType: syncSource.marketType,
        params
      });

    orderRows.push(...filterRows(extractBingXRows(ordersPayload), syncSource));
    fillRows.push(...filterRows(extractBingXRows(fillsPayload), syncSource));
    positionRows.push(...filterRows(extractBingXRows(positionsPayload), syncSource));
    incomeRows.push(...filterRows(extractBingXRows(incomesPayload), syncSource));
  }

  const [orderResult, fillResult, positionResult, incomeResult] = await Promise.all([
    upsertRawOrders(orderRows, {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: syncSource.marketType
    }),
    upsertRawFills(fillRows, {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: syncSource.marketType
    }),
    upsertRawPositions(positionRows, {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: syncSource.marketType
    }),
    upsertRawIncomes(incomeRows, {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: syncSource.marketType
    })
  ]);
  const latestEventTime = maxDate(
    maxDate(
      maxDate(orderResult.latestEventTime, fillResult.latestEventTime),
      positionResult.latestEventTime
    ),
    incomeResult.latestEventTime
  );

  await prisma.collectionSyncSource.update({
    where: { id: syncSource.id },
    data: {
      initialSyncCompleted: true,
      lastEventTime: latestEventTime ?? syncSource.lastEventTime ?? fetchWindow.to
    }
  });
  const tradeResult = await normalizeTradesForSyncSource(syncSource);

  return {
    fetchedCount:
      orderRows.length + fillRows.length + positionRows.length + incomeRows.length,
    createdCount:
      orderResult.createdCount +
      fillResult.createdCount +
      positionResult.createdCount +
      incomeResult.createdCount +
      tradeResult.createdCount,
    updatedCount:
      orderResult.updatedCount +
      fillResult.updatedCount +
      positionResult.updatedCount +
      incomeResult.updatedCount +
      tradeResult.updatedCount,
    skippedCount:
      orderResult.skippedCount +
      fillResult.skippedCount +
      positionResult.skippedCount +
      incomeResult.skippedCount +
      tradeResult.skippedCount
  };
}

async function runOpenOnlySync({
  client,
  syncSource
}: {
  client: BingXClient;
  syncSource: SyncSourceWithConnection;
}) {
  const symbols =
    syncSource.symbolFilterMode === "INCLUDE"
      ? syncSource.symbols.map((symbol) => symbol.symbol)
      : [undefined];
  const orderRows: Array<Record<string, unknown>> = [];
  const positionRows: Array<Record<string, unknown>> = [];

  for (const symbol of symbols) {
    const [openOrdersPayload, positionsPayload] = await fetchOpenPayloads({
      client,
      marketType: syncSource.marketType,
      symbol
    });

    orderRows.push(...filterRows(extractBingXRows(openOrdersPayload), syncSource));
    positionRows.push(...filterRows(extractBingXRows(positionsPayload), syncSource));
  }

  const hasOpenItems = orderRows.length > 0 || positionRows.length > 0;

  if (!hasOpenItems) {
    const latestClosedPayload = await fetchLatestOrderPayload(
      client,
      syncSource.marketType
    );
    const latestClosedRows = filterRows(
      extractBingXRows(latestClosedPayload),
      syncSource
    );
    const latestClosed = latestClosedRows
      .map((row) => {
        const updateTime = row.updateTime ?? row.updatedTime ?? row.time ?? row.createdTime;
        const numericTime = Number(updateTime);
        const date = updateTime
          ? new Date(Number.isFinite(numericTime) ? numericTime : String(updateTime))
          : null;

        return date && !Number.isNaN(date.getTime()) ? date : null;
      })
      .filter((date): date is Date => date !== null)
      .sort((left, right) => right.getTime() - left.getTime())[0];

    await prisma.collectionSyncSource.update({
      where: { id: syncSource.id },
      data: {
        initialSyncCompleted: true,
        cursorInitializedFrom: "LATEST_CLOSED_ORDER",
        lastEventTime: latestClosed ?? new Date()
      }
    });

    return {
      fetchedCount: latestClosedRows.length,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: latestClosedRows.length
    };
  }

  const [orderResult, positionResult] = await Promise.all([
    upsertRawOrders(orderRows, {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: syncSource.marketType
    }),
    upsertRawPositions(positionRows, {
      userId: syncSource.userId,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      marketType: syncSource.marketType
    })
  ]);
  const latestEventTime = maxDate(
    orderResult.latestEventTime,
    positionResult.latestEventTime
  );

  await prisma.collectionSyncSource.update({
    where: { id: syncSource.id },
    data: {
      initialSyncCompleted: true,
      cursorInitializedFrom: "OPEN_ORDERS",
      lastEventTime: latestEventTime ?? new Date()
    }
  });
  const tradeResult = await normalizeTradesForSyncSource(syncSource);

  return {
    fetchedCount: orderRows.length + positionRows.length,
    createdCount:
      orderResult.createdCount +
      positionResult.createdCount +
      tradeResult.createdCount,
    updatedCount:
      orderResult.updatedCount +
      positionResult.updatedCount +
      tradeResult.updatedCount,
    skippedCount:
      orderResult.skippedCount +
      positionResult.skippedCount +
      tradeResult.skippedCount
  };
}

function isSupportedMarketType(marketType: MarketType) {
  return marketType === "PERPETUAL" || marketType === "FUTURES";
}

async function fetchTimeRangePayloads({
  client,
  marketType,
  params
}: {
  client: BingXClient;
  marketType: MarketType;
  params: {
    symbol?: string;
    startTime: number;
    endTime: number;
    limit: number;
  };
}) {
  if (marketType === "FUTURES") {
    const ordersPayload = await client.getStandardFuturesOrders(params);

    return [ordersPayload, [], [], []] as const;
  }

  const [ordersPayload, fillsPayload, positionsPayload, incomesPayload] =
    await Promise.all([
    client.getPerpetualOrders(params),
    client.getPerpetualFills(params),
    client.getPerpetualPositionHistory(params),
    client.getPerpetualIncome(params)
  ]);

  return [ordersPayload, fillsPayload, positionsPayload, incomesPayload] as const;
}

async function fetchOpenPayloads({
  client,
  marketType,
  symbol
}: {
  client: BingXClient;
  marketType: MarketType;
  symbol?: string;
}) {
  if (marketType === "FUTURES") {
    return [[], []] as const;
  }

  const [openOrdersPayload, positionsPayload] = await Promise.all([
    client.getPerpetualOpenOrders({ symbol }),
    client.getPerpetualPositions({ symbol })
  ]);

  return [openOrdersPayload, positionsPayload] as const;
}

function fetchLatestOrderPayload(client: BingXClient, marketType: MarketType) {
  if (marketType === "FUTURES") {
    return client.getStandardFuturesOrders({ limit: 1 });
  }

  return client.getPerpetualOrders({ limit: 1 });
}

function filterRows(
  rows: Array<Record<string, unknown>>,
  syncSource: SyncSourceWithConnection
) {
  if (syncSource.symbolFilterMode === "ALL") {
    return rows;
  }

  const symbolSet = new Set(syncSource.symbols.map((symbol) => symbol.symbol));

  return rows.filter((row) => {
    const symbol = typeof row.symbol === "string" ? row.symbol : null;

    if (!symbol) {
      return false;
    }

    return syncSource.symbolFilterMode === "INCLUDE"
      ? symbolSet.has(symbol)
      : !symbolSet.has(symbol);
  });
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
