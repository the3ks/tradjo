import { NextResponse } from "next/server";

import {
  getRankedSuggestions,
  isSuggestionCategory
} from "@/lib/journal-suggestions";
import { requireUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await requireUserId();
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "";
  const query = url.searchParams.get("q") ?? "";

  if (!isSuggestionCategory(category)) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await getRankedSuggestions({
    category,
    query,
    userId
  });

  return NextResponse.json({ suggestions });
}
