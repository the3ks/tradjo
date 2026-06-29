import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";

import { PageHeader } from "@/components/page-header";
import { JournalEditor } from "@/components/trades/journal-editor";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type TradeDetailPageProps = {
  params: Promise<{
    tradeId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TradeDetailPage({
  params,
  searchParams
}: TradeDetailPageProps) {
  const [{ tradeId }, userId] = await Promise.all([params, requireUserId()]);
  const backLink = buildBackLink((await searchParams) ?? {});
  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      userId
    },
    include: {
      collection: {
        select: { name: true }
      },
      exchangeConnection: {
        select: { accountName: true }
      },
      collectionSyncSource: {
        select: { id: true, initialSyncCompleted: true }
      },
      journal: {
        include: {
          mistakeTags: {
            include: {
              mistakeTag: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      },
      screenshots: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          caption: true,
          originalName: true
        }
      }
    }
  });

  if (!trade) {
    notFound();
  }

  const allTags = await prisma.tradeMistakeTag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true
    }
  });
  const journal = trade.journal
    ? {
        strategy: trade.journal.strategy,
        setup: trade.journal.setup,
        entryTrigger: trade.journal.entryTrigger,
        exitReason: trade.journal.exitReason,
        notes: trade.journal.notes,
        emotion: trade.journal.emotion,
        review: trade.journal.review,
        grade: trade.journal.grade,
        mistakeTagIds: trade.journal.mistakeTags.map(
          (tag) => tag.mistakeTag.id
        )
      }
    : null;

  return (
    <>
      <PageHeader
        title={`${trade.symbol} trade`}
        description={`${trade.collection.name} - ${trade.exchangeConnection.accountName} - ${trade.marketType.toLowerCase()}`}
      />
      <div className="grid min-w-0 gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          className="w-fit text-sm font-semibold text-accent"
          href={backLink.href as Route}
        >
          {backLink.label}
        </Link>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5">
          <div className="grid min-w-0 gap-4 md:grid-cols-4">
            <Metric label="Status" value={labelize(trade.status)} />
            <Metric label="Side" value={trade.side ?? "-"} />
            <Metric label="Quantity" value={formatDecimal(trade.quantity)} />
            <Metric label="Net win/loss" value={formatDecimal(trade.netPnl)} />
            <Metric label="Strategy" value={trade.journal?.strategy ?? "-"} />
            <Metric
              label="Entry Trigger"
              value={trade.journal?.entryTrigger ?? "-"}
            />
            <Metric
              label="Exit Reason"
              value={trade.journal?.exitReason ?? "-"}
            />
            <Metric label="Grade" value={trade.journal?.grade ?? "-"} />
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Result</h2>
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-3">
            <Metric label="Gross result" value={formatDecimal(trade.grossPnl)} />
            <Metric label="Trading fees" value={formatDecimal(trade.tradingFee)} />
            <Metric label="Funding fees" value={formatDecimal(trade.fundingFee)} />
            <Metric label="Entry price" value={formatDecimal(trade.entryPrice)} />
            <Metric label="Exit price" value={formatDecimal(trade.exitPrice)} />
            <Metric label="Final net" value={formatDecimal(trade.netPnl)} />
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Timeline</h2>
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-3">
            <Metric label="Opened" value={formatDate(trade.openedAt)} />
            <Metric label="Closed" value={formatDate(trade.closedAt)} />
            <Metric label="Settled" value={formatDate(trade.settledAt)} />
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5">
          <div className="mb-5">
            <h2 className="text-base font-semibold">Journal</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Add the trading context you care about: why you opened it, what happened, and what to repeat or avoid.
            </p>
          </div>
          <JournalEditor
            allTags={allTags}
            journal={journal}
            screenshots={trade.screenshots}
            tradeId={trade.id}
          />
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Sync Metadata</h2>
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
            <Metric label="Source type" value={trade.sourceRecordType} />
            <Metric label="Source record" value={trade.sourceRecordId} />
            <Metric label="External trade" value={trade.externalTradeId} />
            <Metric
              label="Sync source"
              value={trade.collectionSyncSource?.id ?? "-"}
            />
          </div>
          <pre className="mt-4 max-h-80 max-w-full overflow-auto rounded-lg border border-border bg-background p-3 text-xs text-muted">
            {JSON.stringify(trade.rawSummary, null, 2)}
          </pre>
        </section>
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

function buildBackLink(searchParams: Record<string, string | string[] | undefined>) {
  const returnTo = getParam(searchParams.returnTo);
  const returnLabel = getParam(searchParams.returnLabel);

  return {
    href: isSafeInternalPath(returnTo) ? returnTo : "/trades",
    label: returnLabel.trim() || "Back to trades"
  };
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function formatDecimal(value: { toString(): string } | null) {
  return value ? value.toString() : "-";
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
