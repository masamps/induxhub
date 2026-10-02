"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const LABELS = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

/** Estrelas como grupo de rádio: setas do teclado funcionam nativamente. */
export function StarInput({ value, onChange, name }: { value: number; onChange: (v: number) => void; name: string }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">Nota</legend>
      <div className="flex items-center gap-1">
        {LABELS.map((label, i) => {
          const star = i + 1;
          return (
            <label key={star} className="cursor-pointer has-[:focus-visible]:rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
              <input
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                className="sr-only"
              />
              <Star
                aria-hidden
                className={cn(
                  "size-9 p-1",
                  value >= star ? "fill-premium text-premium" : "fill-transparent text-muted-foreground",
                )}
              />
              <span className="sr-only">
                {star} — {label}
              </span>
            </label>
          );
        })}
        {value > 0 && <span className="ml-2 text-sm text-muted-foreground">{LABELS[value - 1]}</span>}
      </div>
    </fieldset>
  );
}
