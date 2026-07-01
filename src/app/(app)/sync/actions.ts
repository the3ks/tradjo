"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { runBingXCollectionSync } from "@/lib/sync/collection-sync";

const forceResyncSchema = z.object({
  syncSourceId: z.string().min(1),
  from: z.string().date(),
  to: z.string().date()
});

export async function runCollectionSyncAction(formData: FormData) {
  const userId = await requireUserId();
  const syncSourceId = z.string().min(1).parse(formData.get("syncSourceId"));

  const syncSource = await prisma.collectionSyncSource.findFirst({
    where: {
      id: syncSourceId,
      userId,
      isActive: true
    },
    include: {
      collection: true,
      exchangeConnection: true,
      symbols: true,
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!syncSource || syncSource.collection.type !== "TRADING") {
    return;
  }

  const collectionPath = `/collections/${syncSource.collection.id}`;
  const now = new Date();
  const syncType = syncSource.initialSyncCompleted ? "INCREMENTAL" : "INITIAL";
  const log = await prisma.exchangeSyncLog.create({
    data: {
      userId,
      collectionSyncSourceId: syncSource.id,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      syncType,
      status: "RUNNING",
      startedAt: now
    }
  });

  try {
    const result = await runBingXCollectionSync(syncSource);

    await prisma.exchangeSyncLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        fetchedCount: result.fetchedCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount
      }
    });
  } catch (error) {
    await prisma.exchangeSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          error instanceof Error ? error.message : "Unknown sync failure."
      }
    });
  }

  revalidatePath("/sync");
  revalidatePath(collectionPath);
  revalidatePath("/trades");
}

export async function runForceResyncAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = forceResyncSchema.safeParse({
    syncSourceId: formData.get("syncSourceId"),
    from: formData.get("from"),
    to: formData.get("to")
  });

  if (!parsed.success) {
    return;
  }

  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

  if (from > to) {
    return;
  }

  const syncSource = await prisma.collectionSyncSource.findFirst({
    where: {
      id: parsed.data.syncSourceId,
      userId,
      isActive: true
    },
    include: {
      collection: true,
      exchangeConnection: true,
      symbols: true,
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!syncSource || syncSource.collection.type !== "TRADING") {
    return;
  }

  const collectionPath = `/collections/${syncSource.collection.id}`;
  const log = await prisma.exchangeSyncLog.create({
    data: {
      userId,
      collectionSyncSourceId: syncSource.id,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      syncType: "FORCE_RESYNC",
      status: "RUNNING",
      startedAt: new Date()
    }
  });

  try {
    const result = await runBingXCollectionSync(syncSource, {
      forceWindow: {
        from,
        to
      }
    });

    await prisma.exchangeSyncLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        fetchedCount: result.fetchedCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount
      }
    });
  } catch (error) {
    await prisma.exchangeSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          error instanceof Error ? error.message : "Unknown force resync failure."
      }
    });
  }

  revalidatePath("/sync");
  revalidatePath(collectionPath);
  revalidatePath("/trades");
}
