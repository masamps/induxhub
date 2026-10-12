import { ArrowLeft, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { isProvider, requireCompany } from "@/features/auth/session";
import { DiscardDraftButton, ProposalActions } from "@/features/proposals/components/proposal-actions";
import { ProposalDocument } from "@/features/proposals/components/proposal-document";
import { ProposalEditor } from "@/features/proposals/components/proposal-editor";
import { proposalCode } from "@/features/proposals/format";
import { getProposalForProvider, type ProposalDetail } from "@/features/proposals/queries";
import type { ProposalInput } from "@/features/proposals/schemas";
import { env } from "@/lib/env";
import { formatFullDate } from "@/lib/format";

export const metadata: Metadata = { title: "Orçamento" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ enviado?: string; erro?: string }> };

const decimal = (v: number) => (v ? v.toFixed(2).replace(".", ",") : "");

function toInput(p: ProposalDetail): ProposalInput {
  return {
    quoteId: p.quoteId,
    titulo: p.titulo,
    clienteNome: p.quoteId ? "" : (p.clienteNome ?? ""),
    clienteDocumento: p.clienteDocumento ?? "",
    clienteEmail: p.clienteEmail ?? "",
    clienteWhatsapp: p.clienteWhatsapp ?? "",
    itens: p.itens.map((i) => ({
      descricao: i.descricao,
      unidade: i.unidade,
      quantidade: String(i.quantidade).replace(".", ","),
      valorUnitario: i.valorUnitario.toFixed(2).replace(".", ","),
    })),
    desconto: decimal(p.desconto),
    frete: decimal(p.frete),
    prazoEntregaDias: p.prazoEntregaDias ? String(p.prazoEntregaDias) : "",
    validade: p.validade,
    condicoesPagamento: p.condicoesPagamento ?? "",
    observacoes: p.observacoes ?? "",
  };
}

function whatsappShare(p: ProposalDetail, url: string, empresa: string) {
  const text = `Olá! Segue o orçamento ${proposalCode(p)} da ${empresa}: ${url}`;
  const phone = p.clienteWhatsapp ? (p.clienteWhatsapp.length <= 11 ? `55${p.clienteWhatsapp}` : p.clienteWhatsapp) : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default async function OrcamentoFornecedorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { enviado, erro } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const { company } = await requireCompany(`/painel/propostas/${id}`);
  if (!isProvider(company)) redirect("/painel");
  const p = await getProposalForProvider(id, company.id);
  if (!p) notFound();

  const back = (
    <Link href="/painel/propostas" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft aria-hidden className="size-4" />
      Meus orçamentos
    </Link>
  );

  if (p.status === "rascunho") {
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        {back}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{p.versao > 1 || p.origemId ? "Nova versão (rascunho)" : "Rascunho"}</h2>
          <DiscardDraftButton id={p.id} />
        </div>
        {erro && <Alert tone="error">Rascunho salvo, mas não enviado. Confira os dados e tente de novo.</Alert>}
        <ProposalEditor
          id={p.id}
          defaults={toInput(p)}
          quote={p.quoteId ? { titulo: p.quoteTitulo ?? "", solicitante: p.clienteNome ?? "" } : null}
        />
      </div>
    );
  }

  const publicUrl = `${env.NEXT_PUBLIC_SITE_URL}/p/${p.token}`;
  const timeline = [
    { label: "Criado", at: p.createdAt },
    { label: "Enviado", at: p.enviadoEm },
    { label: "Visto pelo cliente", at: p.visualizadoEm },
    {
      label: p.status === "aceito" ? "Aceito" : p.status === "recusado" ? "Recusado" : "Respondido",
      at: p.respondidoEm,
    },
  ].filter((t): t is { label: string; at: string } => Boolean(t.at));

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {back}
      {enviado && p.status === "enviado" && (
        <Alert tone="success">
          {p.quoteId
            ? "Orçamento enviado. O solicitante já vê no pedido."
            : "Orçamento enviado. Mande o link para o cliente pelo WhatsApp ou copie."}
        </Alert>
      )}
      {p.status === "aceito" && (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <Trophy aria-hidden className="size-4" />
            {p.clienteNome} aceitou este orçamento.
          </span>
        </Alert>
      )}
      {p.status === "recusado" && p.motivoRecusa && <Alert tone="info">Motivo da recusa: {p.motivoRecusa}</Alert>}
      {p.status === "expirado" && (
        <Alert tone="info">A validade venceu em {formatFullDate(p.validade)}. Crie uma nova versão com outra data.</Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-6">
          <ProposalActions
            id={p.id}
            status={p.status}
            publicUrl={publicUrl}
            whatsappUrl={whatsappShare(p, publicUrl, company.nomeFantasia)}
            podeNovaVersao={["enviado", "recusado", "expirado"].includes(p.status)}
          />
          {p.quoteId && (
            <p className="text-sm text-muted-foreground">
              Resposta ao pedido{" "}
              <Link href={`/orcamentos/${p.quoteId}`} className="font-medium text-primary hover:underline">
                {p.quoteTitulo}
              </Link>
            </p>
          )}
          <ProposalDocument p={p} />
          <section aria-label="Histórico" className="border-t border-border pt-4">
            <ol className="flex flex-col gap-1 text-sm">
              {timeline.map((t) => (
                <li key={t.label} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{t.label}</span>
                  <span>{formatFullDate(t.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
