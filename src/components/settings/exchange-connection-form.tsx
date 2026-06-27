"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createExchangeConnectionAction,
  type ExchangeConnectionActionState
} from "@/app/(app)/settings/exchanges/actions";

const initialState: ExchangeConnectionActionState = {};

export function ExchangeConnectionForm() {
  const [state, formAction] = useActionState(
    createExchangeConnectionAction,
    initialState
  );

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        Account name
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="accountName"
          placeholder="BingX Main"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        API key
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="apiKey"
          autoComplete="off"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        API secret
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="apiSecret"
          type="password"
          autoComplete="off"
          required
        />
        <span className="text-xs font-normal text-muted">
          Use read-only credentials. Secrets are encrypted and will not be shown again.
        </span>
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
      {pending ? "Saving..." : "Add BingX connection"}
    </button>
  );
}
