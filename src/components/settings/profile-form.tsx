"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateProfileAction,
  type SettingsActionState
} from "@/app/(app)/settings/actions";

type ProfileFormProps = {
  timezone: string;
  baseCurrency: string;
};

const initialState: SettingsActionState = {};

export function ProfileForm({ timezone, baseCurrency }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      <label className="grid gap-2 text-sm font-medium">
        Timezone
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="timezone"
          defaultValue={timezone}
          required
        />
        <span className="text-xs font-normal text-muted">
          Example: UTC, Asia/Ho_Chi_Minh, America/New_York.
        </span>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Base currency
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="baseCurrency"
          defaultValue={baseCurrency}
          maxLength={8}
          required
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
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}
