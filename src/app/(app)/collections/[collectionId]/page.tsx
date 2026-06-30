import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { runCollectionSyncAction } from "@/app/(app)/sync/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ScreenshotImporter } from "@/components/trades/screenshot-importer";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type CollectionDetailPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

type DecimalValue = {
  toNumber(): number;
  toString(): string;
};

export default async function CollectionDetailPage({
  params
}: CollectionDetailPageProps) {
  const [{ collectionId }, userId] = await Promise.all([
    params,
    requireUserId()
  ]);
  const collection = await prisma.collection.findFirst({
    where: {
      id: collectionId,
      userId,
      type: "TRADING"
    },
    include: {
      parent: {
        select: {
          name: true
        }
      },
      syncSources: {
        where: { isActive: true },
        include: {
          exchangeConnection: {
            select: {
              accountName: true
            }
          },
          symbols: {
            select: {
              symbol: true
            },
            orderBy: {
              symbol: "asc"
            }
          }
        },
        take: 1
      }
    }
  });

  if (!collection) {
    notFound();
  }

  const [trades, dashboardTrades, geminiCredential] = await Promise.all([
    prisma.trade.findMany({
      where: {
        userId,
        collectionId: collection.id
      },
      include: {
        exchangeConnection: {
          select: {
            accountName: true
          }
        },
        journal: {
          select: {
            strategy: true,
            grade: true,
            mistakeTags: {
              include: {
                mistakeTag: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }, { createdAt: "desc" }],
      take: 100
    }),
    prisma.trade.findMany({
      where: {
        userId,
        collectionId: collection.id
      },
      select: {
        status: true,
        grossPnl: true,
        tradingFee: true,
        fundingFee: true,
        netPnl: true
      }
    }),
    prisma.userAiCredential.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: "GEMINI"
        }
      },
      select: { id: true }
    })
  ]);
  const activeSyncSource = collection.syncSources[0];
  const stats = summarizeTrades(dashboardTrades);

  return (
    <>
      <PageHeader
        title={collection.name}
        description={
          collection.description ??
          "Review trades in this trading collection and fetch the latest exchange data."
        }
      />
      <div className="grid gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link className="text-sm font-semibold text-accent" href="/collections">
            Back to collections
          </Link>
          <Link
            className="text-sm font-semibold text-muted transition hover:text-foreground"
            href={`/trades?collectionId=${collection.id}` as Route}
          >
            Advanced trade filters
          </Link>
        </div>

        <details className="overflow-hidden rounded-xl border border-border bg-surface">
          <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
            Trade dashboard
          </summary>
          <div className="grid gap-3 border-t border-border p-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Net result"
              tone={stats.netPnl}
              value={formatNumber(stats.netPnl)}
            />
            <StatCard label="Win rate" value={`${stats.winRate.toFixed(1)}%`} />
            <StatCard label="Trades" value={stats.count.toString()} />
            <StatCard
              label="Profit factor"
              value={formatProfitFactor(stats.profitFactor)}
            />
            <StatCard label="Closed" value={stats.closedCount.toString()} />
            <StatCard label="Open" value={stats.openCount.toString()} />
            <StatCard
              label="Average net"
              tone={stats.averageNet}
              value={formatNumber(stats.averageNet)}
            />
            <StatCard label="Total fees" value={formatNumber(stats.totalFees)} />
          </div>
        </details>

        <details className="overflow-hidden rounded-xl border border-border bg-surface">
          <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
            Sync trades
          </summary>
          <div className="border-t border-border p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
                    Trading collection
                  </span>
                  {collection.parent ? (
                    <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
                      In {collection.parent.name}
                    </span>
                  ) : null}
                  {collection.isPinned ? (
                    <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">
                      Pinned
                    </span>
                  ) : null}
                </div>
                {activeSyncSource ? (
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <Metric
                      label="Exchange"
                      value={activeSyncSource.exchangeConnection.accountName}
                    />
                    <Metric
                      label="Market"
                      value={labelize(activeSyncSource.marketType)}
                    />
                    <Metric
                      label="Symbols"
                      value={formatSymbols(
                        activeSyncSource.symbolFilterMode,
                        activeSyncSource.symbols
                      )}
                    />
                    <Metric
                      label="Last event"
                      value={formatDate(activeSyncSource.lastEventTime)}
                    />
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-muted">
                    Add a sync source from the collections page before fetching
                    exchange trades.
                  </p>
                )}
              </div>
              {activeSyncSource ? (
                <form action={runCollectionSyncAction}>
                  <input
                    name="syncSourceId"
                    type="hidden"
                    value={activeSyncSource.id}
                  />
                  <button className="min-h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px">
                    Sync trades
                  </button>
                </form>
              ) : (
                <Link
                  className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px"
                  href="/collections"
                >
                  Configure sync
                </Link>
              )}
            </div>
          </div>
        </details>

        <ScreenshotImporter
          collectionId={collection.id}
          collectionName={collection.name}
          hasGeminiKey={Boolean(geminiCredential)}
        />

        {trades.length === 0 ? (
          <EmptyState
            title="No trades in this collection"
            description={
              activeSyncSource
                ? "Click Sync trades to fetch exchange trades for this collection."
                : "Configure a sync source before fetching trades for this collection."
            }
          />
        ) : (
          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="hidden grid-cols-[1fr_110px_120px_120px_140px] gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted md:grid">
              <span>Trade</span>
              <span>Status</span>
              <span>Gross</span>
              <span>Net</span>
              <span>Closed</span>
            </div>
            {trades.map((trade) => (
              <Link
                className="grid gap-3 border-b border-border px-4 py-3 transition hover:bg-background/70 last:border-b-0 md:grid-cols-[1fr_110px_120px_120px_140px] md:gap-4"
                href={
                  buildTradeDetailHref({
                    returnLabel: `Back to ${collection.name}`,
                    returnTo: `/collections/${collection.id}`,
                    tradeId: trade.id
                  }) as Route
                }
                key={trade.id}
              >
                <div>
                  <p className="text-sm font-semibold">{trade.symbol}</p>
                  <p className="mt-1 text-xs text-muted">
                    {trade.exchangeConnection.accountName} -{" "}
                    {trade.marketType.toLowerCase()}
                    {trade.side ? ` - ${trade.side.toLowerCase()}` : ""}
                  </p>
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
          </section>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  tone,
  value
}: {
  label: string;
  tone?: number;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-2 font-mono text-lg font-semibold ${pnlTone(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function summarizeTrades(
  trades: Array<{
    status: string;
    tradingFee: DecimalValue | null;
    fundingFee: DecimalValue | null;
    netPnl: DecimalValue | null;
  }>
) {
  const closedTrades = trades.filter((trade) => trade.status !== "OPEN");
  const winningTrades = closedTrades.filter(
    (trade) => trade.netPnl && trade.netPnl.toNumber() > 0
  );
  const netPnl = trades.reduce(
    (total, trade) => total + (trade.netPnl?.toNumber() ?? 0),
    0
  );
  const losses = closedTrades.filter(
    (trade) => trade.netPnl && trade.netPnl.toNumber() < 0
  );
  const grossProfit = winningTrades.reduce(
    (total, trade) => total + (trade.netPnl?.toNumber() ?? 0),
    0
  );
  const grossLoss = Math.abs(
    losses.reduce((total, trade) => total + (trade.netPnl?.toNumber() ?? 0), 0)
  );
  const totalFees = trades.reduce(
    (total, trade) =>
      total +
      Math.abs(trade.tradingFee?.toNumber() ?? 0) +
      Math.abs(trade.fundingFee?.toNumber() ?? 0),
    0
  );

  return {
    averageNet: closedTrades.length > 0 ? netPnl / closedTrades.length : 0,
    closedCount: closedTrades.length,
    count: trades.length,
    netPnl,
    openCount: trades.length - closedTrades.length,
    profitFactor:
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    totalFees,
    winRate:
      closedTrades.length > 0
        ? (winningTrades.length / closedTrades.length) * 100
        : 0
  };
}

function formatSymbols(
  filterMode: string,
  symbols: Array<{
    symbol: string;
  }>
) {
  if (filterMode === "ALL") {
    return "All symbols";
  }

  if (symbols.length === 0) {
    return labelize(filterMode);
  }

  return `${labelize(filterMode)} ${symbols
    .map((symbol) => symbol.symbol)
    .join(", ")}`;
}

function pnlClassName(value: DecimalValue | null, strong = false) {
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

function pnlTone(value: number | undefined) {
  if (value === undefined || value === 0) {
    return "";
  }

  return value > 0 ? "text-profit" : "text-loss";
}

function formatDecimal(value: DecimalValue | null) {
  return value ? value.toString() : "-";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8
  }).format(value);
}

function formatProfitFactor(value: number) {
  if (value === Infinity) {
    return "∞";
  }

  return value.toFixed(2);
}

function formatDate(value: Date | null) {
  return value?.toISOString() ?? "-";
}

function labelize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
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
