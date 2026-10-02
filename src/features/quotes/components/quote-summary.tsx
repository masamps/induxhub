import { CalendarClock, FileText, MapPin, Tag } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatFullDate, formatRelativeDays } from "@/lib/format";

import type { QuoteDetail } from "../queries";
import { QuoteStatusBadge } from "./quote-status-badge";

export function QuoteSummary({ quote, children }: { quote: QuoteDetail; children?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <QuoteStatusBadge status={quote.status} />
          <h1 className="text-xl font-bold sm:text-2xl">{quote.titulo}</h1>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Tag aria-hidden className="size-4" />
              {quote.categoria}
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4" />
              {quote.cidade}
            </li>
            {quote.prazoDesejado && (
              <li className="flex items-center gap-1.5">
                <CalendarClock aria-hidden className="size-4" />
                Prazo desejado: {formatFullDate(quote.prazoDesejado)}
              </li>
            )}
            <li>Enviado {formatRelativeDays(quote.createdAt)}</li>
          </ul>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed">{quote.descricao}</p>
        {quote.anexos.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {quote.anexos.map((a) => (
              <li key={a.path}>
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm hover:bg-surface-raised"
                  >
                    <FileText aria-hidden className="size-4 text-primary" />
                    {a.nome}
                  </a>
                ) : (
                  <span className="flex h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground">
                    <FileText aria-hidden className="size-4" />
                    {a.nome} (indisponível)
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
