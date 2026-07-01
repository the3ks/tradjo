"use client";

import { CalendarBlank } from "@phosphor-icons/react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

type DateInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

type DateFilterInputProps = {
  className?: string;
  defaultValue: string;
  label: string;
  name: string;
};

export function DateFilterInput({
  className,
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
    <label className={cn("grid gap-1 text-xs font-medium text-muted", className)}>
      {label}
      <span className="relative block min-w-0">
        <input
          className="min-h-10 min-w-0 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm text-foreground"
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
