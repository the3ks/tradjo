import type { MarketType, RawOrderStatus } from "@prisma/client";

type RawRecord = Record<string, unknown>;

export function extractBingXRows(payload: unknown): RawRecord[] {
  const candidates = [
    payload,
    getObject(getObject(payload, "data"), "orders"),
    getObject(getObject(payload, "data"), "fills"),
    getObject(getObject(payload, "data"), "positions"),
    getObject(getObject(payload, "data"), "balances"),
    getObject(getObject(payload, "data"), "balance"),
    getObject(getObject(payload, "data"), "incomes"),
    getObject(getObject(payload, "data"), "income"),
    getObject(getObject(payload, "data"), "positionHistory"),
    getObject(getObject(payload, "data"), "positionsHistory"),
    getObject(getObject(payload, "data"), "positionHistoryList"),
    getObject(getObject(payload, "data"), "history"),
    getObject(getObject(payload, "data"), "list"),
    getObject(getObject(payload, "data"), "rows"),
    getObject(payload, "data")
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }

    if (isRecord(candidate) && candidate !== payload) {
      return [candidate];
    }
  }

  return [];
}

export function normalizeBingXOrder(row: RawRecord, marketType: MarketType) {
  const exchangeOrderId = readString(row, [
    "orderId",
    "orderID",
    "id",
    "clientOrderId"
  ]);

  if (!exchangeOrderId) {
    return null;
  }

  const status = mapRawOrderStatus(readString(row, ["status", "state"]));

  return {
    exchangeOrderId,
    symbol: readString(row, ["symbol"]) ?? "UNKNOWN",
    marketType,
    side: readString(row, ["side", "positionSide"]),
    orderType: readString(row, ["type", "orderType"]),
    price: readString(row, ["price", "avgPrice"]),
    quantity: readString(row, ["origQty", "quantity", "qty"]),
    filledQuantity: readString(row, ["executedQty", "filledQty", "filledQuantity"]),
    status,
    createdTime: readDate(row, ["time", "createdTime", "createTime"]),
    updatedTime: readDate(row, ["updateTime", "updatedTime"]),
    isTerminal: isTerminalOrderStatus(status),
    rawPayload: row
  };
}

export function normalizeBingXFill(row: RawRecord, marketType: MarketType) {
  const exchangeFillId = readString(row, [
    "tradeId",
    "fillId",
    "id",
    "execId"
  ]);

  if (!exchangeFillId) {
    return null;
  }

  return {
    exchangeFillId,
    exchangeOrderId: readString(row, ["orderId", "orderID"]),
    symbol: readString(row, ["symbol"]) ?? "UNKNOWN",
    marketType,
    side: readString(row, ["side", "positionSide"]),
    price: readString(row, ["price"]),
    quantity: readString(row, ["qty", "quantity", "executedQty"]),
    fee: readString(row, ["commission", "fee"]),
    feeCurrency: readString(row, ["commissionAsset", "feeAsset", "feeCurrency"]),
    executedAt: readDate(row, ["time", "execTime", "createdTime"]),
    rawPayload: row
  };
}

export function normalizeBingXPosition(row: RawRecord, marketType: MarketType) {
  const symbol = readString(row, ["symbol"]);
  const side = readString(row, ["positionSide", "side"]);

  if (!symbol) {
    return null;
  }

  return {
    exchangePositionId:
      readString(row, ["positionId", "id"]) ?? `${symbol}:${side ?? "BOTH"}`,
    symbol,
    marketType,
    side,
    quantity: readString(row, ["positionAmt", "quantity", "availableAmt"]),
    entryPrice: readString(row, ["avgPrice", "entryPrice"]),
    markPrice: readString(row, ["markPrice"]),
    unrealizedPnl: readString(row, ["unrealizedProfit", "unrealizedPnl"]),
    realizedPnl: readString(row, ["realisedProfit", "realizedPnl"]),
    openedAt: readDate(row, ["openTime", "createdTime"]),
    updatedTime: readDate(row, ["updateTime", "updatedTime"]),
    rawPayload: row
  };
}

export function normalizeBingXIncome(row: RawRecord, marketType: MarketType) {
  const incomeType = readString(row, [
    "incomeType",
    "type",
    "bizType",
    "transType"
  ]);
  const amount = readString(row, [
    "income",
    "amount",
    "realizedPnl",
    "realisedPnl",
    "realizedProfit",
    "fee",
    "fundingFee"
  ]);
  const occurredAt = readDate(row, [
    "time",
    "timestamp",
    "tranTime",
    "createdTime",
    "updateTime"
  ]);

  if (!incomeType || (!amount && !occurredAt)) {
    return null;
  }

  const symbol = readString(row, ["symbol"]);

  return {
    exchangeIncomeId:
      readString(row, ["id", "incomeId", "tranId"]) ??
      [
        symbol ?? "ACCOUNT",
        incomeType,
        occurredAt?.getTime() ?? "NO_TIME",
        amount ?? "NO_AMOUNT"
      ].join(":"),
    symbol,
    marketType,
    incomeType,
    amount,
    asset: readString(row, ["asset", "currency", "coin"]),
    occurredAt,
    rawPayload: row
  };
}

function getObject(value: unknown, key: string) {
  return isRecord(value) ? value[key] : undefined;
}

function isRecord(value: unknown): value is RawRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return null;
}

function readDate(row: RawRecord, keys: string[]) {
  const value = readString(row, keys);

  if (!value) {
    return null;
  }

  const numericValue = Number(value);
  const date = Number.isFinite(numericValue)
    ? new Date(numericValue)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function mapRawOrderStatus(value: string | null): RawOrderStatus {
  switch (value?.toUpperCase()) {
    case "NEW":
      return "NEW";
    case "PARTIALLY_FILLED":
    case "PARTIAL_FILLED":
      return "PARTIALLY_FILLED";
    case "FILLED":
      return "FILLED";
    case "CANCELED":
    case "CANCELLED":
      return "CANCELED";
    case "REJECTED":
      return "REJECTED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "UNKNOWN";
  }
}

function isTerminalOrderStatus(status: RawOrderStatus) {
  return ["FILLED", "CANCELED", "REJECTED", "EXPIRED"].includes(status);
}
