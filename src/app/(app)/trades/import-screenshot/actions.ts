"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  extractTradeDraftWithGemini,
  extractedTradeDraftsSchema,
  type ExtractedTradeDraft
} from "@/lib/trade-screenshot-extraction";
import { parseBingXTableText } from "@/lib/bingx-table-text-parser";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-crypto";
import { requireUserId } from "@/lib/session";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImportBytes = 5 * 1024 * 1024;
const importContextSchema = z.object({
  collectionId: z.string().trim().optional()
});
const saveScreenshotTradeSchema = z.object({
  collectionId: z.string().trim().min(1),
  draftJson: z.string().trim().min(1)
});
const parseBingXTableTextSchema = z.object({
  collectionId: z.string().trim().optional(),
  tableText: z.string().trim().min(1)
});

export type ScreenshotImportActionState = {
  error?: string;
  existingTradeMatches?: ExistingTradeMatch[];
  drafts?: ExtractedTradeDraft[];
  targetCollection?: {
    id: string;
    name: string;
  };
};

export type ExistingTradeMatch = {
  kind: "EXACT_TRADE" | "OPEN_TRADE_CANDIDATE" | "NONE";
  tradeId?: string;
  message: string;
};

export type SaveScreenshotTradeActionState = {
  error?: string;
  success?: string;
  tradeIds?: string[];
};

export async function parseBingXTableTextAction(
  _state: ScreenshotImportActionState,
  formData: FormData
): Promise<ScreenshotImportActionState> {
  const userId = await requireUserId();
  const parsed = parseBingXTableTextSchema.safeParse({
    collectionId: formData.get("collectionId") || undefined,
    tableText: formData.get("tableText")
  });

  if (!parsed.success) {
    return { error: "Paste BingX table text before parsing." };
  }

  try {
    const targetCollection = parsed.data.collectionId
      ? await prisma.collection.findFirst({
          where: {
            id: parsed.data.collectionId,
            userId,
            type: "TRADING"
          },
          select: {
            id: true,
            name: true
          }
        })
      : null;

    if (parsed.data.collectionId && !targetCollection) {
      return { error: "The selected trading collection was not found." };
    }

    const drafts = parseBingXTableText(parsed.data.tableText);

    if (drafts.length === 0) {
      return {
        error:
          "No BingX futures trades were found. Paste the copied open or closed trades table text."
      };
    }

    const existingTradeMatches = targetCollection
      ? await Promise.all(
          drafts.map((draft) =>
            findExistingTradeMatch({
              collectionId: targetCollection.id,
              draft,
              userId
            })
          )
        )
      : undefined;

    return {
      drafts,
      existingTradeMatches,
      targetCollection: targetCollection ?? undefined
    };
  } catch {
    return {
      error:
        "Could not parse the BingX table text. Keep the copied row order from the open or closed trades table."
    };
  }
}

export async function extractScreenshotTradeAction(
  _state: ScreenshotImportActionState,
  formData: FormData
): Promise<ScreenshotImportActionState> {
  const userId = await requireUserId();
  const files = formData
    .getAll("screenshots")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const context = importContextSchema.parse({
    collectionId: formData.get("collectionId") || undefined
  });

  if (files.length === 0) {
    return { error: "Choose at least one screenshot to extract." };
  }

  for (const file of files) {
    if (!allowedImageTypes.has(file.type)) {
      return { error: "Use JPG, PNG, or WebP screenshots." };
    }

    if (file.size > maxImportBytes) {
      return { error: "Each screenshot must be 5MB or smaller." };
    }
  }

  const credential = await prisma.userAiCredential.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "GEMINI"
      }
    }
  });

  if (!credential) {
    return { error: "Add your Gemini API key in Settings before importing screenshots." };
  }

  try {
    const targetCollection = context.collectionId
      ? await prisma.collection.findFirst({
          where: {
            id: context.collectionId,
            userId,
            type: "TRADING"
          },
          select: {
            id: true,
            name: true
          }
        })
      : null;

    if (context.collectionId && !targetCollection) {
      return { error: "The selected trading collection was not found." };
    }

    const apiKey = decryptSecret(
      credential.apiKeyEncrypted,
      getEnv().ENCRYPTION_KEY
    );
    const extractedDraftGroups = await Promise.all(
      files.map(async (file) => {
        const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");

        return extractTradeDraftWithGemini({
          apiKey,
          imageBase64,
          mimeType: file.type
        });
      })
    );
    const drafts = extractedDraftGroups.flat();
    const existingTradeMatches = targetCollection
      ? await Promise.all(
          drafts.map((draft) =>
            findExistingTradeMatch({
              collectionId: targetCollection.id,
              draft,
              userId
            })
          )
        )
      : undefined;

    return {
      drafts,
      existingTradeMatches,
      targetCollection: targetCollection ?? undefined
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: "Gemini returned an unexpected extraction format. Try another screenshot."
      };
    }

    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not extract trade details from this screenshot."
    };
  }
}

export async function saveScreenshotTradeAction(
  _state: SaveScreenshotTradeActionState,
  formData: FormData
): Promise<SaveScreenshotTradeActionState> {
  const userId = await requireUserId();
  const parsed = saveScreenshotTradeSchema.safeParse({
    collectionId: formData.get("collectionId"),
    draftJson: formData.get("draftJson")
  });

  if (!parsed.success) {
    return { error: "Choose a collection and provide extracted JSON." };
  }

  let drafts: ExtractedTradeDraft[];

  try {
    drafts = extractedTradeDraftsSchema.parse(JSON.parse(parsed.data.draftJson));
  } catch {
    return { error: "Trade JSON is not valid. Fix the JSON and try again." };
  }

  if (drafts.length === 0) {
    return { error: "At least one trade JSON object is required." };
  }

  const collection = await prisma.collection.findFirst({
    where: {
      id: parsed.data.collectionId,
      userId,
      type: "TRADING"
    },
    include: {
      syncSources: {
        where: { isActive: true },
        select: {
          id: true,
          exchangeConnectionId: true
        },
        take: 1
      }
    }
  });

  if (!collection) {
    return { error: "Trading collection was not found." };
  }

  const syncSource = collection.syncSources[0];

  if (!syncSource) {
    return { error: "Configure a sync source for this collection before saving screenshot trades." };
  }

  const tradeIds: string[] = [];
  let updatedOpenCount = 0;

  for (const draft of drafts) {
    if (draft.screenType === "UNKNOWN") {
      return { error: "Remove UNKNOWN items before saving trades." };
    }

    if (!draft.symbol) {
      return { error: "Every trade needs a symbol before saving." };
    }

    const result = await saveSingleScreenshotDraft({
      collectionId: collection.id,
      draft,
      exchangeConnectionId: syncSource.exchangeConnectionId,
      syncSourceId: syncSource.id,
      userId
    });

    tradeIds.push(result.tradeId);

    if (result.updatedOpenTrade) {
      updatedOpenCount += 1;
    }
  }

  revalidatePath(`/collections/${collection.id}`);
  revalidatePath("/trades");

  for (const tradeId of tradeIds) {
    revalidatePath(`/trades/${tradeId}`);
  }

  return {
    success:
      tradeIds.length === 1
        ? updatedOpenCount > 0
          ? "Existing open trade updated from closed screenshot."
          : "Trade saved."
        : `${tradeIds.length} trades saved${updatedOpenCount > 0 ? `, including ${updatedOpenCount} open trade update${updatedOpenCount === 1 ? "" : "s"}` : ""}.`,
    tradeIds
  };
}

async function saveSingleScreenshotDraft({
  collectionId,
  draft,
  exchangeConnectionId,
  syncSourceId,
  userId
}: {
  collectionId: string;
  draft: ExtractedTradeDraft;
  exchangeConnectionId: string;
  syncSourceId: string;
  userId: string;
}) {
  const values = mapDraftToTradeValues({
    collectionId,
    draft,
    exchangeConnectionId,
    syncSourceId,
    userId
  });
  const matchingOpenTrade =
    draft.screenType === "CLOSED_TRADE"
      ? await findMatchingOpenTrade({
          collectionId,
          draft,
          userId
        })
      : null;
  const trade = matchingOpenTrade
    ? await prisma.trade.update({
        where: { id: matchingOpenTrade.id },
        data: values.update,
        select: { id: true }
      })
    : await prisma.trade.upsert({
        where: {
          collectionId_externalTradeId: {
            collectionId,
            externalTradeId: values.externalTradeId
          }
        },
        create: values.create,
        update: values.update,
        select: { id: true }
      });

  return {
    tradeId: trade.id,
    updatedOpenTrade: Boolean(matchingOpenTrade)
  };
}

async function findExistingTradeMatch({
  collectionId,
  draft,
  userId
}: {
  collectionId: string;
  draft: ExtractedTradeDraft;
  userId: string;
}): Promise<ExistingTradeMatch> {
  const sourceRecordId = draft.orderNo;

  if (sourceRecordId) {
    const exactTrade = await prisma.trade.findFirst({
      where: {
        collectionId,
        userId,
        externalTradeId: {
          in: [
            `BINGX_SCREENSHOT:${sourceRecordId}`,
            `FUTURES:${sourceRecordId}`
          ]
        }
      },
      select: {
        id: true,
        status: true,
        symbol: true
      }
    });

    if (exactTrade) {
      return {
        kind: "EXACT_TRADE",
        tradeId: exactTrade.id,
        message: `Existing ${exactTrade.status.toLowerCase()} trade found for ${exactTrade.symbol}. Saving will update it.`
      };
    }
  }

  const openTradeCandidate =
    draft.screenType === "CLOSED_TRADE"
      ? await findMatchingOpenTrade({
          collectionId,
          draft,
          userId
        })
      : null;

  if (openTradeCandidate) {
    return {
      kind: "OPEN_TRADE_CANDIDATE",
      tradeId: openTradeCandidate.id,
      message: "Matching open trade found. Saving will update that trade as closed."
    };
  }

  return {
    kind: "NONE",
    message: sourceRecordId
      ? "No existing trade found. Saving will create a new trade."
      : "No order number was extracted, so no exact match was found. Saving will create a new trade unless a closed trade matches an open one."
  };
}

function mapDraftToTradeValues({
  collectionId,
  draft,
  exchangeConnectionId,
  syncSourceId,
  userId
}: {
  collectionId: string;
  draft: ExtractedTradeDraft;
  exchangeConnectionId: string;
  syncSourceId: string;
  userId: string;
}) {
  const status = draft.screenType === "CLOSED_TRADE" ? ("CLOSED" as const) : ("OPEN" as const);
  const grossPnl = decimalOrNull(
    draft.realizedPnl ?? draft.unrealizedPnl
  );
  const tradingFee = decimalOrNull(draft.tradingFee);
  const fundingFee = decimalOrNull(draft.fundingFee);
  const netPnl =
    draft.screenType === "CLOSED_TRADE"
      ? sumDecimals(grossPnl, negateDecimal(tradingFee), negateDecimal(fundingFee))
      : null;
  const sourceRecordId = draft.orderNo ?? `screenshot-${Date.now()}`;
  const externalTradeId = `BINGX_SCREENSHOT:${sourceRecordId}`;
  const openedAt = parseScreenshotDate(draft.openTime ?? draft.screenshotTime);
  const closedAt = parseScreenshotDate(draft.closeTime);
  const update = {
    collectionSyncSourceId: syncSourceId,
    exchangeConnectionId,
    sourceRecordType: "SCREENSHOT",
    sourceRecordId,
    symbol: draft.symbol ?? "",
    marketType: "FUTURES" as const,
    side: draft.side,
    status,
    quantity: decimalOrNull(draft.positionSize),
    entryPrice: decimalOrNull(draft.entryPrice),
    exitPrice: decimalOrNull(draft.closePrice ?? draft.currentPrice),
    grossPnl,
    tradingFee,
    fundingFee,
    netPnl,
    openedAt,
    closedAt,
    settledAt: null,
    rawSummary: {
      source: "SCREENSHOT_IMPORT",
      extracted: draft
    } as Prisma.InputJsonValue
  };

  return {
    externalTradeId,
    create: {
      userId,
      collectionId,
      externalTradeId,
      ...update
    },
    update
  };
}

async function findMatchingOpenTrade({
  collectionId,
  draft,
  userId
}: {
  collectionId: string;
  draft: ExtractedTradeDraft;
  userId: string;
}) {
  if (!draft.symbol) {
    return null;
  }

  const candidates = await prisma.trade.findMany({
    where: {
      collectionId,
      userId,
      symbol: draft.symbol,
      marketType: "FUTURES",
      status: "OPEN",
      side: draft.side
    },
    select: {
      id: true,
      entryPrice: true,
      quantity: true
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  return (
    candidates.find(
      (trade) =>
        decimalNear(trade.entryPrice, draft.entryPrice) &&
        decimalNear(trade.quantity, draft.positionSize)
    ) ?? candidates[0] ?? null
  );
}

function decimalOrNull(value: number | null | undefined) {
  return value === null || value === undefined
    ? null
    : new Prisma.Decimal(value.toString());
}

function negateDecimal(value: Prisma.Decimal | null) {
  return value ? value.negated() : null;
}

function sumDecimals(...values: Array<Prisma.Decimal | null>) {
  return values.reduce<Prisma.Decimal | null>(
    (sum, value) => (value ? (sum ? sum.add(value) : value) : sum),
    null
  );
}

function decimalNear(
  value: Prisma.Decimal | null,
  target: number | null | undefined
) {
  if (!value || target === null || target === undefined) {
    return true;
  }

  return value.minus(new Prisma.Decimal(target.toString())).abs().lte(0.00000001);
}

function parseScreenshotDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const monthDayTime = normalized.match(
    /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (monthDayTime) {
    const [, month, day, hour, minute, second = "0"] = monthDayTime;
    return new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    );
  }

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
