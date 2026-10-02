import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function StatTile({ label, value, previous }: { label: string; value: number; previous: number }) {
  const delta = previous === 0 ? null : Math.round(((value - previous) / previous) * 100);
  const Icon = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-3xl font-bold tabular-nums">{numberFormatter.format(value)}</span>
      <span
        className={cn(
          "flex items-center gap-1 text-xs",
          delta && delta > 0 ? "text-whatsapp" : delta && delta < 0 ? "text-danger" : "text-muted-foreground",
        )}
      >
        <Icon aria-hidden className="size-3.5" />
        {delta === null ? (
          "Sem dados dos 30 dias anteriores"
        ) : (
          <>
            {delta === 0 ? "Igual" : `${delta > 0 ? "+" : ""}${delta}%`}
            <span className="text-muted-foreground">vs. 30 dias anteriores</span>
          </>
        )}
      </span>
    </div>
  );
}
