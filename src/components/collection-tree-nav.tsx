"use client";

import {
  CaretDown,
  Folder,
  FolderOpen,
  FolderSimpleDashed,
  ListMagnifyingGlass
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export type CollectionNavItem = {
  id: string;
  isPinned: boolean;
  name: string;
  parentId: string | null;
  pinnedAt: Date | string | null;
  type: "FOLDER" | "TRADING";
};

type CollectionTreeNavProps = {
  collections: CollectionNavItem[];
  showPinned?: boolean;
};

type CollectionTreeLinksProps = {
  collections: CollectionNavItem[];
  emptyText?: string;
  onNavigate?: () => void;
};

type CollectionTreeNode = CollectionNavItem & {
  children: CollectionTreeNode[];
};

export function CollectionTreeNav({
  collections,
  showPinned = true
}: CollectionTreeNavProps) {
  const pinnedCollections = getPinnedCollections(collections);

  return (
    <section className="mt-6 border-t border-border pt-4">
      {showPinned && pinnedCollections.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted">
            Pinned
          </p>
          <PinnedCollectionLinks collections={pinnedCollections} />
        </div>
      ) : null}
      <div className="mb-2 flex items-center justify-between gap-2 px-3">
        <p className="text-xs font-semibold uppercase text-muted">Collections</p>
        <Link
          className="text-xs font-medium text-accent transition hover:text-foreground"
          href="/collections"
        >
          Manage
        </Link>
      </div>
      <CollectionTreeLinks collections={collections} />
    </section>
  );
}

export function PinnedCollectionNav({
  collections
}: {
  collections: CollectionNavItem[];
}) {
  const pinnedCollections = getPinnedCollections(collections);

  if (pinnedCollections.length === 0) {
    return null;
  }

  return (
    <section className="mb-5">
      <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted">
        Pinned Collections
      </p>
      <PinnedCollectionLinks collections={pinnedCollections} />
    </section>
  );
}

export function PinnedCollectionLinks({
  collections,
  onNavigate
}: {
  collections: CollectionNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCollectionId = searchParams.get("collectionId");

  if (collections.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Pinned collections" className="grid gap-1">
      {collections.map((collection) => {
        const isActive =
          pathname === "/trades" && activeCollectionId === collection.id;

        return (
          <Link
            className={cn(
              "flex min-h-9 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-muted transition hover:border-border hover:bg-surface-elevated hover:text-foreground active:translate-y-px",
              isActive && "border-border bg-surface-elevated text-foreground"
            )}
            href={`/trades?collectionId=${collection.id}`}
            key={collection.id}
            onClick={onNavigate}
          >
            <ListMagnifyingGlass aria-hidden="true" size={16} />
            <span className="truncate">{collection.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CollectionTreeLinks({
  collections,
  emptyText = "Create folders and trading collections to show them here.",
  onNavigate
}: CollectionTreeLinksProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCollectionId = searchParams.get("collectionId");
  const tree = buildCollectionTree(collections);

  if (tree.length === 0) {
    return <p className="px-3 text-xs leading-5 text-muted">{emptyText}</p>;
  }

  return (
    <nav aria-label="Collection shortcuts" className="grid gap-1">
      {tree.map((node) => (
        <CollectionNode
          activeCollectionId={activeCollectionId}
          key={node.id}
          node={node}
          onNavigate={onNavigate}
          pathname={pathname}
        />
      ))}
    </nav>
  );
}

function CollectionNode({
  activeCollectionId,
  node,
  onNavigate,
  pathname
}: {
  activeCollectionId: string | null;
  node: CollectionTreeNode;
  onNavigate?: () => void;
  pathname: string;
}) {
  if (node.type === "TRADING") {
    const isActive = pathname === "/trades" && activeCollectionId === node.id;

    return (
      <Link
        className={cn(
          "flex min-h-9 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-muted transition hover:border-border hover:bg-surface-elevated hover:text-foreground active:translate-y-px",
          isActive && "border-border bg-surface-elevated text-foreground"
        )}
        href={`/trades?collectionId=${node.id}`}
        onClick={onNavigate}
      >
        <ListMagnifyingGlass aria-hidden="true" size={16} />
        <span className="truncate">{node.name}</span>
      </Link>
    );
  }

  return (
    <details className="group" open>
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground">
        <CaretDown
          aria-hidden="true"
          className="transition group-open:rotate-0 -rotate-90"
          size={14}
        />
        <Folder
          aria-hidden="true"
          className="group-open:hidden"
          size={16}
        />
        <FolderOpen
          aria-hidden="true"
          className="hidden group-open:block"
          size={16}
        />
        <span className="truncate">{node.name}</span>
      </summary>
      <div className="ml-5 mt-1 grid gap-1 border-l border-border pl-2">
        {node.children.length > 0 ? (
          node.children.map((child) => (
            <CollectionNode
              activeCollectionId={activeCollectionId}
              key={child.id}
              node={child}
              onNavigate={onNavigate}
              pathname={pathname}
            />
          ))
        ) : (
          <div className="flex min-h-8 items-center gap-2 px-3 text-xs text-muted">
            <FolderSimpleDashed aria-hidden="true" size={14} />
            <span>No trading collections</span>
          </div>
        )}
      </div>
    </details>
  );
}

function buildCollectionTree(collections: CollectionNavItem[]) {
  const nodes = new Map<string, CollectionTreeNode>();
  const roots: CollectionTreeNode[] = [];

  for (const collection of collections) {
    nodes.set(collection.id, {
      ...collection,
      children: []
    });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortTree(roots);

  return roots;
}

export function getPinnedCollections(collections: CollectionNavItem[]) {
  return collections
    .filter(
      (collection) => collection.type === "TRADING" && collection.isPinned
    )
    .sort((left, right) => {
      const leftPinnedAt = left.pinnedAt ? new Date(left.pinnedAt).getTime() : 0;
      const rightPinnedAt = right.pinnedAt ? new Date(right.pinnedAt).getTime() : 0;

      if (leftPinnedAt !== rightPinnedAt) {
        return rightPinnedAt - leftPinnedAt;
      }

      return left.name.localeCompare(right.name);
    });
}

function sortTree(nodes: CollectionTreeNode[]) {
  nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "FOLDER" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  for (const node of nodes) {
    sortTree(node.children);
  }
}
