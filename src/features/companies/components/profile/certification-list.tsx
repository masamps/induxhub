import { BadgeCheck } from "lucide-react";

import type { CompanyProfile } from "@/features/companies/queries";
import { formatMonthYear } from "@/lib/format";

export function CertificationList({ items }: { items: CompanyProfile["certificacoes"] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 rounded-card border border-border bg-surface p-4">
          <BadgeCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex flex-col gap-0.5">
            <p className="font-medium">{item.nome}</p>
            <p className="text-sm text-muted-foreground">
              {[item.orgao, item.validade && `válida até ${formatMonthYear(item.validade)}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
