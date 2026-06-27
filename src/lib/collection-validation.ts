import type { CollectionType } from "@prisma/client";

type ParentCollection = {
  id: string;
  type: CollectionType;
  userId: string;
};

export function validateCollectionParent(
  parent: ParentCollection | null,
  userId: string
) {
  if (!parent) {
    return { ok: true as const };
  }

  if (parent.userId !== userId) {
    return {
      ok: false as const,
      message: "Parent collection was not found."
    };
  }

  if (parent.type !== "FOLDER") {
    return {
      ok: false as const,
      message: "Trading collections cannot contain child collections."
    };
  }

  return { ok: true as const };
}

export function validateSyncSourceCollection(type: CollectionType) {
  if (type !== "TRADING") {
    return {
      ok: false as const,
      message: "Only trading collections can have sync sources."
    };
  }

  return { ok: true as const };
}
