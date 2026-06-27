import {
  deleteCollectionAction,
  setCollectionPinnedAction
} from "@/app/(app)/collections/actions";
import { CollectionForm } from "@/components/collections/collection-form";
import { SyncSourceForm } from "@/components/collections/sync-source-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const collectionInclude = {
  parent: {
    select: {
      id: true,
      name: true
    }
  },
  children: {
    select: { id: true }
  },
  syncSources: {
    where: { isActive: true },
    include: {
      exchangeConnection: {
        select: {
          accountName: true
        }
      },
      symbols: true
    }
  }
};

type CollectionWithRelations = {
  id: string;
  name: string;
  type: "FOLDER" | "TRADING";
  description: string | null;
  isPinned: boolean;
  parent: {
    id: string;
    name: string;
  } | null;
  children: { id: string }[];
  syncSources: {
    marketType: "PERPETUAL" | "SPOT" | "FUTURES";
    initialSyncMode: "YESTERDAY" | "LAST_7_DAYS" | "CUSTOM_RANGE" | "OPEN_ONLY";
    symbolFilterMode: "ALL" | "INCLUDE" | "EXCLUDE";
    exchangeConnection: {
      accountName: string;
    };
    symbols: { symbol: string }[];
  }[];
};

type ExchangeConnectionOption = {
  id: string;
  accountName: string;
};

export default async function CollectionsPage() {
  const userId = await requireUserId();
  const [collections, exchangeConnections]: [
    CollectionWithRelations[],
    ExchangeConnectionOption[]
  ] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: collectionInclude
    }),
    prisma.exchangeConnection.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        accountName: true
      }
    })
  ]);
  const folders = collections
    .filter((collection) => collection.type === "FOLDER")
    .map((collection) => ({
      id: collection.id,
      name: collection.name
    }));

  return (
    <>
      <PageHeader
        title="Collections"
        description="Organize synced trades into folders and trading collections."
      />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Create collection</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Folders can contain children. Trading collections are leaf nodes and can have one active MVP sync source.
          </p>
          <div className="mt-5">
            <CollectionForm folders={folders} />
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Your collections</h2>
          {collections.length === 0 ? (
            <EmptyState
              title="No collections yet"
              description="Create a folder or trading collection to start organizing synced trades."
            />
          ) : (
            <div className="grid gap-3">
              {collections.map((collection) => {
                const activeSyncSource = collection.syncSources[0];
                const canDelete =
                  collection.children.length === 0 &&
                  collection.syncSources.length === 0;

                return (
                  <article
                    className="rounded-xl border border-border bg-surface p-4"
                    key={collection.id}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{collection.name}</h3>
                          <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
                            {collection.type === "FOLDER" ? "Folder" : "Trading"}
                          </span>
                          {collection.isPinned ? (
                            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">
                              Pinned
                            </span>
                          ) : null}
                          {collection.parent ? (
                            <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
                              In {collection.parent.name}
                            </span>
                          ) : null}
                        </div>
                        {collection.description ? (
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                            {collection.description}
                          </p>
                        ) : null}
                        {collection.type === "FOLDER" ? (
                          <p className="mt-2 text-xs text-muted">
                            Children: {collection.children.length}
                          </p>
                        ) : null}
                        {activeSyncSource ? (
                          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
                            <p className="font-medium">
                              Sync: {activeSyncSource.exchangeConnection.accountName}
                            </p>
                            <p className="mt-1 text-muted">
                              {activeSyncSource.marketType.toLowerCase()} -{" "}
                              {activeSyncSource.initialSyncMode.toLowerCase()} -{" "}
                              {activeSyncSource.symbolFilterMode.toLowerCase()}
                            </p>
                            {activeSyncSource.symbols.length > 0 ? (
                              <p className="mt-1 font-mono text-xs text-muted">
                                {activeSyncSource.symbols
                                  .map((symbol) => symbol.symbol)
                                  .join(", ")}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <form action={setCollectionPinnedAction}>
                          <input
                            name="collectionId"
                            type="hidden"
                            value={collection.id}
                          />
                          <input
                            name="isPinned"
                            type="hidden"
                            value={collection.isPinned ? "false" : "true"}
                          />
                          <button className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px">
                            {collection.isPinned ? "Unpin" : "Pin"}
                          </button>
                        </form>
                        <form action={deleteCollectionAction}>
                          <input
                            name="collectionId"
                            type="hidden"
                            value={collection.id}
                          />
                          <button
                            className="min-h-10 rounded-lg border border-danger/40 px-3 text-sm font-medium text-danger transition hover:bg-danger/10 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!canDelete}
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                    {collection.type === "TRADING" && !activeSyncSource ? (
                      <SyncSourceForm
                        collectionId={collection.id}
                        exchangeConnections={exchangeConnections}
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
