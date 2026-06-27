import Link from "next/link";

import {
  deleteExchangeConnectionAction,
  setExchangeConnectionActiveAction,
  testExchangeConnectionAction
} from "@/app/(app)/settings/exchanges/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ExchangeConnectionForm } from "@/components/settings/exchange-connection-form";
import { maskSecret } from "@/lib/exchange-connections";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type ExchangeConnectionWithSyncSources = {
  id: string;
  accountName: string;
  apiKeyEncrypted: string;
  isActive: boolean;
  deletedAt: Date | null;
  syncSources: { id: string }[];
};

export default async function ExchangeConnectionsPage() {
  const userId = await requireUserId();
  const connections: ExchangeConnectionWithSyncSources[] =
    await prisma.exchangeConnection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      syncSources: {
        select: { id: true }
      }
    }
  });

  return (
    <>
      <PageHeader
        title="Exchange connections"
        description="Store read-only BingX API credentials for manual collection sync."
      />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Add BingX connection</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                API credentials are encrypted on the app server before storage.
              </p>
            </div>
            <Link className="text-sm font-medium text-accent" href="/settings">
              Back to settings
            </Link>
          </div>
          <ExchangeConnectionForm />
        </section>

        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Saved connections</h2>
          {connections.length === 0 ? (
            <EmptyState
              title="No exchange connections"
              description="Add a BingX connection before configuring trading collection sync sources."
            />
          ) : (
            <div className="grid gap-3">
              {connections.map((connection) => (
                <article
                  className="rounded-xl border border-border bg-surface p-4"
                  key={connection.id}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{connection.accountName}</h3>
                        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
                          BingX
                        </span>
                        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
                          {connection.isActive ? "Active" : "Disabled"}
                        </span>
                        {connection.deletedAt ? (
                          <span className="rounded-full border border-danger/40 px-2 py-1 text-xs text-danger">
                            Soft deleted
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 font-mono text-xs text-muted">
                        Key: {maskSecret(connection.apiKeyEncrypted)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Sync sources: {connection.syncSources.length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={setExchangeConnectionActiveAction}>
                        <input
                          name="connectionId"
                          type="hidden"
                          value={connection.id}
                        />
                        <input
                          name="isActive"
                          type="hidden"
                          value={connection.isActive ? "false" : "true"}
                        />
                        <button className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px">
                          {connection.isActive ? "Disable" : "Enable"}
                        </button>
                      </form>
                      <form action={testExchangeConnectionAction}>
                        <input
                          name="connectionId"
                          type="hidden"
                          value={connection.id}
                        />
                        <button className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px">
                          Test
                        </button>
                      </form>
                      <form action={deleteExchangeConnectionAction}>
                        <input
                          name="connectionId"
                          type="hidden"
                          value={connection.id}
                        />
                        <button className="min-h-10 rounded-lg border border-danger/40 px-3 text-sm font-medium text-danger transition hover:bg-danger/10 active:translate-y-px">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
