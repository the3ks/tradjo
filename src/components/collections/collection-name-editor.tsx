"use client";

import { Check, PencilSimple, X } from "@phosphor-icons/react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { updateCollectionNameAction } from "@/app/(app)/collections/actions";

export function CollectionNameEditor({
  collectionId,
  name
}: {
  collectionId: string;
  name: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="min-w-0 truncate font-medium">{name}</h3>
        <button
          aria-label={`Edit ${name}`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted transition hover:border-border hover:bg-surface-elevated hover:text-foreground active:translate-y-px"
          onClick={() => setIsEditing(true)}
          title="Edit collection name"
          type="button"
        >
          <PencilSimple aria-hidden="true" size={16} />
        </button>
      </div>
    );
  }

  return (
    <form
      action={updateCollectionNameAction}
      className="flex max-w-xl flex-col gap-2 sm:flex-row"
    >
      <input name="collectionId" type="hidden" value={collectionId} />
      <label className="grid flex-1 gap-1 text-xs font-medium text-muted">
        Collection name
        <input
          autoFocus
          className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent"
          defaultValue={name}
          maxLength={120}
          name="name"
          required
        />
      </label>
      <div className="flex gap-2 sm:self-end">
        <SaveButton />
        <button
          aria-label="Cancel rename"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px"
          onClick={() => setIsEditing(false)}
          title="Cancel"
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label="Save collection name"
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      title="Save"
      type="submit"
    >
      <Check aria-hidden="true" size={16} />
    </button>
  );
}
