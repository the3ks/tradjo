"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  extractScreenshotTradeAction,
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
  const [state, formAction] = useActionState(
    extractScreenshotTradeAction,
    initialState
  );

  return (
    <div className="grid gap-5">
      <details
        className="overflow-hidden rounded-xl border border-border bg-surface"
        open={state.draft ? false : defaultOpen}
      >
        <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
          Upload screenshot
        </summary>
        <form
          action={formAction}
          className="grid gap-4 border-t border-border p-5"
        >
          <div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Supports BingX Standard Futures open position and closed trade screenshots.
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
            Screenshot
            <input
              accept="image/jpeg,image/png,image/webp"
              className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              disabled={!hasGeminiKey}
              name="screenshot"
              required
              type="file"
            />
          </label>
          {!hasGeminiKey ? (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Add your Gemini API key in Settings before importing screenshots.
            </p>
          ) : null}
          {state.error ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <SubmitButton disabled={!hasGeminiKey} />
        </form>
      </details>

      <DirectJsonTradeEditor
        collectionId={collectionId}
        collectionName={collectionName}
        draft={state.draft}
        existingTradeMatch={state.existingTradeMatch}
        targetCollection={state.targetCollection}
      />
    </div>
  );
}

function DirectJsonTradeEditor({
  collectionId,
  collectionName,
  draft,
  existingTradeMatch,
  targetCollection
}: {
  collectionId?: string;
  collectionName?: string;
  draft?: ScreenshotImportActionState["draft"];
  existingTradeMatch?: ScreenshotImportActionState["existingTradeMatch"];
  targetCollection?: ScreenshotImportActionState["targetCollection"];
}) {
  const [saveState, saveAction] = useActionState(saveScreenshotTradeAction, {});
  const jsonValue = draft ? JSON.stringify(draft, null, 2) : defaultDraftJson;

  return (
    <details
      className="overflow-hidden rounded-xl border border-border bg-surface"
      open={Boolean(draft)}
    >
      <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
        Input raw JSON
      </summary>
      <form action={saveAction} className="grid gap-4 border-t border-border p-5">
        <div>
          {draft ? (
            <p className="max-w-2xl rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm leading-6 text-accent">
              Extracted JSON from the uploaded screenshot has been loaded here. Edit the JSON if needed, then save this exact content.
            </p>
          ) : (
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Paste or edit a trade JSON object directly, then save it into this collection.
            </p>
          )}
          {targetCollection ?? collectionName ? (
            <p className="mt-2 text-sm font-medium text-foreground">
              Target collection: {targetCollection?.name ?? collectionName}
            </p>
          ) : null}
        </div>
        {existingTradeMatch ? (
          <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <p className="font-semibold">{matchLabel(existingTradeMatch.kind)}</p>
            <p className="mt-1 text-muted">{existingTradeMatch.message}</p>
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

function matchLabel(kind: NonNullable<ScreenshotImportActionState["existingTradeMatch"]>["kind"]) {
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
  },
  null,
  2
);
