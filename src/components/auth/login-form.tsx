"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type AuthActionState } from "@/app/(auth)/actions";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        Email
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Password
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label className="flex items-center gap-3 text-sm font-medium text-muted">
        <input
          className="h-4 w-4 rounded border-border accent-accent"
          defaultChecked
          name="rememberMe"
          type="checkbox"
          value="true"
        />
        Remember me
      </label>
      {state.error ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label="Log in" />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Working..." : label}
    </button>
  );
}
