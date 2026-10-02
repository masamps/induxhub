"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type Option = { id: number; nome: string };

/** Seleção múltipla em chips com aria-pressed. Área de toque de 44px. */
export function ToggleChips({
  options,
  value,
  onChange,
  max,
  disabledIds = [],
  labelledBy,
}: {
  options: Option[];
  value: number[];
  onChange: (value: number[]) => void;
  max?: number;
  disabledIds?: number[];
  labelledBy?: string;
}) {
  const full = max !== undefined && value.length >= max;

  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option.id);
        const disabled = disabledIds.includes(option.id) || (!selected && full);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? value.filter((id) => id !== option.id) : [...value, option.id])}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-40",
              selected
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-surface text-foreground hover:bg-surface-raised",
            )}
          >
            {selected && <Check aria-hidden className="size-4" />}
            {option.nome}
          </button>
        );
      })}
    </div>
  );
}
