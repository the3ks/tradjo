import { runCollectionSyncAction } from "@/app/(app)/sync/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type SyncSourceListItem = {
  id: string;
  marketType: "PERPETUAL" | "SPOT" | "FUTURES";
  initialSyncCompleted: boolean;
  symbolFilterMode: "ALL" | "INCLUDE" | "EXCLUDE";
  collection: { name: string };
  exchangeConnection: { accountName: string };
  symbols: { symbol: string }[];
};

type SyncLogListItem = {
  id: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: Date;
  fetchedCount: number;
  errorMessage: string | null;
  collectionSyncSource: {
    collection: { name: string };
  } | null;
  exchangeConnection: { accountName: string };
};

export default async function SyncPage() {
  const userId = await requireUserId();
  const [syncSources, syncLogs]: [SyncSourceListItem[], SyncLogListItem[]] =
    await Promise.all([
    prisma.collectionSyncSource.findMany({
      where: {
        userId,
        isActive: true,
        collection: {
          type: "TRADING"
        },
        exchangeConnection: {
          isActive: true,
          deletedAt: null
        }
      },
      include: {
        collection: {
          select: {
            name: true
          }
        },
        exchangeConnection: {
          select: {
            accountName: true
          }
        },
        symbols: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.exchangeSyncLog.findMany({
      where: { userId },
      include: {
        collectionSyncSource: {
          include: {
            collection: {
              select: { name: true }
            }
          }
        },
        exchangeConnection: {
          select: { accountName: true }
        }
      },
      orderBy: { startedAt: "desc" },
      take: 20
    })
  ]);

  return (
    <>
      <PageHeader
        title="Sync"
        description="Run manual collection syncs and review recent sync logs."
      />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Collection sync sources</h2>
          {syncSources.length === 0 ? (
            <EmptyState
              title="No active sync sources"
              description="Create a BingX exchange connection and configure a trading collection sync source before running manual sync."
            />
          ) : (
            <div className="grid gap-3">
              {syncSources.map((source) => (
                <article
                  className="rounded-xl border border-border bg-surface p-4"
                  key={source.id}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-medium">{source.collection.name}</h3>
                      <p className="mt-2 text-sm text-muted">
                        {source.exchangeConnection.accountName} -{" "}
                        {source.marketType.toLowerCase()} -{" "}
                        {source.initialSyncCompleted ? "incremental" : "initial"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Symbols:{" "}
                        {source.symbolFilterMode === "ALL"
                          ? "all"
                          : source.symbols
                              .map((symbol) => symbol.symbol)
                              .join(", ") || source.symbolFilterMode.toLowerCase()}
                      </p>
                    </div>
                    <form action={runCollectionSyncAction}>
                      <input name="syncSourceId" type="hidden" value={source.id} />
                      <button className="min-h-10 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground transition active:translate-y-px">
                        Sync trades
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Recent sync logs</h2>
          {syncLogs.length === 0 ? (
            <EmptyState
              title="No sync logs"
              description="Manual sync attempts will appear here with status, counts, and errors."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="hidden grid-cols-[1fr_160px_140px_120px] gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted md:grid">
                <span>Source</span>
                <span>Status</span>
                <span>Started</span>
                <span>Fetched</span>
              </div>
              {syncLogs.map((log) => (
                <article
                  className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[1fr_160px_140px_120px] md:gap-4"
                  key={log.id}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {log.collectionSyncSource?.collection.name ??
                        log.exchangeConnection.accountName}
                    </p>
                    {log.errorMessage ? (
                      <p className="mt-1 text-xs text-danger">{log.errorMessage}</p>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">{log.status.toLowerCase()}</p>
                  <p className="font-mono text-xs text-muted">
                    {log.startedAt.toISOString()}
                  </p>
                  <p className="font-mono text-sm text-muted">{log.fetchedCount}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
