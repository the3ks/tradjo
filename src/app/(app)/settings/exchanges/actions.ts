"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { BingXClient } from "@/lib/bingx/client";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { requireUserId } from "@/lib/session";

const exchangeConnectionSchema = z.object({
  accountName: z.string().trim().min(1).max(80),
  apiKey: z.string().trim().min(1).max(500),
  apiSecret: z.string().trim().min(1).max(500)
});

export type ExchangeConnectionActionState = {
  error?: string;
  success?: string;
};

export async function createExchangeConnectionAction(
  _state: ExchangeConnectionActionState,
  formData: FormData
): Promise<ExchangeConnectionActionState> {
  const userId = await requireUserId();
  const parsed = exchangeConnectionSchema.safeParse({
    accountName: formData.get("accountName"),
    apiKey: formData.get("apiKey"),
    apiSecret: formData.get("apiSecret")
  });

  if (!parsed.success) {
    return { error: "Enter an account name, API key, and API secret." };
  }

  const env = getEnv();

  await prisma.exchangeConnection.create({
    data: {
      userId,
      exchangeName: "BINGX",
      accountName: parsed.data.accountName,
      apiKeyEncrypted: encryptSecret(parsed.data.apiKey, env.ENCRYPTION_KEY),
      apiSecretEncrypted: encryptSecret(
        parsed.data.apiSecret,
        env.ENCRYPTION_KEY
      )
    }
  });

  revalidatePath("/settings/exchanges");

  return { success: "Exchange connection saved." };
}

export async function setExchangeConnectionActiveAction(formData: FormData) {
  const userId = await requireUserId();
  const connectionId = z.string().min(1).parse(formData.get("connectionId"));
  const isActive = formData.get("isActive") === "true";

  await prisma.exchangeConnection.updateMany({
    where: {
      id: connectionId,
      userId
    },
    data: { isActive }
  });

  revalidatePath("/settings/exchanges");
}

export async function deleteExchangeConnectionAction(formData: FormData) {
  const userId = await requireUserId();
  const connectionId = z.string().min(1).parse(formData.get("connectionId"));

  const connection = await prisma.exchangeConnection.findFirst({
    where: {
      id: connectionId,
      userId
    },
    include: {
      syncSources: {
        select: { id: true }
      }
    }
  });

  if (!connection) {
    return;
  }

  if (connection.syncSources.length > 0) {
    await prisma.exchangeConnection.update({
      where: { id: connection.id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });
  } else {
    await prisma.exchangeConnection.delete({
      where: { id: connection.id }
    });
  }

  revalidatePath("/settings/exchanges");
}

export async function testExchangeConnectionAction(formData: FormData) {
  const userId = await requireUserId();
  const connectionId = z.string().min(1).parse(formData.get("connectionId"));
  const connection = await prisma.exchangeConnection.findFirst({
    where: {
      id: connectionId,
      userId,
      deletedAt: null
    }
  });

  if (!connection) {
    return;
  }

  const env = getEnv();
  const client = new BingXClient({
    baseUrl: env.BINGX_BASE_URL,
    apiKey: decryptSecret(connection.apiKeyEncrypted, env.ENCRYPTION_KEY),
    apiSecret: decryptSecret(connection.apiSecretEncrypted, env.ENCRYPTION_KEY)
  });
  const log = await prisma.exchangeSyncLog.create({
    data: {
      userId,
      exchangeConnectionId: connection.id,
      syncType: "RECENT_REFRESH",
      status: "RUNNING",
      startedAt: new Date()
    }
  });

  try {
    await client.testConnection();
    await prisma.exchangeSyncLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.exchangeSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          error instanceof Error ? error.message : "Unknown connection test failure."
      }
    });
  }

  revalidatePath("/settings/exchanges");
  revalidatePath("/sync");
}
