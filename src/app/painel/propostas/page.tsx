import { ChevronRight, FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isProvider, requireCompany } from "@/features/auth/session";
import { ProposalStatusBadge } from "@/features/proposals/components/proposal-document";
import { proposalCode } from "@/features/proposals/format";
import { listMyProposals, type ProposalFilter } from "@/features/proposals/queries";
import { formatCurrency, formatRelativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Meus orçamentos" };

const FILTERS: { key: ProposalFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "rascunhos", label: "Rascunhos" },
  { key: "enviados", label: "Aguardando cliente" },
  { key: "aceitos", label: "Aceitos" },
];

export default async function MeusOrcamentosPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { company } = await requireCompany("/painel/propostas");
  if (!isProvider(company)) redirect("/painel");

  const { filtro } = await searchParams;
  const filter = FILTERS.find((f) => f.key === filtro)?.key ?? "todos";
  const items = await listMyProposals(company.id, filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrar orçamentos" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "todos" ? "/painel/propostas" : `/painel/propostas?filtro=${f.key}`}
              aria-current={filter === f.key ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
                filter === f.key ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <Button asChild>
          <Link href="/painel/propostas/novo">
            <Plus aria-hidden />
            Novo orçamento
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <FileText aria-hidden className="size-10 text-muted-foreground" />
              <p className="font-medium">{filter === "todos" ? "Nenhum orçamento ainda" : "Nada por aqui"}</p>
              {filter === "todos" && (
                <p className="max-w-sm text-sm text-muted-foreground">
                  Monte orçamentos item a item e mande o link para o cliente aceitar pelo celular, mesmo que ele não
                  use o InduxHub.
                </p>
              )}
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/painel/propostas/${item.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-raised"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate font-medium">{item.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        {proposalCode(item)} · {item.clienteNome ?? "Sem cliente"} ·{" "}
                        {formatRelativeDays(item.enviadoEm ?? item.updatedAt)}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-xs">
                        <ProposalStatusBadge status={item.status} />
                        {item.quoteId && <span className="text-muted-foreground">Pedido do InduxHub</span>}
                        {item.status === "enviado" && (
                          <span className="text-muted-foreground">{item.visualizadoEm ? "Visto" : "Não aberto"}</span>
                        )}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(item.total)}</span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
