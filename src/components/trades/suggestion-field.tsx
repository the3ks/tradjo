"use client";

import { useEffect, useMemo, useState } from "react";

import type { SuggestionCategory } from "@/lib/journal-suggestions";

type SuggestionFieldProps = {
  category: SuggestionCategory;
  defaultValue?: string | null;
  label: string;
  maxLength?: number;
  multiline?: boolean;
  name: string;
  placeholder?: string;
};

export function SuggestionField({
  category,
  defaultValue,
  label,
  maxLength,
  multiline,
  name,
  placeholder
}: SuggestionFieldProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const query = useMemo(() => value.trim().slice(0, 80), [value]);

  useEffect(() => {
    const controller = new AbortController();
    const searchParams = new URLSearchParams({
      category,
      q: query
    });

    fetch(`/api/suggestions?${searchParams.toString()}`, {
      signal: controller.signal
    })
      .then((response) => (response.ok ? response.json() : { suggestions: [] }))
      .then((data: { suggestions?: string[] }) => {
        setSuggestions(data.suggestions ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      });

    return () => controller.abort();
  }, [category, query]);

  function applySuggestion(suggestion: string) {
    if (!multiline) {
      setValue(suggestion);
      return;
    }

    setValue((currentValue) => {
      if (!currentValue.trim()) {
        return suggestion;
      }

      if (currentValue.includes(suggestion)) {
        return currentValue;
      }

      return `${currentValue.trimEnd()}\n${suggestion}`;
    });
  }

  const inputClassName =
    "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent";

  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium">
      {label}
      {multiline ? (
        <textarea
          className={`${inputClassName} min-h-32 py-3 leading-6`}
          maxLength={maxLength}
          name={name}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <input
          className={inputClassName}
          maxLength={maxLength}
          name={name}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
      {suggestions.length > 0 ? (
        <span className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px"
              key={suggestion}
              onClick={() => applySuggestion(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </span>
      ) : null}
    </label>
  );
}
