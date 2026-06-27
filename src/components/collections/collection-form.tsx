"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createCollectionAction,
  type CollectionActionState
} from "@/app/(app)/collections/actions";

type CollectionOption = {
  id: string;
  name: string;
};

const initialState: CollectionActionState = {};

export function CollectionForm({ folders }: { folders: CollectionOption[] }) {
  const [state, formAction] = useActionState(createCollectionAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        Name
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="name"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Type
        <select
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="type"
          defaultValue="TRADING"
        >
          <option value="TRADING">Trading collection</option>
          <option value="FOLDER">Folder</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Parent folder
        <select
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
          name="parentId"
          defaultValue=""
        >
          <option value="">None</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Description
        <textarea
          className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-accent"
          name="description"
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
      {pending ? "Creating..." : "Create collection"}
    </button>
  );
}
