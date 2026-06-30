import { extractedTradeDraftSchema, type ExtractedTradeDraft } from "@/lib/trade-screenshot-extraction";

const symbolPattern = /^[A-Z0-9]+USDT$/;
const dateTimePattern = /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/;

export function parseBingXTableText(text: string): ExtractedTradeDraft[] {
  const tokens = tokenize(text);
  const blocks = splitTradeBlocks(tokens);

  return blocks.map(parseTradeBlock).filter(Boolean) as ExtractedTradeDraft[];
}

function tokenize(text: string) {
  return text
    .split(/[\n\t]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !ignoredTokens.has(line));
}

function splitTradeBlocks(tokens: string[]) {
  const starts = tokens
    .map((token, index) => (symbolPattern.test(token) ? index : -1))
    .filter((index) => index >= 0);

  return starts.map((start, index) =>
    tokens.slice(start, starts[index + 1] ?? tokens.length)
  );
}

function parseTradeBlock(tokens: string[]) {
  const symbol = tokens[0];
  const sideIndex = tokens.findIndex((token) => isSide(token));

  if (!symbolPattern.test(symbol) || sideIndex < 0) {
    return null;
  }

  const side = normalizeSide(tokens[sideIndex]);
  const datetimes = tokens.filter((token) => dateTimePattern.test(token));
  const closed = datetimes.length >= 2;
  const parsed = closed
    ? parseClosedTrade(tokens, symbol, side)
    : parseOpenPosition(tokens, symbol, side);

  return extractedTradeDraftSchema.parse(parsed);
}

function parseOpenPosition(
  tokens: string[],
  symbol: string,
  side: "LONG" | "SHORT"
) {
  const margin = parseMargin(tokens);
  const position = parsePosition(tokens, symbol);
  const pnl = parsePnl(tokens);
  const orderTypeIndex = tokens.findIndex((token) => /order$/i.test(token));
  const numbersBeforeOrderType = tokens
    .slice(0, orderTypeIndex >= 0 ? orderTypeIndex : tokens.length)
    .map(numberFromToken)
    .filter((value): value is number => value !== null);
  const fees = numbersBetweenOrderTypeAndOpenTime(tokens, orderTypeIndex);
  const openTime = tokens.find((token) => dateTimePattern.test(token)) ?? null;
  const orderNo = findOrderNo(tokens);
  const totalVolume = numberAfterPrefix(tokens, "Total Amount:");

  return {
    screenType: "OPEN_POSITION",
    exchange: "BINGX",
    marketType: "FUTURES",
    symbol,
    side,
    marginMode: null,
    leverage: margin.leverage,
    entryPrice: numbersBeforeOrderType[5] ?? null,
    currentPrice: numbersBeforeOrderType[7] ?? null,
    closePrice: null,
    positionSize: position.size,
    positionUnit: position.unit,
    margin: margin.amount,
    totalVolume,
    unrealizedPnl: pnl.amount,
    unrealizedPnlPercent: pnl.percent,
    realizedPnl: null,
    realizedPnlPercent: null,
    liquidationPrice: numbersBeforeOrderType[6] ?? null,
    takeProfit: numbersBeforeOrderType[8] ?? null,
    stopLoss: numbersBeforeOrderType[9] ?? null,
    fundingFee: fees[1] ?? null,
    tradingFee: fees[0] ?? null,
    openTime,
    closeTime: null,
    screenshotTime: null,
    orderNo,
    orderType: orderTypeIndex >= 0 ? tokens[orderTypeIndex] : null,
    confidence: orderNo ? 0.98 : 0.86,
    warnings: []
  };
}

function parseClosedTrade(
  tokens: string[],
  symbol: string,
  side: "LONG" | "SHORT"
) {
  const margin = parseMargin(tokens);
  const pnl = parsePnl(tokens);
  const datetimes = tokens.filter((token) => dateTimePattern.test(token));
  const closeTime = datetimes[0] ?? null;
  const openTime = datetimes[1] ?? null;
  const closeTimeIndex = tokens.findIndex((token) => token === closeTime);
  const openTimeIndex = tokens.findIndex((token) => token === openTime);
  const orderTypeIndex = tokens.findIndex((token) => /order$/i.test(token));
  const closeType = closeTimeIndex >= 0 ? tokens[closeTimeIndex + 1] : null;
  const closePrice = numberFromToken(tokens[closeTimeIndex + 2] ?? "");
  const tradingFee = numberFromToken(tokens[closeTimeIndex + 3] ?? "");
  const fundingFee = numberFromToken(tokens[closeTimeIndex + 4] ?? "");
  const entryPrice = numberFromToken(tokens[openTimeIndex + 1] ?? "");
  const takeProfit = numberFromToken(tokens[orderTypeIndex + 1] ?? "");
  const stopLoss = lastNumberFromToken(tokens[orderTypeIndex + 2] ?? "");
  const orderNo = findOrderNo(tokens);

  return {
    screenType: "CLOSED_TRADE",
    exchange: "BINGX",
    marketType: "FUTURES",
    symbol,
    side,
    marginMode: null,
    leverage: margin.leverage,
    entryPrice,
    currentPrice: null,
    closePrice,
    positionSize: null,
    positionUnit: null,
    margin: margin.amount,
    totalVolume: null,
    unrealizedPnl: null,
    unrealizedPnlPercent: null,
    realizedPnl: pnl.amount,
    realizedPnlPercent: pnl.percent,
    liquidationPrice: null,
    takeProfit,
    stopLoss,
    fundingFee,
    tradingFee,
    openTime,
    closeTime,
    screenshotTime: null,
    orderNo,
    orderType: orderTypeIndex >= 0 ? tokens[orderTypeIndex] : null,
    confidence: orderNo ? 0.98 : 0.86,
    warnings: closeType ? [`Close type: ${closeType}`] : []
  };
}

function parseMargin(tokens: string[]) {
  const marginIndex = tokens.findIndex((token) => /\bUSDT\b/.test(token));
  const marginToken = marginIndex >= 0 ? tokens[marginIndex] : "";
  const nextToken = marginIndex >= 0 ? tokens[marginIndex + 1] ?? "" : "";

  return {
    amount: numberFromToken(marginToken),
    leverage: leverageFromToken(`${marginToken} ${nextToken}`)
  };
}

function parsePosition(tokens: string[], symbol: string) {
  const unit = symbol.replace("USDT", "");
  const token = tokens.find((item) => item.endsWith(` ${unit}`)) ?? "";

  return {
    size: numberFromToken(token),
    unit: token ? unit : null
  };
}

function parsePnl(tokens: string[]) {
  const token =
    tokens.find((item) => /^[+-]?\d[\d,.]*\s+\([+-]?\d[\d,.]*%\)$/.test(item)) ??
    "";
  const match = token.match(/^([+-]?\d[\d,.]*)\s+\(([+-]?\d[\d,.]*)%\)$/);

  return {
    amount: match ? numberFromToken(match[1]) : null,
    percent: match ? numberFromToken(match[2]) : null
  };
}

function numberAfterPrefix(tokens: string[], prefix: string) {
  const token = tokens.find((item) => item.startsWith(prefix));

  return token ? numberFromToken(token.replace(prefix, "")) : null;
}

function numbersBetweenOrderTypeAndOpenTime(tokens: string[], orderTypeIndex: number) {
  if (orderTypeIndex < 0) {
    return [];
  }

  const tail = tokens.slice(orderTypeIndex + 1);
  const dateIndex = tail.findIndex((token) => dateTimePattern.test(token));

  return tail
    .slice(0, dateIndex >= 0 ? dateIndex : tail.length)
    .map(numberFromToken)
    .filter((value): value is number => value !== null);
}

function findOrderNo(tokens: string[]) {
  return (
    tokens.find((token) => /^\d{16,}$/.test(token.replace(/\s+/g, ""))) ?? null
  );
}

function normalizeSide(value: string): "LONG" | "SHORT" {
  return value.toUpperCase() === "SHORT" ? "SHORT" : "LONG";
}

function isSide(value: string) {
  return value.toUpperCase() === "LONG" || value.toUpperCase() === "SHORT";
}

function leverageFromToken(value: string) {
  const match = value.match(/\((\d+(?:\.\d+)?)x\)/i);

  return match ? Number(match[1]) : null;
}

function numberFromToken(value: string) {
  const match = value.replace(/,/g, "").match(/[+-]?\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function lastNumberFromToken(value: string) {
  const matches = value.replace(/,/g, "").match(/[+-]?\d+(?:\.\d+)?/g);

  return matches?.length ? Number(matches.at(-1)) : null;
}

const ignoredTokens = new Set([
  "Futures",
  "Margin(Leverage)",
  "Position",
  "Unrealized PnL",
  "Entry Price",
  "Liquidation Price",
  "Last Price",
  "TP/SL",
  "Trailing Stop",
  "Open Type",
  "Est. Trading Fee",
  "Funding Fee",
  "Open Time",
  "Order No.",
  "Close All",
  "PnL",
  "Close Time",
  "Close Type",
  "Close Price",
  "Trading Fee",
  "Operation",
  "Close",
  "Share"
]);
