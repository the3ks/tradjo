"use client";

import { CalendarBlank } from "@phosphor-icons/react";
import { useRef } from "react";

type DateInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

type DateFilterInputProps = {
  defaultValue: string;
  label: string;
  name: string;
};

export function DateFilterInput({
  defaultValue,
  label,
  name
}: DateFilterInputProps) {
  const inputRef = useRef<DateInputElement>(null);

  function openPicker() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus();

    try {
      input.showPicker?.();
    } catch {
      // Some browsers only allow showPicker during direct user activation.
    }
  }

  return (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <span className="relative block">
        <input
          className="min-h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm text-foreground"
          defaultValue={defaultValue}
          name={name}
          onClick={openPicker}
          ref={inputRef}
          type="date"
        />
        <button
          aria-label={`Open ${label.toLowerCase()} date picker`}
          className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-lg text-muted transition hover:text-foreground active:translate-y-px"
          onClick={openPicker}
          type="button"
        >
          <CalendarBlank aria-hidden="true" size={18} />
        </button>
      </span>
    </label>
  );
}
