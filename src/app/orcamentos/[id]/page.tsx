import { ArrowLeft, Clock, Eye, FileText, MessageCircle, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Container } from "@/components/layout/container";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCompany } from "@/features/auth/session";
import { QuoteSummary } from "@/features/quotes/components/quote-summary";
import { ReplyComparison } from "@/features/quotes/components/reply-comparison";
import { ReplyForm } from "@/features/quotes/components/reply-form";
import { getQuoteForOwner, getQuoteForProvider } from "@/features/quotes/queries";
import { formatCurrency, formatRelativeDays, pluralize } from "@/lib/format";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildWhatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Pedido de orçamento" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ enviado?: string }> };

export default async function OrcamentoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { enviado } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const { company } = await requireCompany(`/orcamentos/${id}`);
  const supabase = await createServerSupabase();
  const { data: ref } = await supabase.from("quote_requests").select("solicitante_id").eq("id", id).maybeSingle();
  if (!ref) notFound();

  if (ref.solicitante_id === company.id) {
    const data = await getQuoteForOwner(id);
    if (!data) notFound();
    return <OwnerView data={data} justSent={Boolean(enviado)} />;
  }

  // Abrir o pedido marca como visto para o solicitante saber.
  await supabase.rpc("mark_quote_viewed", { p_quote_id: id, p_prestador_id: company.id });
  const data = await getQuoteForProvider(id, company.id);
  if (!data) notFound();
  return <ProviderView data={data} companyId={company.id} />;
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft aria-hidden className="size-4" />
      {label}
    </Link>
  );
}

function OwnerView({
  data,
  justSent,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getQuoteForOwner>>>;
  justSent: boolean;
}) {
  const { quote, replies, reviews, destinatarios, visualizaram } = data;

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-12">
      <BackLink href="/orcamentos" label="Meus pedidos" />
      {justSent && (
        <Alert tone="success">
          Pedido enviado para {pluralize(destinatarios, "fornecedor", "fornecedores")}. As propostas aparecem aqui.
        </Alert>
      )}
      <QuoteSummary quote={quote}>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
          <li>Enviado a {pluralize(destinatarios, "fornecedor", "fornecedores")}</li>
          <li className="flex items-center gap-1.5">
            <Eye aria-hidden className="size-4" />
            {visualizaram} {visualizaram === 1 ? "visualizou" : "visualizaram"}
          </li>
          <li className="flex items-center gap-1.5">
            <MessageCircle aria-hidden className="size-4" />
            {pluralize(replies.length, "resposta", "respostas")}
          </li>
        </ul>
      </QuoteSummary>

      {replies.length ? (
        <ReplyComparison quote={quote} replies={replies} reviews={reviews} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Clock aria-hidden className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {quote.status === "fechado" ? "Pedido encerrado sem propostas" : "Aguardando propostas"}
            </p>
            {quote.status !== "fechado" && (
              <p className="max-w-sm text-sm text-muted-foreground">
                As propostas dos fornecedores aparecem aqui assim que chegarem.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

function ProviderView({
  data,
  companyId,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getQuoteForProvider>>>;
  companyId: string;
}) {
  const { quote, reply } = data;
  const chosen = quote.escolhidoId === companyId;
  const lostTo = quote.status === "fechado" && !chosen;

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-12">
      <BackLink href="/painel/orcamentos" label="Pedidos recebidos" />
      {chosen && (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <Trophy aria-hidden className="size-4" />
            {quote.solicitante.nome} escolheu sua proposta.
          </span>
        </Alert>
      )}
      <QuoteSummary quote={quote}>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium">{quote.solicitante.nome}</p>
            <p className="text-muted-foreground">{quote.solicitante.cidade}</p>
          </div>
          {quote.solicitante.whatsapp && !lostTo && (
            <Button asChild variant="whatsapp">
              <a
                href={buildWhatsappLink(
                  quote.solicitante.whatsapp,
                  `Olá! Recebi seu pedido "${quote.titulo}" pelo InduxHub.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle aria-hidden />
                Conversar
              </a>
            </Button>
          )}
        </div>
      </QuoteSummary>

      <Card>
        <CardContent>
          {reply ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Sua proposta</h2>
              <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-raised p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Valor estimado</dt>
                  <dd className="font-bold">
                    {reply.valorEstimado !== null ? formatCurrency(reply.valorEstimado) : "A combinar"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Prazo</dt>
                  <dd className="font-bold">
                    {reply.prazoDias !== null ? pluralize(reply.prazoDias, "dia", "dias") : "A combinar"}
                  </dd>
                </div>
              </dl>
              <p className="text-sm whitespace-pre-line">{reply.mensagem}</p>
              <p className="text-xs text-muted-foreground">Enviada {formatRelativeDays(reply.createdAt)}</p>
              {reply.proposalId && (
                <Button asChild variant="outline" className="sm:self-start">
                  <Link href={`/painel/propostas/${reply.proposalId}`}>
                    <FileText aria-hidden />
                    Ver orçamento enviado
                  </Link>
                </Button>
              )}
              {lostTo && <p className="text-sm text-muted-foreground">O solicitante fechou o pedido com outro fornecedor.</p>}
            </div>
          ) : quote.status === "fechado" ? (
            <p className="text-sm text-muted-foreground">Este pedido foi encerrado pelo solicitante.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">Enviar orçamento</h2>
                <p className="text-sm text-muted-foreground">
                  Monte item a item, com totais, validade e condições. O solicitante recebe o orçamento completo e o
                  PDF.
                </p>
                <Button asChild size="lg" className="sm:self-start">
                  <Link href={`/painel/propostas/novo?pedido=${quote.id}`}>
                    <FileText aria-hidden />
                    Montar orçamento
                  </Link>
                </Button>
              </div>
              <details className="rounded-xl border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Responder só com valor estimado</summary>
                <div className="pt-4">
                  <ReplyForm quoteId={quote.id} />
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
