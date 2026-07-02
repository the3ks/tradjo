import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type DecimalValue = {
  toString(): string;
};

export default async function PortfolioLedgerPage() {
  const userId = await requireUserId();
  const ledgers = await prisma.portfolioLedger.findMany({
    where: { userId },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      action: true,
      price: true,
      quantityChange: true,
      currency: true,
      source: true,
      transactionDate: true,
      linkedLedger: {
        select: {
          position: {
            select: {
              symbol: true
            }
          }
        }
      },
      linkedByLedger: {
        select: {
          position: {
            select: {
              symbol: true
            }
          }
        }
      },
      position: {
        select: {
          symbol: true,
          assetClass: true,
          positionType: true,
          exchange: true
        }
      }
    }
  });

  return (
    <>
      <PageHeader
        title="Portfolio ledger"
        description="Review immutable portfolio transactions behind current holdings and balances."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-surface-elevated active:translate-y-px"
              href="/portfolio/import"
            >
              Import
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-surface-elevated active:translate-y-px"
              href="/portfolio"
            >
              Back to portfolio
            </Link>
          </div>
        }
      />
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold">Transactions</h2>
          </div>
          {ledgers.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No portfolio ledger rows yet"
                description="Cash deposits and future portfolio imports will appear here."
              />
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[150px_1fr_110px_120px_100px_110px_100px] gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted lg:grid">
                <span>Date</span>
                <span>Position</span>
                <span>Action</span>
                <span>Quantity</span>
                <span>Price</span>
                <span>Linked</span>
                <span>Source</span>
              </div>
              <div className="divide-y divide-border">
                {ledgers.map((ledger) => (
                  <div
                    className="grid gap-2 px-4 py-3 lg:grid-cols-[150px_1fr_110px_120px_100px_110px_100px] lg:gap-4"
                    key={ledger.id}
                  >
                    <Metric label="Date" value={formatDate(ledger.transactionDate)} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {ledger.position.symbol}{" "}
                        {ledger.position.exchange ? `(${ledger.position.exchange})` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {formatLabel(ledger.position.assetClass)} -{" "}
                        {formatLabel(ledger.position.positionType)}
                      </p>
                    </div>
                    <Metric label="Action" value={formatLabel(ledger.action)} />
                    <Metric
                      label="Quantity"
                      value={`${formatDecimal(ledger.quantityChange)} ${ledger.currency}`}
                    />
                    <Metric label="Price" value={formatDecimal(ledger.price)} />
                    <Metric label="Linked" value={formatLinkedPosition(ledger)} />
                    <Metric label="Source" value={formatLabel(ledger.source)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:block">
      <span className="text-xs text-muted lg:hidden">{label}</span>
      <span className="font-mono text-sm lg:font-sans lg:text-sm">{value}</span>
    </div>
  );
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function formatDecimal(value: DecimalValue) {
  return value.toString();
}

function formatLinkedPosition(ledger: {
  linkedByLedger: { position: { symbol: string } } | null;
  linkedLedger: { position: { symbol: string } } | null;
}) {
  return (
    ledger.linkedLedger?.position.symbol ??
    ledger.linkedByLedger?.position.symbol ??
    "-"
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}
