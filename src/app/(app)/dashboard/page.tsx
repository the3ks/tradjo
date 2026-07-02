import Link from "next/link";
import type { Route } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type DecimalValue = {
  toNumber(): number;
  toString(): string;
};

type DashboardTrade = {
  id: string;
  symbol: string;
  status: string;
  netPnl: DecimalValue | null;
  grossPnl: DecimalValue | null;
  tradingFee: DecimalValue | null;
  fundingFee: DecimalValue | null;
  openedAt: Date | null;
  closedAt: Date | null;
  collection: {
    id: string;
    name: string;
  };
};

type PortfolioPositionRow = {
  id: string;
  symbol: string;
  assetClass: string;
  currentQuantity: DecimalValue;
  averageCost: DecimalValue;
  realizedPnl: DecimalValue;
};

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [trades, collections, portfolioPositions] = await Promise.all([
    prisma.trade.findMany({
      where: { userId },
      select: {
        id: true,
        symbol: true,
        status: true,
        grossPnl: true,
        tradingFee: true,
        fundingFee: true,
        netPnl: true,
        openedAt: true,
        closedAt: true,
        collection: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }, { createdAt: "desc" }]
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
    prisma.portfolioPosition.findMany({
      where: { userId },
      select: {
        id: true,
        symbol: true,
        assetClass: true,
        currentQuantity: true,
        averageCost: true,
        realizedPnl: true
      },
      orderBy: [{ assetClass: "asc" }, { symbol: "asc" }]
    })
  ]);
  const stats = summarizeTrades(trades);
  const collectionRows = summarizeByCollection(trades, collections);
  const portfolioStats = summarizePortfolio(portfolioPositions);
  const recentTrades = trades.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Review performance across all trading collections."
      />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Trading Journal</h2>
              <p className="mt-1 text-sm text-muted">
                Tactical trade performance from synced and imported journal trades.
              </p>
            </div>
            <Link className="text-sm font-semibold text-accent" href="/trades">
              Open trades
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Net P&L" tone={stats.netPnl} value={formatNumber(stats.netPnl)} />
          <StatCard label="Win rate" value={`${stats.winRate.toFixed(1)}%`} />
          <StatCard label="Trades" value={stats.count.toString()} />
          <StatCard label="Profit factor" value={formatProfitFactor(stats.profitFactor)} />
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Closed trades" value={stats.closedCount.toString()} />
          <StatCard label="Open trades" value={stats.openCount.toString()} />
          <StatCard label="Average net" tone={stats.averageNet} value={formatNumber(stats.averageNet)} />
          <StatCard label="Total fees" value={formatNumber(stats.totalFees)} />
        </section>

        <section className="grid gap-3 border-t border-border pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Portfolio</h2>
              <p className="mt-1 text-sm text-muted">
                Strategic holdings and cash balances from the portfolio ledger.
              </p>
            </div>
            <Link className="text-sm font-semibold text-accent" href="/portfolio">
              Open portfolio
            </Link>
          </div>
          {portfolioPositions.length === 0 ? (
            <EmptyState
              title="No portfolio data yet"
              description="Add cash, create asset ledger entries, or import portfolio CSV rows to populate portfolio metrics."
            />
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                  label="Portfolio equity"
                  value={formatNumber(portfolioStats.totalCost)}
                />
                <StatCard
                  label="Cash allocation"
                  value={formatPercent(portfolioStats.cashAllocation)}
                />
                <StatCard
                  label="Holdings"
                  value={portfolioPositions.length.toString()}
                />
                <StatCard
                  label="Portfolio realized"
                  tone={portfolioStats.realizedPnl}
                  value={formatNumber(portfolioStats.realizedPnl)}
                />
              </section>
              <section className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-base font-semibold">Allocation snapshot</h3>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {portfolioStats.allocationRows.map((row) => (
                    <div className="grid gap-2" key={row.assetClass}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{formatLabel(row.assetClass)}</span>
                        <span className="font-mono text-muted">
                          {formatPercent(row.percent)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.round(row.percent * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>

        {trades.length === 0 ? (
          <EmptyState
            title="No trades yet"
            description="Connect BingX, configure a trading collection, sync trades, or import screenshots to populate dashboard metrics."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
            <section className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-base font-semibold">Collections</h2>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_54px_68px_78px] gap-2 border-b border-border px-3 py-3 text-xs font-medium text-muted md:grid-cols-[1fr_90px_100px_120px] md:gap-4 md:px-4">
                <span>Collection</span>
                <span>Trades</span>
                <span>Win rate</span>
                <span>Net</span>
              </div>
              {collectionRows.map((collection) => (
                <Link
                  className="grid grid-cols-[minmax(0,1fr)_54px_68px_78px] gap-2 border-b border-border px-3 py-3 transition hover:bg-background/70 last:border-b-0 md:grid-cols-[1fr_90px_100px_120px] md:gap-4 md:px-4"
                  href={`/collections/${collection.id}` as Route}
                  key={collection.id}
                >
                  <p className="truncate text-sm font-semibold">{collection.name}</p>
                  <p className="font-mono text-xs text-muted md:text-sm">{collection.count}</p>
                  <p className="font-mono text-xs text-muted md:text-sm">
                    {collection.winRate.toFixed(1)}%
                  </p>
                  <p className={pnlClassName(collection.netPnl, true)}>
                    {formatNumber(collection.netPnl)}
                  </p>
                </Link>
              ))}
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-base font-semibold">Recent trades</h2>
              </div>
              {recentTrades.map((trade) => (
                <Link
                  className="grid gap-2 border-b border-border px-4 py-3 transition hover:bg-background/70 last:border-b-0"
                  href={`/trades/${trade.id}?${new URLSearchParams({
                    returnLabel: "Back to dashboard",
                    returnTo: "/dashboard"
                  }).toString()}` as Route}
                  key={trade.id}
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{trade.symbol}</p>
                    <p className={pnlClassName(trade.netPnl?.toNumber() ?? 0, true)}>
                      {formatDecimal(trade.netPnl)}
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    {trade.collection.name} - {trade.status.toLowerCase()} -{" "}
                    {formatDate(trade.closedAt ?? trade.openedAt)}
                  </p>
                </Link>
              ))}
            </section>
          </div>
        )}
      </div>
    </>
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
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-3 font-mono text-2xl font-semibold ${pnlTone(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function summarizePortfolio(positions: PortfolioPositionRow[]) {
  const totalCost = positions.reduce(
    (total, position) => total + portfolioPositionCost(position),
    0
  );
  const cashCost = positions
    .filter((position) => position.assetClass === "CASH")
    .reduce((total, position) => total + portfolioPositionCost(position), 0);
  const realizedPnl = positions.reduce(
    (total, position) => total + position.realizedPnl.toNumber(),
    0
  );
  const allocationTotals = new Map<string, number>();

  for (const position of positions) {
    allocationTotals.set(
      position.assetClass,
      (allocationTotals.get(position.assetClass) ?? 0) +
        portfolioPositionCost(position)
    );
  }

  return {
    allocationRows: Array.from(allocationTotals.entries()).map(
      ([assetClass, cost]) => ({
        assetClass,
        percent: totalCost > 0 ? cost / totalCost : 0
      })
    ),
    cashAllocation: totalCost > 0 ? cashCost / totalCost : 0,
    realizedPnl,
    totalCost
  };
}

function portfolioPositionCost(position: PortfolioPositionRow) {
  return position.currentQuantity.toNumber() * position.averageCost.toNumber();
}

function summarizeTrades(trades: DashboardTrade[]) {
  const closedTrades = trades.filter((trade) => trade.status !== "OPEN");
  const wins = closedTrades.filter((trade) => decimalNumber(trade.netPnl) > 0);
  const losses = closedTrades.filter((trade) => decimalNumber(trade.netPnl) < 0);
  const netPnl = trades.reduce(
    (total, trade) => total + decimalNumber(trade.netPnl),
    0
  );
  const grossProfit = wins.reduce(
    (total, trade) => total + decimalNumber(trade.netPnl),
    0
  );
  const grossLoss = Math.abs(
    losses.reduce((total, trade) => total + decimalNumber(trade.netPnl), 0)
  );
  const totalFees = trades.reduce(
    (total, trade) =>
      total +
      Math.abs(decimalNumber(trade.tradingFee)) +
      Math.abs(decimalNumber(trade.fundingFee)),
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
    winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
  };
}

function summarizeByCollection(
  trades: DashboardTrade[],
  collections: Array<{ id: string; name: string }>
) {
  return collections.map((collection) => {
    const collectionTrades = trades.filter(
      (trade) => trade.collection.id === collection.id
    );
    const stats = summarizeTrades(collectionTrades);

    return {
      ...collection,
      count: stats.count,
      netPnl: stats.netPnl,
      winRate: stats.winRate
    };
  });
}

function decimalNumber(value: DecimalValue | null) {
  return value?.toNumber() ?? 0;
}

function pnlClassName(value: DecimalValue | number | null, strong = false) {
  const numericValue = typeof value === "number" ? value : decimalNumber(value);
  const base = strong
    ? "font-mono text-sm font-semibold"
    : "font-mono text-sm text-muted";

  return `${base} ${pnlTone(numericValue)}`;
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
    maximumFractionDigits: 8,
    minimumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent"
  }).format(value);
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (character) => character.toUpperCase());
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
