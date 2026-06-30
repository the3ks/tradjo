"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  extractScreenshotTradeAction,
  parseBingXTableTextAction,
  saveScreenshotTradeAction,
  type ScreenshotImportActionState
} from "@/app/(app)/trades/import-screenshot/actions";

const initialState: ScreenshotImportActionState = {};

export function ScreenshotImporter({
  collectionId,
  collectionName,
  defaultOpen = true,
  hasGeminiKey
}: {
  collectionId?: string;
  collectionName?: string;
  defaultOpen?: boolean;
  hasGeminiKey: boolean;
}) {
  const [screenshotState, formAction] = useActionState(
    extractScreenshotTradeAction,
    initialState
  );
  const [tableTextState, tableTextAction] = useActionState(
    parseBingXTableTextAction,
    initialState
  );
  const [lastImportSource, setLastImportSource] = useState<
    "screenshot" | "tableText" | null
  >(null);
  const activeState =
    lastImportSource === "tableText" ? tableTextState : screenshotState.drafts ? screenshotState : tableTextState;
  const activeSource =
    lastImportSource === "tableText" && tableTextState.drafts
      ? "pasted table text"
      : screenshotState.drafts
        ? "uploaded screenshot"
        : tableTextState.drafts
          ? "pasted table text"
          : undefined;

  return (
    <div className="grid gap-5">
      <details
        className="overflow-hidden rounded-xl border border-border bg-surface"
        open={activeState.drafts ? false : defaultOpen}
      >
        <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
          Upload screenshot
        </summary>
        <form
          action={formAction}
          className="grid gap-4 border-t border-border p-5"
          onSubmit={() => setLastImportSource("screenshot")}
        >
          <div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Supports multiple BingX Standard Futures screenshots. A single screenshot can contain more than one trade.
            </p>
            {collectionName ? (
              <p className="mt-2 text-sm font-medium text-foreground">
                Target collection: {collectionName}
              </p>
            ) : null}
          </div>
          {collectionId ? (
            <input name="collectionId" type="hidden" value={collectionId} />
          ) : null}
          <label className="grid gap-2 text-sm font-medium">
            Screenshots
            <input
              accept="image/jpeg,image/png,image/webp"
              className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              disabled={!hasGeminiKey}
              multiple
              name="screenshots"
              required
              type="file"
            />
          </label>
          {!hasGeminiKey ? (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Add your Gemini API key in Settings before importing screenshots.
            </p>
          ) : null}
          {screenshotState.error ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {screenshotState.error}
            </p>
          ) : null}
          <SubmitButton disabled={!hasGeminiKey} />
        </form>
      </details>

      <BingXTableTextImporter
        action={tableTextAction}
        collectionId={collectionId}
        collectionName={collectionName}
        hasDrafts={Boolean(activeState.drafts)}
        onSubmit={() => setLastImportSource("tableText")}
        state={tableTextState}
      />

      <DirectJsonTradeEditor
        collectionId={collectionId}
        collectionName={collectionName}
        drafts={activeState.drafts}
        existingTradeMatches={activeState.existingTradeMatches}
        sourceLabel={activeSource}
        targetCollection={activeState.targetCollection}
      />
    </div>
  );
}

function BingXTableTextImporter({
  action,
  collectionId,
  collectionName,
  hasDrafts,
  onSubmit,
  state
}: {
  action: (payload: FormData) => void;
  collectionId?: string;
  collectionName?: string;
  hasDrafts: boolean;
  onSubmit: () => void;
  state: ScreenshotImportActionState;
}) {
  return (
    <details
      className="overflow-hidden rounded-xl border border-border bg-surface"
      open={hasDrafts ? false : undefined}
    >
      <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
        Paste BingX table text
      </summary>
      <form
        action={action}
        className="grid gap-4 border-t border-border p-5"
        onSubmit={onSubmit}
      >
        <div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Paste copied BingX open or closed futures table text. Header rows are optional; if they are missing, the parser uses the open/closed column order from your samples.
          </p>
          {collectionName ? (
            <p className="mt-2 text-sm font-medium text-foreground">
              Target collection: {collectionName}
            </p>
          ) : null}
        </div>
        {collectionId ? (
          <input name="collectionId" type="hidden" value={collectionId} />
        ) : null}
        <label className="grid gap-2 text-sm font-medium">
          Table text
          <textarea
            className="min-h-64 rounded-lg border border-border bg-background p-3 font-mono text-xs leading-5 text-foreground outline-none transition focus:border-accent"
            name="tableText"
            placeholder="Paste BingX copied table text here..."
            spellCheck={false}
          />
        </label>
        {state.error ? (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        <ParseButton />
      </form>
    </details>
  );
}

function DirectJsonTradeEditor({
  collectionId,
  collectionName,
  drafts,
  existingTradeMatches,
  sourceLabel,
  targetCollection
}: {
  collectionId?: string;
  collectionName?: string;
  drafts?: ScreenshotImportActionState["drafts"];
  existingTradeMatches?: ScreenshotImportActionState["existingTradeMatches"];
  sourceLabel?: string;
  targetCollection?: ScreenshotImportActionState["targetCollection"];
}) {
  const [saveState, saveAction] = useActionState(saveScreenshotTradeAction, {});
  const jsonValue = drafts ? JSON.stringify(drafts, null, 2) : defaultDraftJson;

  return (
    <details
      className="overflow-hidden rounded-xl border border-border bg-surface"
      open={Boolean(drafts)}
    >
      <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
        Input raw JSON
      </summary>
      <form action={saveAction} className="grid gap-4 border-t border-border p-5">
        <div>
          {drafts ? (
            <p className="max-w-2xl rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm leading-6 text-accent">
              Parsed JSON from {sourceLabel ?? "the import source"} has been loaded here as {drafts.length === 1 ? "1 trade" : `${drafts.length} trades`}. Edit the JSON if needed, then save this exact content.
            </p>
          ) : (
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Paste or edit one trade JSON object or an array of trade JSON objects, then save them into this collection.
            </p>
          )}
          {targetCollection ?? collectionName ? (
            <p className="mt-2 text-sm font-medium text-foreground">
              Target collection: {targetCollection?.name ?? collectionName}
            </p>
          ) : null}
        </div>
        {existingTradeMatches?.length ? (
          <div className="grid gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {existingTradeMatches.map((match, index) => (
              <div key={`${match.kind}-${match.tradeId ?? index}`}>
                <p className="font-semibold">
                  Trade {index + 1}: {matchLabel(match.kind)}
                </p>
                <p className="mt-1 text-muted">{match.message}</p>
              </div>
            ))}
          </div>
        ) : null}
        {collectionId ? (
          <input name="collectionId" type="hidden" value={collectionId} />
        ) : null}
        <label className="grid gap-2 text-sm font-medium">
          Raw JSON
          <textarea
            className="min-h-96 rounded-lg border border-border bg-background p-3 font-mono text-xs leading-5 text-foreground outline-none transition focus:border-accent"
            defaultValue={jsonValue}
            key={jsonValue}
            name="draftJson"
            spellCheck={false}
          />
        </label>
        {!collectionId ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            Open a trading collection to save this trade.
          </p>
        ) : null}
        {saveState.error ? (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {saveState.error}
          </p>
        ) : null}
        {saveState.success ? (
          <p className="rounded-lg border border-profit/40 bg-profit/10 px-3 py-2 text-sm text-profit">
            {saveState.success}
          </p>
        ) : null}
        <SaveButton disabled={!collectionId} />
      </form>
    </details>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 w-fit rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Extracting..." : "Extract trade details"}
    </button>
  );
}

function ParseButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 w-fit rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Parsing..." : "Parse table text"}
    </button>
  );
}

function matchLabel(
  kind: NonNullable<ScreenshotImportActionState["existingTradeMatches"]>[number]["kind"]
) {
  switch (kind) {
    case "EXACT_TRADE":
      return "Existing trade";
    case "OPEN_TRADE_CANDIDATE":
      return "Open trade match";
    case "NONE":
      return "New trade";
  }
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 w-fit rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Saving trade..." : "Save trade"}
    </button>
  );
}

const defaultDraftJson = JSON.stringify(
  [
    {
      screenType: "OPEN_POSITION",
      exchange: "BINGX",
      marketType: "FUTURES",
      symbol: "BTCUSDT",
      side: "LONG",
      marginMode: "ISOLATED",
      leverage: null,
      entryPrice: null,
      currentPrice: null,
      closePrice: null,
      positionSize: null,
      positionUnit: null,
      margin: null,
      totalVolume: null,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
      realizedPnl: null,
      realizedPnlPercent: null,
      liquidationPrice: null,
      takeProfit: null,
      stopLoss: null,
      fundingFee: null,
      tradingFee: null,
      openTime: null,
      closeTime: null,
      screenshotTime: null,
      orderNo: null,
      orderType: null,
      confidence: 1,
      warnings: []
    }
  ],
  null,
  2
);
