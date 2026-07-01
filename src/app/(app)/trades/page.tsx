import Link from "next/link";
import type { Route } from "next";

import { DateFilterInput } from "@/components/date-filter-input";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type TradesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type MarketType = "PERPETUAL" | "FUTURES" | "SPOT";
type TradeStatus = "OPEN" | "CLOSED" | "SETTLED" | "ARCHIVED";

type TradeListItem = {
  id: string;
  symbol: string;
  marketType: MarketType;
  side: string | null;
  status: TradeStatus;
  rawSummary: unknown;
  grossPnl: { toNumber(): number; toString(): string } | null;
  netPnl: { toNumber(): number; toString(): string } | null;
  openedAt: Date | null;
  closedAt: Date | null;
  collection: { name: string };
  exchangeConnection: { accountName: string };
  journal: {
    strategy: string | null;
    grade: string | null;
    mistakeTags: Array<{
      mistakeTag: {
        name: string;
      };
    }>;
  } | null;
};

type SelectOption = {
  id: string;
  name: string;
};

type ExchangeOption = {
  id: string;
  accountName: string;
};

type SymbolOption = {
  symbol: string;
};

type TagOption = {
  id: string;
  name: string;
};

type TradeWhere = {
  userId: string;
  closedAt?: {
    gte?: Date;
    lte?: Date;
  };
  collectionId?: string;
  exchangeConnectionId?: string;
  symbol?: string;
  marketType?: MarketType;
  side?: {
    contains: string;
  };
  status?: TradeStatus;
  journal?: {
    is: {
      strategy?: string;
      grade?: string;
      mistakeTags?: {
        some: {
          mistakeTagId: string;
        };
      };
    };
  };
};

const MARKET_TYPES: MarketType[] = ["PERPETUAL", "FUTURES", "SPOT"];
const TRADE_STATUSES: TradeStatus[] = ["OPEN", "CLOSED", "SETTLED", "ARCHIVED"];

export default async function TradesPage({ searchParams }: TradesPageProps) {
  const userId = await requireUserId();
  const params = normalizeSearchParams((await searchParams) ?? {});
  const where = buildTradeWhere(userId, params);
  const currentPath = buildTradesPath(params);
  const [trades, collections, exchanges, symbols, tags]: [
    TradeListItem[],
    SelectOption[],
    ExchangeOption[],
    SymbolOption[],
    TagOption[]
  ] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: {
        collection: {
          select: { name: true }
        },
        exchangeConnection: {
          select: { accountName: true }
        },
        journal: {
          select: {
            strategy: true,
            grade: true,
            mistakeTags: {
              include: {
                mistakeTag: {
                  select: { name: true }
                }
              }
            }
          }
        }
      },
      orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }, { createdAt: "desc" }],
      take: 100
    }),
    prisma.collection.findMany({
      where: {
        userId,
        type: "TRADING"
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: "asc" }
    }),
    prisma.exchangeConnection.findMany({
      where: { userId },
      select: {
        id: true,
        accountName: true
      },
      orderBy: { accountName: "asc" }
    }),
    prisma.trade.findMany({
      where: { userId },
      distinct: ["symbol"],
      select: { symbol: true },
      orderBy: { symbol: "asc" }
    }),
    prisma.tradeMistakeTag.findMany({
      where: { userId },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: "asc" }
    })
  ]);
  const hasFilters = Object.values(params).some((value) => value);

  return (
    <>
      <PageHeader
        title="Trades"
        description="Browse synced journal trades and inspect final net results."
      />
      <div className="grid gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex justify-end">
          <Link
            className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px"
            href="/trades/import-screenshot"
          >
            Import screenshot
          </Link>
        </div>
        <form
          action="/trades"
          className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl border border-border bg-surface p-4 lg:grid-cols-6"
        >
          <DateFilterInput
            className="min-w-0"
            defaultValue={params.from}
            label="From"
            name="from"
          />
          <DateFilterInput
            className="min-w-0"
            defaultValue={params.to}
            label="To"
            name="to"
          />
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Collection
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.collectionId}
              name="collectionId"
            >
              <option value="">All</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Exchange
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.exchangeConnectionId}
              name="exchangeConnectionId"
            >
              <option value="">All</option>
              {exchanges.map((exchange) => (
                <option key={exchange.id} value={exchange.id}>
                  {exchange.accountName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Symbol
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.symbol}
              name="symbol"
            >
              <option value="">All</option>
              {symbols.map((symbol) => (
                <option key={symbol.symbol} value={symbol.symbol}>
                  {symbol.symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Market
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.marketType}
              name="marketType"
            >
              <option value="">All</option>
              {MARKET_TYPES.map((marketType) => (
                <option key={marketType} value={marketType}>
                  {labelize(marketType)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Side
            <input
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.side}
              name="side"
              placeholder="LONG, BUY..."
            />
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Status
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.status}
              name="status"
            >
              <option value="">All</option>
              {TRADE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {labelize(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Strategy
            <input
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.strategy}
              name="strategy"
              placeholder="Breakout..."
            />
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Mistake
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.tagId}
              name="tagId"
            >
              <option value="">All</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-medium text-muted">
            Grade
            <input
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              defaultValue={params.grade}
              name="grade"
              placeholder="A, B+..."
            />
          </label>
          <div className="col-span-2 flex gap-2 lg:col-span-6">
            <button className="min-h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px">
              Apply filters
            </button>
            {hasFilters ? (
              <Link
                className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold"
                href="/trades"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {trades.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No matching trades" : "No trades synced"}
            description={
              hasFilters
                ? "Adjust filters to broaden the trade list."
                : "Journal trades will appear here after the BingX sync pipeline creates them."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="hidden grid-cols-[1fr_120px_120px_120px_140px] gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted md:grid">
              <span>Trade</span>
              <span>Status</span>
              <span>Gross</span>
              <span>Net</span>
              <span>Closed</span>
            </div>
            {trades.map((trade) => (
              <Link
                className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3 transition hover:bg-background/70 last:border-b-0 md:grid-cols-[1fr_120px_120px_120px_140px] md:gap-4"
                href={buildTradeDetailHref({
                  returnLabel: "Back to trades",
                  returnTo: currentPath,
                  tradeId: trade.id
                }) as Route}
                key={trade.id}
              >
                <div className="col-span-2 md:col-span-1">
                  <p className="text-sm font-semibold">{trade.symbol}</p>
                  <TradeRowMetadata trade={trade} />
                  {trade.journal?.strategy || trade.journal?.grade ? (
                    <p className="mt-1 text-xs text-muted">
                      {trade.journal.strategy ?? "No strategy"} -{" "}
                      {trade.journal.grade ?? "No grade"}
                    </p>
                  ) : null}
                  {trade.journal?.mistakeTags.length ? (
                    <p className="mt-1 text-xs text-muted">
                      {trade.journal.mistakeTags
                        .map((tag) => tag.mistakeTag.name)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-muted">{trade.status.toLowerCase()}</p>
                <p className={pnlClassName(trade.grossPnl)}>
                  {formatDecimal(trade.grossPnl)}
                </p>
                <p className={pnlClassName(trade.netPnl, true)}>
                  {formatDecimal(trade.netPnl)}
                </p>
                <p className="font-mono text-xs text-muted">
                  {formatDate(trade.closedAt ?? trade.openedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function TradeRowMetadata({ trade }: { trade: TradeListItem }) {
  const marginLeverage = formatMarginLeverage(trade.rawSummary);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
      <span>{trade.collection.name}</span>
      <span aria-hidden="true">-</span>
      <span>{trade.exchangeConnection.accountName}</span>
      <span aria-hidden="true">-</span>
      <span>{trade.marketType.toLowerCase()}</span>
      {trade.side ? (
        <>
          <span aria-hidden="true">-</span>
          <span className={sideBadgeClassName(trade.side)}>
            {labelize(trade.side)}
          </span>
        </>
      ) : null}
      {marginLeverage !== "-" ? (
        <span className="font-mono text-foreground">{marginLeverage}</span>
      ) : null}
    </div>
  );
}

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined>
) {
  return {
    from: getParam(searchParams.from),
    to: getParam(searchParams.to),
    collectionId: getParam(searchParams.collectionId),
    exchangeConnectionId: getParam(searchParams.exchangeConnectionId),
    symbol: getParam(searchParams.symbol),
    marketType: getParam(searchParams.marketType),
    side: getParam(searchParams.side),
    status: getParam(searchParams.status),
    strategy: getParam(searchParams.strategy),
    tagId: getParam(searchParams.tagId),
    grade: getParam(searchParams.grade)
  };
}

function buildTradeWhere(
  userId: string,
  params: ReturnType<typeof normalizeSearchParams>
) {
  const where: TradeWhere = { userId };
  const closedAt: NonNullable<TradeWhere["closedAt"]> = {};

  if (params.from) {
    closedAt.gte = new Date(`${params.from}T00:00:00.000Z`);
  }

  if (params.to) {
    closedAt.lte = new Date(`${params.to}T23:59:59.999Z`);
  }

  if (Object.keys(closedAt).length > 0) {
    where.closedAt = closedAt;
  }

  if (params.collectionId) {
    where.collectionId = params.collectionId;
  }

  if (params.exchangeConnectionId) {
    where.exchangeConnectionId = params.exchangeConnectionId;
  }

  if (params.symbol) {
    where.symbol = params.symbol;
  }

  if (isMarketType(params.marketType)) {
    where.marketType = params.marketType;
  }

  if (params.side) {
    where.side = { contains: params.side };
  }

  if (isTradeStatus(params.status)) {
    where.status = params.status;
  }

  const journalWhere: NonNullable<TradeWhere["journal"]>["is"] = {};

  if (params.strategy) {
    journalWhere.strategy = params.strategy;
  }

  if (params.grade) {
    journalWhere.grade = params.grade;
  }

  if (params.tagId) {
    journalWhere.mistakeTags = {
      some: {
        mistakeTagId: params.tagId
      }
    };
  }

  if (Object.keys(journalWhere).length > 0) {
    where.journal = { is: journalWhere };
  }

  return where;
}

function buildTradesPath(params: ReturnType<typeof normalizeSearchParams>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();

  return query ? `/trades?${query}` : "/trades";
}

function buildTradeDetailHref({
  returnLabel,
  returnTo,
  tradeId
}: {
  returnLabel: string;
  returnTo: string;
  tradeId: string;
}) {
  const searchParams = new URLSearchParams({
    returnLabel,
    returnTo
  });

  return `/trades/${tradeId}?${searchParams.toString()}`;
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isMarketType(value: string): value is MarketType {
  return MARKET_TYPES.includes(value as MarketType);
}

function isTradeStatus(value: string): value is TradeStatus {
  return TRADE_STATUSES.includes(value as TradeStatus);
}

function labelize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function sideBadgeClassName(side: string) {
  const normalizedSide = side.toLowerCase();
  const base =
    "inline-flex min-h-5 items-center rounded-full border px-2 text-[11px] font-semibold leading-none";

  if (normalizedSide === "long") {
    return `${base} border-profit/30 bg-profit/10 text-profit`;
  }

  if (normalizedSide === "short") {
    return `${base} border-loss/30 bg-loss/10 text-loss`;
  }

  return `${base} border-border bg-background text-muted`;
}

function formatMarginLeverage(rawSummary: unknown) {
  const margin = getExtractedNumeric(rawSummary, "margin");
  const leverage = getExtractedNumeric(rawSummary, "leverage");

  if (margin === null && leverage === null) {
    return "-";
  }

  if (margin !== null && leverage !== null) {
    return `${formatCompactNumber(margin)}(${formatCompactNumber(leverage)}x)`;
  }

  if (margin !== null) {
    return formatCompactNumber(margin);
  }

  return `${formatCompactNumber(leverage ?? 0)}x`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(value);
}

function getExtractedNumeric(rawSummary: unknown, key: "margin" | "leverage") {
  const value = getExtractedValue(rawSummary, key);

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getExtractedValue(rawSummary: unknown, key: "margin" | "leverage") {
  if (!rawSummary || typeof rawSummary !== "object" || Array.isArray(rawSummary)) {
    return null;
  }

  const extracted = (rawSummary as { extracted?: unknown }).extracted;

  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) {
    return null;
  }

  const value = (extracted as Record<string, unknown>)[key];
  return value ?? null;
}

function formatDate(value: Date | null) {
  return value?.toISOString() ?? "-";
}

function pnlClassName(value: { toNumber(): number } | null, strong = false) {
  const base = strong
    ? "font-mono text-sm font-semibold"
    : "font-mono text-sm text-muted";

  if (!value) {
    return base;
  }

  if (value.toNumber() > 0) {
    return `${base} text-profit`;
  }

  if (value.toNumber() < 0) {
    return `${base} text-loss`;
  }

  return base;
}

function formatDecimal(value: { toString(): string } | null) {
  return value ? value.toString() : "-";
}
