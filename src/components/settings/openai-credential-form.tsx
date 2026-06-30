"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteOpenAiCredentialAction,
  saveOpenAiCredentialAction,
  type SettingsActionState
} from "@/app/(app)/settings/actions";

const initialState: SettingsActionState = {};

export function OpenAiCredentialForm({ hasCredential }: { hasCredential: boolean }) {
  const [state, formAction] = useActionState(
    saveOpenAiCredentialAction,
    initialState
  );

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
        Status:{" "}
        <span className="font-semibold text-foreground">
          {hasCredential ? "OpenAI key saved" : "No OpenAI key saved"}
        </span>
      </div>
      <form action={formAction} className="grid gap-3">
        <label className="grid gap-2 text-sm font-medium">
          OpenAI API key
          <input
            autoComplete="off"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="apiKey"
            placeholder={hasCredential ? "Paste a new key to replace it" : ""}
            required
            type="password"
          />
          <span className="text-xs font-normal text-muted">
            Stored encrypted. Used only when Gemini is unavailable or when no Gemini key is configured.
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
        <SaveButton hasCredential={hasCredential} />
      </form>
      {hasCredential ? (
        <form action={deleteOpenAiCredentialAction}>
          <button className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px">
            Remove OpenAI key
          </button>
        </form>
      ) : null}
    </div>
  );
}

function SaveButton({ hasCredential }: { hasCredential: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 w-fit rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending
        ? "Saving..."
        : hasCredential
          ? "Replace OpenAI key"
          : "Save OpenAI key"}
    </button>
  );
}
