"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  validateCollectionParent,
  validateSyncSourceCollection
} from "@/lib/collection-validation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const createCollectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  type: z.enum(["FOLDER", "TRADING"]),
  parentId: z.string().trim().optional()
});

const syncSourceSchema = z.object({
  collectionId: z.string().min(1),
  exchangeConnectionId: z.string().min(1),
  marketType: z.enum(["PERPETUAL", "SPOT", "FUTURES"]),
  symbolFilterMode: z.enum(["ALL", "INCLUDE", "EXCLUDE"]),
  initialSyncMode: z.enum([
    "YESTERDAY",
    "LAST_7_DAYS",
    "CUSTOM_RANGE",
    "OPEN_ONLY"
  ]),
  symbols: z.string().trim().max(1000).optional()
});

export type CollectionActionState = {
  error?: string;
  success?: string;
};

export async function createCollectionAction(
  _state: CollectionActionState,
  formData: FormData
): Promise<CollectionActionState> {
  const userId = await requireUserId();
  const parsed = createCollectionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    parentId: formData.get("parentId") || undefined
  });

  if (!parsed.success) {
    return { error: "Enter a collection name and type." };
  }

  const parent = parsed.data.parentId
    ? await prisma.collection.findUnique({
        where: { id: parsed.data.parentId },
        select: {
          id: true,
          type: true,
          userId: true
        }
      })
    : null;
  const parentValidation = validateCollectionParent(parent, userId);

  if (!parentValidation.ok) {
    return { error: parentValidation.message };
  }

  await prisma.collection.create({
    data: {
      userId,
      parentId: parent?.id,
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type
    }
  });

  revalidatePath("/collections");

  return { success: "Collection created." };
}

export async function deleteCollectionAction(formData: FormData) {
  const userId = await requireUserId();
  const collectionId = z.string().min(1).parse(formData.get("collectionId"));

  const collection = await prisma.collection.findFirst({
    where: {
      id: collectionId,
      userId
    },
    include: {
      children: {
        select: { id: true }
      },
      syncSources: {
        select: { id: true }
      }
    }
  });

  if (!collection) {
    return;
  }

  if (collection.children.length > 0 || collection.syncSources.length > 0) {
    return;
  }

  await prisma.collection.delete({
    where: { id: collection.id }
  });

  revalidatePath("/collections");
}

export async function createSyncSourceAction(
  _state: CollectionActionState,
  formData: FormData
): Promise<CollectionActionState> {
  const userId = await requireUserId();
  const parsed = syncSourceSchema.safeParse({
    collectionId: formData.get("collectionId"),
    exchangeConnectionId: formData.get("exchangeConnectionId"),
    marketType: formData.get("marketType"),
    symbolFilterMode: formData.get("symbolFilterMode"),
    initialSyncMode: formData.get("initialSyncMode"),
    symbols: formData.get("symbols") || undefined
  });

  if (!parsed.success) {
    return { error: "Select a collection, exchange connection, and sync mode." };
  }

  const [collection, exchangeConnection] = await Promise.all([
    prisma.collection.findFirst({
      where: {
        id: parsed.data.collectionId,
        userId
      },
      include: {
        syncSources: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    }),
    prisma.exchangeConnection.findFirst({
      where: {
        id: parsed.data.exchangeConnectionId,
        userId,
        isActive: true,
        deletedAt: null
      }
    })
  ]);

  if (!collection) {
    return { error: "Collection was not found." };
  }

  const collectionValidation = validateSyncSourceCollection(collection.type);

  if (!collectionValidation.ok) {
    return { error: collectionValidation.message };
  }

  if (collection.syncSources.length > 0) {
    return { error: "This trading collection already has an active sync source." };
  }

  if (!exchangeConnection) {
    return { error: "Select an active exchange connection." };
  }

  const symbols = parseSymbols(parsed.data.symbols);

  await prisma.collectionSyncSource.create({
    data: {
      userId,
      collectionId: collection.id,
      exchangeConnectionId: exchangeConnection.id,
      marketType: parsed.data.marketType,
      symbolFilterMode: parsed.data.symbolFilterMode,
      initialSyncMode: parsed.data.initialSyncMode,
      symbols: {
        create:
          parsed.data.symbolFilterMode === "ALL"
            ? []
            : symbols.map((symbol) => ({
                symbol,
                mode: parsed.data.symbolFilterMode
              }))
      }
    }
  });

  revalidatePath("/collections");

  return { success: "Sync source configured." };
}

function parseSymbols(value: string | undefined) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}
