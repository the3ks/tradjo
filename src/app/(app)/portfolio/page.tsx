import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AssetLedgerForm } from "@/components/portfolio/asset-ledger-form";
import { CashLedgerForm } from "@/components/portfolio/cash-ledger-form";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type DecimalValue = {
  toNumber(): number;
  toString(): string;
};

type PortfolioPositionRow = {
  id: string;
  symbol: string;
  assetClass: string;
  positionType: string;
  exchange: string | null;
  currentQuantity: DecimalValue;
  averageCost: DecimalValue;
  realizedPnl: DecimalValue;
  currency: string;
};

export default async function PortfolioPage() {
  const userId = await requireUserId();
  const positions = await prisma.portfolioPosition.findMany({
    where: { userId },
    orderBy: [{ assetClass: "asc" }, { symbol: "asc" }, { exchange: "asc" }],
    select: {
      id: true,
      symbol: true,
      assetClass: true,
      positionType: true,
      exchange: true,
      currentQuantity: true,
      averageCost: true,
      realizedPnl: true,
      currency: true
    }
  });
  const cashPositions = positions.filter((position) => position.assetClass === "CASH");
  const cashPositionOptions = cashPositions.map((position) => ({
    id: position.id,
    label: `${position.symbol} (${position.exchange ?? "General"}) - ${formatDecimal(
      position.currentQuantity
    )}`
  }));
  const allocationRows = summarizeAllocation(positions);
  const totalCost = positions.reduce((total, position) => total + positionCost(position), 0);
  const cashCost = cashPositions.reduce((total, position) => total + positionCost(position), 0);

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Track strategic holdings, cash balances, allocation, and exposure separately from tactical trades."
        action={
          <Link
            className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-surface-elevated active:translate-y-px"
            href="/portfolio/ledger"
          >
            View ledger
          </Link>
        }
      />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Cost basis" value={formatNumber(totalCost)} />
          <StatCard label="Cash allocation" value={formatPercent(totalCost > 0 ? cashCost / totalCost : 0)} />
          <StatCard label="Positions" value={positions.length.toString()} />
          <StatCard
            label="Realized P&L"
            tone={sumRealizedPnl(positions)}
            value={formatNumber(sumRealizedPnl(positions))}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold">Current positions</h2>
            </div>
            {positions.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No portfolio positions yet"
                  description="Add a cash deposit to start tracking balances and allocation."
                />
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[1fr_110px_120px_120px_120px] gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted md:grid">
                  <span>Holding</span>
                  <span>Quantity</span>
                  <span>Average cost</span>
                  <span>Cost basis</span>
                  <span>Realized P&L</span>
                </div>
                <div className="divide-y divide-border">
                  {positions.map((position) => (
                    <PositionRow key={position.id} position={position} />
                  ))}
                </div>
              </>
            )}
          </section>

          <div className="grid gap-6">
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-semibold">Cash & equivalents</h2>
              <div className="mt-4 grid gap-3">
                {cashPositions.length === 0 ? (
                  <p className="text-sm text-muted">No cash balances recorded.</p>
                ) : (
                  cashPositions.map((position) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                      key={position.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {position.symbol} ({position.exchange ?? "General"})
                        </p>
                        <p className="text-xs text-muted">{position.currency}</p>
                      </div>
                      <p className="font-mono text-sm">{formatDecimal(position.currentQuantity)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-semibold">Asset allocation</h2>
              <div className="mt-4 grid gap-3">
                {allocationRows.length === 0 ? (
                  <p className="text-sm text-muted">Allocation appears after positions exist.</p>
                ) : (
                  allocationRows.map((row) => (
                    <div className="grid gap-2" key={row.assetClass}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{formatLabel(row.assetClass)}</span>
                        <span className="font-mono text-muted">{formatPercent(row.percent)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.round(row.percent * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-semibold">Add asset transaction</h2>
              <div className="mt-5">
                <AssetLedgerForm cashPositions={cashPositionOptions} />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-semibold">Add cash ledger</h2>
              <div className="mt-5">
                <CashLedgerForm />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function PositionRow({ position }: { position: PortfolioPositionRow }) {
  return (
    <div className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_110px_120px_120px_120px] md:gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {position.symbol} {position.exchange ? `(${position.exchange})` : ""}
        </p>
        <p className="text-xs text-muted">
          {formatLabel(position.assetClass)} - {formatLabel(position.positionType)}
        </p>
      </div>
      <Metric label="Quantity" value={formatDecimal(position.currentQuantity)} />
      <Metric label="Average cost" value={formatDecimal(position.averageCost)} />
      <Metric label="Cost basis" value={formatNumber(positionCost(position))} />
      <Metric
        label="Realized P&L"
        tone={position.realizedPnl.toNumber()}
        value={formatDecimal(position.realizedPnl)}
      />
    </div>
  );
}

function Metric({
  label,
  tone,
  value
}: {
  label: string;
  tone?: number;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 md:block">
      <span className="text-xs text-muted md:hidden">{label}</span>
      <span className={`font-mono text-sm ${toneClassName(tone)}`}>{value}</span>
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
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-3 font-mono text-2xl font-semibold ${toneClassName(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function summarizeAllocation(positions: PortfolioPositionRow[]) {
  const totals = new Map<string, number>();

  for (const position of positions) {
    totals.set(position.assetClass, (totals.get(position.assetClass) ?? 0) + positionCost(position));
  }

  const totalCost = Array.from(totals.values()).reduce((total, value) => total + value, 0);

  return Array.from(totals.entries()).map(([assetClass, cost]) => ({
    assetClass,
    percent: totalCost > 0 ? cost / totalCost : 0
  }));
}

function sumRealizedPnl(positions: PortfolioPositionRow[]) {
  return positions.reduce((total, position) => total + position.realizedPnl.toNumber(), 0);
}

function positionCost(position: PortfolioPositionRow) {
  return position.currentQuantity.toNumber() * position.averageCost.toNumber();
}

function formatDecimal(value: DecimalValue) {
  return value.toString();
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

function toneClassName(value: number | undefined) {
  if (value === undefined || value === 0) {
    return "";
  }

  return value > 0 ? "text-profit" : "text-loss";
}
