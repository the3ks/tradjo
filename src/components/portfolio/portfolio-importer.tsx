"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  parsePortfolioImportAction,
  savePortfolioImportAction,
  type PortfolioImportActionState
} from "@/app/(app)/portfolio/import/actions";

type CashPositionOption = {
  id: string;
  label: string;
};

const initialState: PortfolioImportActionState = {};

export function PortfolioImporter({
  cashPositions
}: {
  cashPositions: CashPositionOption[];
}) {
  const [parseState, parseAction] = useActionState(
    parsePortfolioImportAction,
    initialState
  );
  const hasDrafts = Boolean(parseState.drafts?.length);

  return (
    <div className="grid gap-5">
      <details
        className="overflow-hidden rounded-xl border border-border bg-surface"
        open={!hasDrafts}
      >
        <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
          Paste portfolio CSV
        </summary>
        <form action={parseAction} className="grid gap-4 border-t border-border p-5">
          <div>
            <p className="text-sm font-medium text-foreground">
              Target domain: Portfolio Ledger
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Required headers: action, symbol, quantity. Optional headers: assetClass, positionType, price, feeAmount, currency, exchange, date.
            </p>
          </div>
          <input name="targetDomain" type="hidden" value="PORTFOLIO_LEDGER" />
          <label className="grid gap-2 text-sm font-medium">
            CSV text
            <textarea
              className="min-h-72 rounded-lg border border-border bg-background p-3 font-mono text-xs leading-5 text-foreground outline-none transition focus:border-accent"
              name="csvText"
              placeholder="action,symbol,assetClass,positionType,quantity,price,feeAmount,currency,exchange,date"
              spellCheck={false}
            />
          </label>
          {parseState.error ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {parseState.error}
            </p>
          ) : null}
          <ParseButton />
        </form>
      </details>

      <PortfolioDraftReview
        cashPositions={cashPositions}
        drafts={parseState.drafts}
      />
    </div>
  );
}

function PortfolioDraftReview({
  cashPositions,
  drafts
}: {
  cashPositions: CashPositionOption[];
  drafts?: PortfolioImportActionState["drafts"];
}) {
  const [saveState, saveAction] = useActionState(
    savePortfolioImportAction,
    initialState
  );
  const jsonValue = drafts
    ? JSON.stringify(drafts, null, 2)
    : JSON.stringify(defaultDrafts, null, 2);
  const hasCashPositions = cashPositions.length > 0;

  return (
    <details
      className="overflow-hidden rounded-xl border border-border bg-surface"
      open={Boolean(drafts)}
    >
      <summary className="cursor-pointer px-5 py-4 text-base font-semibold transition hover:bg-background/70">
        Review portfolio ledger JSON
      </summary>
      <form action={saveAction} className="grid gap-4 border-t border-border p-5">
        <div>
          <p className="text-sm font-medium text-foreground">
            Target domain: Portfolio Ledger
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Review the parsed rows before saving. Portfolio imports create ledger rows only; they do not create tactical journal trades.
          </p>
        </div>
        <input name="targetDomain" type="hidden" value="PORTFOLIO_LEDGER" />
        <label className="grid gap-2 text-sm font-medium">
          Draft JSON
          <textarea
            className="min-h-96 rounded-lg border border-border bg-background p-3 font-mono text-xs leading-5 text-foreground outline-none transition focus:border-accent"
            defaultValue={jsonValue}
            key={jsonValue}
            name="draftJson"
            spellCheck={false}
          />
        </label>
        <div className="rounded-lg border border-border bg-background p-3">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              className="size-4 accent-[var(--accent)]"
              disabled={!hasCashPositions}
              name="settleWithCash"
              type="checkbox"
            />
            Settle imported buys/sells against cash
          </label>
          <label className="mt-3 grid gap-2 text-sm font-medium">
            Cash source
            <select
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-foreground outline-none transition focus:border-accent disabled:opacity-70"
              disabled={!hasCashPositions}
              name="cashPositionId"
              defaultValue={cashPositions[0]?.id ?? ""}
            >
              {cashPositions.length === 0 ? (
                <option value="">No cash balances</option>
              ) : (
                cashPositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.label}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
        {!drafts ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            Parse CSV before saving portfolio ledger rows.
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
        <SaveButton disabled={!drafts} />
      </form>
    </details>
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
      {pending ? "Parsing..." : "Parse portfolio CSV"}
    </button>
  );
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 w-fit rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Saving..." : "Save portfolio ledger"}
    </button>
  );
}

const defaultDrafts = [
  {
    action: "BUY",
    assetClass: "CRYPTO",
    currency: "USDT",
    exchange: "BingX",
    feeAmount: 0,
    positionType: "SPOT",
    price: 60000,
    quantity: 0.5,
    symbol: "BTC",
    transactionDate: "2026-07-01"
  }
];
