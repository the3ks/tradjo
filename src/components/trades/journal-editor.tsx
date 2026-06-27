"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";

import {
  saveTradeJournalAction,
  type JournalActionState
} from "@/app/(app)/trades/[tradeId]/actions";
import { SuggestionField } from "@/components/trades/suggestion-field";

type JournalEditorProps = {
  allTags: Array<{
    id: string;
    name: string;
  }>;
  journal: {
    strategy: string | null;
    setup: string | null;
    notes: string | null;
    emotion: string | null;
    review: string | null;
    grade: string | null;
    mistakeTagIds: string[];
  } | null;
  screenshots: Array<{
    id: string;
    caption: string | null;
    originalName: string;
  }>;
  tradeId: string;
};

const initialState: JournalActionState = {};

export function JournalEditor({
  allTags,
  journal,
  screenshots,
  tradeId
}: JournalEditorProps) {
  const [state, formAction] = useActionState(
    saveTradeJournalAction,
    initialState
  );
  const selectedTagIds = new Set(journal?.mistakeTagIds ?? []);

  return (
    <form
      action={formAction}
      className="grid gap-5"
      encType="multipart/form-data"
    >
      <input name="tradeId" type="hidden" value={tradeId} />

      <div className="grid gap-4 md:grid-cols-2">
        <SuggestionField
          category="strategy"
          defaultValue={journal?.strategy}
          label="Strategy"
          maxLength={120}
          name="strategy"
          placeholder="Breakout, reversal, trend follow..."
        />
        <SuggestionField
          category="setup"
          defaultValue={journal?.setup}
          label="Setup"
          maxLength={160}
          name="setup"
          placeholder="Liquidity sweep, pullback, news reaction..."
        />
        <SuggestionField
          category="emotion"
          defaultValue={journal?.emotion}
          label="Emotion"
          maxLength={80}
          name="emotion"
          placeholder="Calm, rushed, revenge, patient..."
        />
        <SuggestionField
          category="grade"
          defaultValue={journal?.grade}
          label="Trade grade"
          maxLength={24}
          name="grade"
          placeholder="A, B+, C..."
        />
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Mistake tags</legend>
        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <label
                className="has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-foreground rounded-full border border-border px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-elevated"
                key={tag.id}
              >
                <input
                  className="sr-only"
                  defaultChecked={selectedTagIds.has(tag.id)}
                  name="mistakeTagIds"
                  type="checkbox"
                  value={tag.id}
                />
                {tag.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            No mistake tags yet. Add one below and it will be saved for future trades.
          </p>
        )}
        <SuggestionField
          category="mistake_tag"
          label="Create tags"
          maxLength={500}
          name="newMistakeTags"
          placeholder="FOMO, late entry, moved stop..."
        />
      </fieldset>

      <SuggestionField
        category="notes"
        defaultValue={journal?.notes}
        label="Notes"
        maxLength={10000}
        multiline
        name="notes"
        placeholder="Why did you take this trade? What mattered at entry?"
      />

      <SuggestionField
        category="review"
        defaultValue={journal?.review}
        label="Review"
        maxLength={10000}
        multiline
        name="review"
        placeholder="What should you repeat or avoid next time?"
      />

      <section className="grid gap-3">
        <h3 className="text-sm font-medium">Screenshots</h3>
        {screenshots.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {screenshots.map((screenshot) => (
              <div
                className="overflow-hidden rounded-lg border border-border bg-background"
                key={screenshot.id}
              >
                <div className="relative aspect-video w-full">
                  <Image
                    alt={screenshot.caption ?? screenshot.originalName}
                    className="object-cover"
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    src={`/api/trade-screenshots/${screenshot.id}`}
                    unoptimized
                  />
                </div>
                <div className="grid gap-2 p-3">
                  <input name="screenshotIds" type="hidden" value={screenshot.id} />
                  <label className="grid gap-1 text-xs font-medium text-muted">
                    Caption
                    <input
                      className="min-h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-accent"
                      defaultValue={screenshot.caption ?? ""}
                      maxLength={240}
                      name={`screenshotCaption:${screenshot.id}`}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Add chart screenshots or exchange screenshots that explain the trade.
          </p>
        )}

        <div className="grid gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-[1fr_1fr]">
          <label className="grid gap-2 text-sm font-medium">
            Upload screenshots
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
              multiple
              name="screenshots"
              type="file"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            New screenshot caption
            <input
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-accent"
              maxLength={240}
              name="newScreenshotCaption"
              placeholder="Entry context, exit reason..."
            />
          </label>
        </div>
      </section>

      {state.error ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-profit/40 bg-profit/10 px-3 py-2 text-sm text-profit">
          {state.success}
        </p>
      ) : null}

      <div className="sticky bottom-20 z-10 border-t border-border bg-surface/95 py-3 backdrop-blur lg:static lg:border-t-0 lg:bg-transparent lg:py-0">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving journal..." : "Save journal"}
    </button>
  );
}
