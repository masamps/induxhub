import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatFullDate, pluralize } from "@/lib/format";

import { formatDocument, formatQuantity, proposalCode, STATUS_LABELS, type ProposalStatus } from "../format";
import type { ProposalItem } from "../queries";
import { unitLabel } from "../schemas";

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const { label, variant } = STATUS_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

type DocumentData = {
  numero: number | null;
  versao: number;
  enviadoEm: string | null;
  status: ProposalStatus;
  titulo: string;
  clienteNome: string | null;
  clienteDocumento: string | null;
  itens: ProposalItem[];
  subtotal: number;
  desconto: number;
  frete: number;
  total: number;
  prazoEntregaDias: number | null;
  validade: string;
  condicoesPagamento: string | null;
  observacoes: string | null;
};

/** Corpo do orçamento: cabeçalho, itens, totais e condições. Mesmo layout para fornecedor e cliente. */
export function ProposalDocument({ p, header }: { p: DocumentData; header?: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-6">
      {header}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{proposalCode(p)}</p>
          <h1 className="text-xl font-bold sm:text-2xl">{p.titulo}</h1>
          {p.clienteNome && (
            <p className="text-sm text-muted-foreground">
              Para <span className="font-medium text-foreground">{p.clienteNome}</span>
              {p.clienteDocumento && ` · ${formatDocument(p.clienteDocumento)}`}
            </p>
          )}
        </div>
        <ProposalStatusBadge status={p.status} />
      </div>

      {/* Mobile: lista empilhada. Desktop: tabela. */}
      <ul className="flex flex-col divide-y divide-border sm:hidden">
        {p.itens.map((item, i) => (
          <li key={i} className="flex flex-col gap-1 py-3">
            <span className="font-medium">{item.descricao}</span>
            <span className="flex justify-between text-sm text-muted-foreground">
              <span>
                {formatQuantity(item.quantidade)} {unitLabel(item.unidade)} × {formatCurrency(item.valorUnitario)}
              </span>
              <span className="font-semibold text-foreground tabular-nums">{formatCurrency(item.total)}</span>
            </span>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-sm sm:table">
        <caption className="sr-only">Itens do orçamento</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-2 font-medium">#</th>
            <th scope="col" className="py-2 pr-2 font-medium">Descrição</th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">Qtd.</th>
            <th scope="col" className="py-2 pr-2 font-medium">Un.</th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">Valor unit.</th>
            <th scope="col" className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {p.itens.map((item, i) => (
            <tr key={i} className="border-b border-border align-top">
              <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-2">{item.descricao}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{formatQuantity(item.quantidade)}</td>
              <td className="py-2 pr-2">{unitLabel(item.unidade)}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(item.valorUnitario)}</td>
              <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="flex flex-col gap-1 self-end text-sm sm:w-72">
        <div className="flex justify-between gap-6">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(p.subtotal)}</dd>
        </div>
        {p.desconto > 0 && (
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Desconto</dt>
            <dd className="tabular-nums">− {formatCurrency(p.desconto)}</dd>
          </div>
        )}
        {p.frete > 0 && (
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Frete</dt>
            <dd className="tabular-nums">{formatCurrency(p.frete)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-6 border-t border-border pt-2 text-lg font-bold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCurrency(p.total)}</dd>
        </div>
      </dl>

      <dl className="grid gap-3 rounded-xl bg-surface-raised p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Prazo de entrega</dt>
          <dd className="font-medium">
            {p.prazoEntregaDias !== null ? pluralize(p.prazoEntregaDias, "dia", "dias") : "A combinar"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Válido até</dt>
          <dd className="font-medium">{formatFullDate(p.validade)}</dd>
        </div>
        {p.condicoesPagamento && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Pagamento</dt>
            <dd className="font-medium">{p.condicoesPagamento}</dd>
          </div>
        )}
      </dl>

      {p.observacoes && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Observações</h2>
          <p className="text-sm whitespace-pre-line">{p.observacoes}</p>
        </section>
      )}
    </article>
  );
}
