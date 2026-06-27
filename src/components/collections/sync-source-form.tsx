"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createSyncSourceAction,
  type CollectionActionState
} from "@/app/(app)/collections/actions";

type SyncSourceFormProps = {
  collectionId: string;
  exchangeConnections: Array<{
    id: string;
    accountName: string;
  }>;
};

const initialState: CollectionActionState = {};

export function SyncSourceForm({
  collectionId,
  exchangeConnections
}: SyncSourceFormProps) {
  const [state, formAction] = useActionState(
    createSyncSourceAction,
    initialState
  );

  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-lg border border-border bg-background p-3">
      <input name="collectionId" type="hidden" value={collectionId} />
      <label className="grid gap-2 text-sm font-medium">
        Exchange connection
        <select
          className="min-h-10 rounded-lg border border-border bg-surface px-3 text-foreground outline-none transition focus:border-accent"
          name="exchangeConnectionId"
          required
        >
          <option value="">Select connection</option>
          {exchangeConnections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.accountName}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Market
          <select
            className="min-h-10 rounded-lg border border-border bg-surface px-3 text-foreground outline-none transition focus:border-accent"
            name="marketType"
            defaultValue="PERPETUAL"
          >
            <option value="PERPETUAL">Perpetual</option>
            <option value="SPOT">Spot</option>
            <option value="FUTURES">Futures</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Symbols
          <select
            className="min-h-10 rounded-lg border border-border bg-surface px-3 text-foreground outline-none transition focus:border-accent"
            name="symbolFilterMode"
            defaultValue="ALL"
          >
            <option value="ALL">All</option>
            <option value="INCLUDE">Include</option>
            <option value="EXCLUDE">Exclude</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Initial sync
          <select
            className="min-h-10 rounded-lg border border-border bg-surface px-3 text-foreground outline-none transition focus:border-accent"
            name="initialSyncMode"
            defaultValue="LAST_7_DAYS"
          >
            <option value="LAST_7_DAYS">Last 7 days</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="CUSTOM_RANGE">Custom range</option>
            <option value="OPEN_ONLY">Open only</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Symbol list
        <textarea
          className="min-h-20 rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none transition focus:border-accent"
          name="symbols"
          placeholder="BTC-USDT, ETH-USDT"
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
      <SubmitButton disabled={exchangeConnections.length === 0} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-10 w-fit rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? "Saving..." : "Configure sync source"}
    </button>
  );
}
