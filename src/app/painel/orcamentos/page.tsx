import { ChevronRight, Inbox, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { isProvider, requireCompany } from "@/features/auth/session";
import { listInbox, type InboxFilter, type InboxItem } from "@/features/quotes/queries";
import { formatFullDate, formatRelativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos recebidos" };

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "novos", label: "A responder" },
  { key: "respondidos", label: "Respondidos" },
];

function itemState(item: InboxItem) {
  if (item.escolhido) return { label: "Escolhido", variant: "primary" as const };
  if (item.respondidoEm) return { label: "Respondido", variant: "default" as const };
  if (item.status === "fechado") return { label: "Encerrado", variant: "outline" as const };
  if (!item.visualizadoEm) return { label: "Novo", variant: "primary" as const };
  return { label: "A responder", variant: "outline" as const };
}

export default async function PedidosRecebidosPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { company } = await requireCompany("/painel/orcamentos");
  if (!isProvider(company)) redirect("/painel");

  const { filtro } = await searchParams;
  const filter = FILTERS.find((f) => f.key === filtro)?.key ?? "todos";
  const items = await listInbox(company.id, filter);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filtrar pedidos" className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "todos" ? "/painel/orcamentos" : `/painel/orcamentos?filtro=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn(
              "flex h-9 items-center rounded-full border px-4 text-sm font-medium",
              filter === f.key ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <Card>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Inbox aria-hidden className="size-10 text-muted-foreground" />
              <p className="font-medium">{filter === "todos" ? "Nenhum pedido recebido ainda" : "Nada por aqui"}</p>
              {filter === "todos" && (
                <p className="max-w-sm text-sm text-muted-foreground">
                  Você recebe pedidos das suas categorias nas cidades que atende. Revise as categorias e cidades no
                  perfil para aparecer em mais pedidos.
                </p>
              )}
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {items.map((item) => {
                const state = itemState(item);
                const unread = !item.visualizadoEm;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/orcamentos/${item.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-raised"
                    >
                      <span
                        aria-hidden
                        className={cn("size-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className={cn("truncate", unread ? "font-semibold" : "font-medium")}>{item.titulo}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.solicitante} · {item.categoria} · {item.cidade} · {formatRelativeDays(item.enviadoEm)}
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant={state.variant}>
                            {item.escolhido && <Trophy aria-hidden />}
                            {state.label}
                          </Badge>
                          {item.prazoDesejado && !item.respondidoEm && item.status !== "fechado" && (
                            <span className="text-muted-foreground">Prazo: {formatFullDate(item.prazoDesejado)}</span>
                          )}
                        </span>
                      </div>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
