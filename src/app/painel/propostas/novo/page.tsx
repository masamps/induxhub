import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { isProvider, requireCompany } from "@/features/auth/session";
import { ProposalEditor } from "@/features/proposals/components/proposal-editor";
import { todayIso } from "@/features/proposals/format";
import { findQuoteDraft, getQuoteToPropose } from "@/features/proposals/queries";
import type { ProposalInput } from "@/features/proposals/schemas";

export const metadata: Metadata = { title: "Novo orçamento" };

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function NovoOrcamentoPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { company } = await requireCompany("/painel/propostas/novo");
  if (!isProvider(company)) redirect("/painel");

  const { pedido } = await searchParams;
  let quote: Awaited<ReturnType<typeof getQuoteToPropose>> = null;
  if (pedido) {
    if (!z.uuid().safeParse(pedido).success) notFound();
    const draft = await findQuoteDraft(pedido, company.id);
    if (draft) redirect(`/painel/propostas/${draft}`);
    quote = await getQuoteToPropose(pedido, company.id);
    if (!quote) notFound();
  }

  const defaults: ProposalInput = {
    quoteId: quote?.id ?? null,
    titulo: quote?.titulo ?? "",
    clienteNome: "",
    clienteDocumento: "",
    clienteEmail: "",
    clienteWhatsapp: "",
    itens: [{ descricao: "", unidade: "un", quantidade: "1", valorUnitario: "" }],
    desconto: "",
    frete: "",
    prazoEntregaDias: "",
    validade: addDays(todayIso(), 15),
    condicoesPagamento: "",
    observacoes: "",
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h2 className="text-xl font-semibold">Novo orçamento</h2>
      <ProposalEditor id={null} defaults={defaults} quote={quote} />
    </div>
  );
}
