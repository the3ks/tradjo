import { z } from "zod";

const portfolioActionSchema = z.enum(["DEPOSIT", "WITHDRAWAL", "BUY", "SELL"]);

export const portfolioImportDraftSchema = z.object({
  action: portfolioActionSchema,
  assetClass: z.enum(["CASH", "CRYPTO", "STOCK", "FOREX", "COMMODITY"]),
  currency: z.string().min(1).max(16),
  exchange: z.string().max(80).nullable(),
  feeAmount: z.number().min(0),
  positionType: z.enum(["BALANCE", "SPOT", "FUTURES"]),
  price: z.number().positive(),
  quantity: z.number().positive(),
  symbol: z.string().min(1).max(24),
  transactionDate: z.string().nullable()
});

export const portfolioImportDraftsSchema = z.array(portfolioImportDraftSchema);

export type PortfolioImportDraft = z.infer<typeof portfolioImportDraftSchema>;

const headerAliases: Map<string, string> = new Map([
  ["action", "action"],
  ["asset class", "assetClass"],
  ["assetclass", "assetClass"],
  ["currency", "currency"],
  ["exchange", "exchange"],
  ["fee", "feeAmount"],
  ["fee amount", "feeAmount"],
  ["feeamount", "feeAmount"],
  ["position type", "positionType"],
  ["positiontype", "positionType"],
  ["price", "price"],
  ["quantity", "quantity"],
  ["qty", "quantity"],
  ["symbol", "symbol"],
  ["transaction date", "transactionDate"],
  ["transactiondate", "transactionDate"],
  ["date", "transactionDate"]
] as const);

export function parsePortfolioCsvImport(input: string): PortfolioImportDraft[] {
  const rows = parseCsvRows(input);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  const records = rows.slice(1).filter((row) => row.some((cell) => cell.trim()));

  return records.map((row) => parseRecord(headers, row));
}

function parseRecord(headers: string[], row: string[]) {
  const record = new Map<string, string>();

  headers.forEach((header, index) => {
    if (header) {
      record.set(header, row[index]?.trim() ?? "");
    }
  });

  const action = normalizeAction(required(record, "action"));
  const symbol = required(record, "symbol").toUpperCase();
  const assetClass = normalizeAssetClass(record.get("assetClass"), action);
  const positionType = normalizePositionType(record.get("positionType"), assetClass);
  const currency = (record.get("currency") || "USDT").toUpperCase();
  const exchange = record.get("exchange")?.trim() || null;
  const quantity = numberValue(required(record, "quantity"));
  const price = numberValue(record.get("price") || "1");
  const feeAmount = numberValue(record.get("feeAmount") || "0");
  const transactionDate = record.get("transactionDate")?.trim() || null;

  return portfolioImportDraftSchema.parse({
    action,
    assetClass,
    currency,
    exchange,
    feeAmount,
    positionType,
    price,
    quantity,
    symbol,
    transactionDate
  });
}

function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      cell = "";
      row = [];
    } else {
      cell += character;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((cells) => cells.some((value) => value.trim()));
}

function normalizeHeader(value: string) {
  return headerAliases.get(value.trim().toLowerCase()) ?? "";
}

function normalizeAction(value: string) {
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");

  if (normalized === "WITHDRAW") {
    return "WITHDRAWAL";
  }

  return portfolioActionSchema.parse(normalized);
}

function normalizeAssetClass(value: string | undefined, action: string) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized && (action === "DEPOSIT" || action === "WITHDRAWAL")) {
    return "CASH";
  }

  return z.enum(["CASH", "CRYPTO", "STOCK", "FOREX", "COMMODITY"]).parse(normalized);
}

function normalizePositionType(value: string | undefined, assetClass: string) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized && assetClass === "CASH") {
    return "BALANCE";
  }

  if (!normalized) {
    return "SPOT";
  }

  return z.enum(["BALANCE", "SPOT", "FUTURES"]).parse(normalized);
}

function numberValue(value: string) {
  const parsed = Number(value.replaceAll(",", "").trim());

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return parsed;
}

function required(record: Map<string, string>, key: string) {
  const value = record.get(key)?.trim();

  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}
