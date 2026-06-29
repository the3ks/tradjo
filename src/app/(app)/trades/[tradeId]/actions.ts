"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  recordSuggestionValues,
  type SuggestionCategory
} from "@/lib/journal-suggestions";
import { prisma } from "@/lib/prisma";
import {
  saveTradeScreenshotFile,
  type SavedTradeScreenshotFile
} from "@/lib/screenshot-storage";
import { requireUserId } from "@/lib/session";

export type JournalActionState = {
  error?: string;
  success?: string;
};

const journalSchema = z.object({
  tradeId: z.string().min(1),
  strategy: z.string().trim().max(120).optional(),
  setup: z.string().trim().max(160).optional(),
  entryTrigger: z.string().trim().max(240).optional(),
  exitReason: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(10000).optional(),
  emotion: z.string().trim().max(80).optional(),
  review: z.string().trim().max(10000).optional(),
  grade: z.string().trim().max(24).optional(),
  newMistakeTags: z.string().trim().max(500).optional(),
  newScreenshotCaption: z.string().trim().max(240).optional()
});

export async function saveTradeJournalAction(
  _state: JournalActionState,
  formData: FormData
): Promise<JournalActionState> {
  const userId = await requireUserId();
  const parsed = journalSchema.safeParse({
    tradeId: formData.get("tradeId"),
    strategy: formData.get("strategy") || undefined,
    setup: formData.get("setup") || undefined,
    entryTrigger: formData.get("entryTrigger") || undefined,
    exitReason: formData.get("exitReason") || undefined,
    notes: formData.get("notes") || undefined,
    emotion: formData.get("emotion") || undefined,
    review: formData.get("review") || undefined,
    grade: formData.get("grade") || undefined,
    newMistakeTags: formData.get("newMistakeTags") || undefined,
    newScreenshotCaption: formData.get("newScreenshotCaption") || undefined
  });

  if (!parsed.success) {
    return { error: "Check journal field lengths and try again." };
  }

  const trade = await prisma.trade.findFirst({
    where: {
      id: parsed.data.tradeId,
      userId
    },
    select: { id: true }
  });

  if (!trade) {
    return { error: "Trade was not found." };
  }

  try {
    const selectedTagIds = formData
      .getAll("mistakeTagIds")
      .map((value) => String(value))
      .filter(Boolean);
    const newTagNames = parseTagNames(parsed.data.newMistakeTags);
    const screenshotFiles = formData
      .getAll("screenshots")
      .filter((value): value is File => value instanceof File && value.size > 0);

    const savedFiles: SavedTradeScreenshotFile[] = [];

    for (const file of screenshotFiles) {
      const savedFile = await saveTradeScreenshotFile({
        file,
        tradeId: trade.id,
        userId
      });

      if (savedFile) {
        savedFiles.push(savedFile);
      }
    }

    await prisma.$transaction(async (tx) => {
      const journal = await tx.tradeJournal.upsert({
        where: { tradeId: trade.id },
        create: {
          userId,
          tradeId: trade.id,
          strategy: emptyToNull(parsed.data.strategy),
          setup: emptyToNull(parsed.data.setup),
          entryTrigger: emptyToNull(parsed.data.entryTrigger),
          exitReason: emptyToNull(parsed.data.exitReason),
          notes: emptyToNull(parsed.data.notes),
          emotion: emptyToNull(parsed.data.emotion),
          review: emptyToNull(parsed.data.review),
          grade: emptyToNull(parsed.data.grade)
        },
        update: {
          strategy: emptyToNull(parsed.data.strategy),
          setup: emptyToNull(parsed.data.setup),
          entryTrigger: emptyToNull(parsed.data.entryTrigger),
          exitReason: emptyToNull(parsed.data.exitReason),
          notes: emptyToNull(parsed.data.notes),
          emotion: emptyToNull(parsed.data.emotion),
          review: emptyToNull(parsed.data.review),
          grade: emptyToNull(parsed.data.grade)
        },
        select: { id: true }
      });

      for (const tagName of newTagNames) {
        await tx.tradeMistakeTag.upsert({
          where: {
            userId_name: {
              userId,
              name: tagName
            }
          },
          create: {
            userId,
            name: tagName
          },
          update: {}
        });
      }

      const tagFilters = [
        selectedTagIds.length > 0 ? { id: { in: selectedTagIds } } : null,
        newTagNames.length > 0 ? { name: { in: newTagNames } } : null
      ].filter((filter): filter is NonNullable<typeof filter> => filter !== null);
      const allSelectedTags =
        tagFilters.length > 0
          ? await tx.tradeMistakeTag.findMany({
              where: {
                userId,
                OR: tagFilters
              },
              select: {
                id: true,
                name: true
              }
            })
          : [];

      await tx.tradeJournalMistakeTag.deleteMany({
        where: { tradeJournalId: journal.id }
      });

      if (allSelectedTags.length > 0) {
        await tx.tradeJournalMistakeTag.createMany({
          data: allSelectedTags.map((tag) => ({
            tradeJournalId: journal.id,
            mistakeTagId: tag.id
          })),
          skipDuplicates: true
        });
      }

      for (const captionUpdate of parseCaptionUpdates(formData)) {
        await tx.tradeScreenshot.updateMany({
          where: {
            id: captionUpdate.id,
            userId,
            tradeId: trade.id
          },
          data: {
            caption: emptyToNull(captionUpdate.caption)
          }
        });
      }

      for (const savedFile of savedFiles) {
        await tx.tradeScreenshot.create({
          data: {
            userId,
            tradeId: trade.id,
            fileName: savedFile.fileName,
            originalName: savedFile.originalName,
            mimeType: savedFile.mimeType,
            sizeBytes: savedFile.sizeBytes,
            storagePath: savedFile.storagePath,
            caption: emptyToNull(parsed.data.newScreenshotCaption)
          }
        });
      }
    });

    await recordSuggestionValues(userId, [
      { category: "strategy", value: parsed.data.strategy },
      { category: "setup", value: parsed.data.setup },
      { category: "entry_trigger", value: parsed.data.entryTrigger },
      { category: "exit_reason", value: parsed.data.exitReason },
      { category: "emotion", value: parsed.data.emotion },
      { category: "grade", value: parsed.data.grade },
      { category: "notes", value: parsed.data.notes },
      { category: "review", value: parsed.data.review },
      ...newTagNames.map((value) => ({
        category: "mistake_tag" as SuggestionCategory,
        value
      }))
    ]);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save journal."
    };
  }

  revalidatePath(`/trades/${trade.id}`);
  revalidatePath("/trades");

  return { success: "Journal saved." };
}

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

function parseTagNames(value: string | undefined) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 80))
    )
  );
}

function parseCaptionUpdates(formData: FormData) {
  return formData
    .getAll("screenshotIds")
    .map((id) => String(id))
    .filter(Boolean)
    .map((id) => ({
      id,
      caption: String(formData.get(`screenshotCaption:${id}`) ?? "")
    }));
}
