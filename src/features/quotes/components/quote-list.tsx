import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { formatRelativeDays, pluralize } from "@/lib/format";

import type { QuoteSummary } from "../queries";
import { QuoteStatusBadge } from "./quote-status-badge";

export function QuoteList({ quotes, empty }: { quotes: QuoteSummary[]; empty: React.ReactNode }) {
  if (!quotes.length) return <>{empty}</>;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {quotes.map((q) => (
        <li key={q.id}>
          <Link
            href={`/orcamentos/${q.id}`}
            className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-raised"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-medium">{q.titulo}</span>
              <span className="text-xs text-muted-foreground">
                {q.categoria} · {q.cidade} · {formatRelativeDays(q.createdAt)}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs">
                <QuoteStatusBadge status={q.status} />
                <span className="text-muted-foreground">
                  {pluralize(q.respostas, "resposta", "respostas")} de {q.destinatarios}
                </span>
              </span>
            </div>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
