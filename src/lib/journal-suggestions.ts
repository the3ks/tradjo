import { prisma } from "@/lib/prisma";

export const SUGGESTION_CATEGORIES = [
  "strategy",
  "setup",
  "emotion",
  "grade",
  "mistake_tag",
  "notes",
  "review"
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export function isSuggestionCategory(value: string): value is SuggestionCategory {
  return SUGGESTION_CATEGORIES.includes(value as SuggestionCategory);
}

export async function recordSuggestionValues(
  userId: string,
  values: Array<{ category: SuggestionCategory; value: string | null | undefined }>
) {
  const now = new Date();
  const normalized = values
    .map(({ category, value }) => ({
      category,
      value: normalizeSuggestionValue(value)
    }))
    .filter((entry): entry is { category: SuggestionCategory; value: string } =>
      Boolean(entry.value)
    );

  for (const entry of normalized) {
    await prisma.userSuggestionValue.upsert({
      where: {
        userId_category_value: {
          userId,
          category: entry.category,
          value: entry.value
        }
      },
      create: {
        userId,
        category: entry.category,
        value: entry.value,
        lastUsedAt: now
      },
      update: {
        frequency: { increment: 1 },
        lastUsedAt: now
      }
    });
  }
}

export async function getRankedSuggestions({
  category,
  query,
  userId
}: {
  category: SuggestionCategory;
  query: string;
  userId: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const candidates = await prisma.userSuggestionValue.findMany({
    where: {
      userId,
      category,
      ...(normalizedQuery
        ? {
            value: {
              contains: normalizedQuery
            }
          }
        : {})
    },
    orderBy: [{ frequency: "desc" }, { lastUsedAt: "desc" }],
    take: 30
  });

  return candidates
    .map((candidate) => ({
      ...candidate,
      rank: rankSuggestion(candidate.value, normalizedQuery)
    }))
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      if (left.frequency !== right.frequency) {
        return right.frequency - left.frequency;
      }

      return right.lastUsedAt.getTime() - left.lastUsedAt.getTime();
    })
    .slice(0, 8)
    .map((candidate) => candidate.value);
}

function rankSuggestion(value: string, query: string) {
  if (!query) {
    return 3;
  }

  const normalizedValue = value.toLowerCase();

  if (normalizedValue === query) {
    return 0;
  }

  if (normalizedValue.startsWith(query)) {
    return 1;
  }

  return 2;
}

function normalizeSuggestionValue(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 500);
}
