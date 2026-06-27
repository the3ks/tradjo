"use client";

import { Folder, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import {
  CollectionTreeLinks,
  PinnedCollectionLinks,
  getPinnedCollections,
  type CollectionNavItem
} from "@/components/collection-tree-nav";

type MobileCollectionDrawerProps = {
  collections: CollectionNavItem[];
};

export function MobileCollectionDrawer({
  collections
}: MobileCollectionDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pinnedCollections = getPinnedCollections(collections);

  function close() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        aria-label="Open collections"
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Folder aria-hidden="true" size={20} />
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close collections"
            className="absolute inset-0 bg-black/35"
            onClick={close}
            type="button"
          />
          <section className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Collections</h2>
                <p className="text-xs text-muted">Jump to a filtered trade list.</p>
              </div>
              <button
                aria-label="Close collections"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px"
                onClick={close}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="max-h-[calc(82dvh-118px)] overflow-y-auto px-3 py-3">
              {pinnedCollections.length > 0 ? (
                <div className="mb-4">
                  <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted">
                    Pinned
                  </p>
                  <PinnedCollectionLinks
                    collections={pinnedCollections}
                    onNavigate={close}
                  />
                </div>
              ) : null}
              <CollectionTreeLinks
                collections={collections}
                emptyText="Create collections first, then they will appear here."
                onNavigate={close}
              />
            </div>
            <div className="border-t border-border px-4 py-3">
              <Link
                className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px"
                href="/collections"
                onClick={close}
              >
                Manage collections
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
