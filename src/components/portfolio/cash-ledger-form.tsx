"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createCashLedgerAction,
  type PortfolioActionState
} from "@/app/(app)/portfolio/actions";

const initialState: PortfolioActionState = {};

export function CashLedgerForm() {
  const [state, formAction] = useActionState(createCashLedgerAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Transaction
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="action"
            defaultValue="DEPOSIT"
          >
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdraw</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Symbol
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="symbol"
            defaultValue="USDT"
            maxLength={16}
            required
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Amount
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="quantity"
            min="0"
            step="any"
            type="number"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Cost
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="price"
            min="0"
            step="any"
            type="number"
            defaultValue="1"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Date
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="transactionDate"
            type="datetime-local"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Exchange
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="exchange"
          placeholder="General, BingX, Binance"
          maxLength={80}
        />
      </label>
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
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 w-fit rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : "Save cash ledger"}
    </button>
  );
}
