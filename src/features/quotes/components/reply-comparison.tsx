"use client";

import { CheckCircle2, FileText, MessageCircle, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/features/companies/components/rating-stars";
import { formatCurrency, formatRating, formatRelativeDays, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/whatsapp";

import { closeQuote, submitReview } from "../actions";
import type { MyReview, QuoteDetail, QuoteReply } from "../queries";
import { StarInput } from "./star-input";

const SORTS = [
  { key: "valor", label: "Menor valor" },
  { key: "prazo", label: "Menor prazo" },
  { key: "nota", label: "Melhor nota" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function sortReplies(replies: QuoteReply[], key: SortKey) {
  const inf = Number.POSITIVE_INFINITY;
  return [...replies].sort((a, b) => {
    if (key === "valor") return (a.valorEstimado ?? inf) - (b.valorEstimado ?? inf);
    if (key === "prazo") return (a.prazoDias ?? inf) - (b.prazoDias ?? inf);
    return (b.prestador.notaMedia ?? -1) - (a.prestador.notaMedia ?? -1);
  });
}

export function ReplyComparison({
  quote,
  replies,
  reviews,
}: {
  quote: QuoteDetail;
  replies: QuoteReply[];
  reviews: MyReview[];
}) {
  const [sort, setSort] = useState<SortKey>("valor");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const closed = quote.status === "fechado";

  const sorted = useMemo(() => sortReplies(replies, sort), [replies, sort]);
  const lowest = Math.min(...replies.map((r) => r.valorEstimado ?? Number.POSITIVE_INFINITY));
  const fastest = Math.min(...replies.map((r) => r.prazoDias ?? Number.POSITIVE_INFINITY));

  function choose(prestadorId: string | null) {
    setError(undefined);
    startTransition(async () => {
      const result = await closeQuote(quote.id, prestadorId);
      if (!result.ok) setError(result.error);
      setConfirming(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{pluralize(replies.length, "proposta", "propostas")}</h2>
        {replies.length > 1 && (
          <div role="group" aria-label="Ordenar propostas" className="flex rounded-xl border border-border p-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={sort === s.key}
                onClick={() => setSort(s.key)}
                className={cn(
                  "h-9 rounded-lg px-3 text-sm font-medium",
                  sort === s.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <ul className="flex flex-col gap-4">
        {sorted.map((reply) => {
          const p = reply.prestador;
          const chosen = quote.escolhidoId === p.id;
          const review = reviews.find((r) => r.prestadorId === p.id);
          return (
            <li key={reply.id}>
              <Card className={cn(chosen && "border-primary")}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <Link href={`/prestador/${p.slug}`} target="_blank" className="font-semibold hover:text-primary">
                        {p.nome}
                      </Link>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {p.notaMedia !== null ? (
                          <>
                            <RatingStars value={p.notaMedia} className="[&_svg]:size-3.5" />
                            {formatRating(p.notaMedia)} ({p.totalAvaliacoes})
                          </>
                        ) : (
                          "Sem avaliações"
                        )}
                        <span>· {pluralize(p.projetosConcluidos, "projeto", "projetos")}</span>
                        <span>· {p.cidade}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {chosen && (
                        <Badge variant="primary">
                          <Trophy aria-hidden />
                          Escolhido
                        </Badge>
                      )}
                      {replies.length > 1 && reply.valorEstimado === lowest && <Badge variant="outline">Menor valor</Badge>}
                      {replies.length > 1 && reply.prazoDias === fastest && <Badge variant="outline">Menor prazo</Badge>}
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-raised p-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Valor estimado</dt>
                      <dd className="text-lg font-bold tabular-nums">
                        {reply.valorEstimado !== null ? formatCurrency(reply.valorEstimado) : "A combinar"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Prazo</dt>
                      <dd className="text-lg font-bold tabular-nums">
                        {reply.prazoDias !== null ? pluralize(reply.prazoDias, "dia", "dias") : "A combinar"}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-sm whitespace-pre-line">{reply.mensagem}</p>
                  <p className="text-xs text-muted-foreground">Respondido {formatRelativeDays(reply.createdAt)}</p>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {reply.proposalToken && (
                      <Button asChild variant="outline">
                        <Link href={`/p/${reply.proposalToken}`}>
                          <FileText aria-hidden />
                          Ver orçamento completo
                        </Link>
                      </Button>
                    )}
                    {p.whatsapp && (
                      <Button asChild variant="whatsapp">
                        <a
                          href={buildWhatsappLink(
                            p.whatsapp,
                            `Olá! Recebi sua proposta no InduxHub para "${quote.titulo}" e gostaria de conversar.`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle aria-hidden />
                          Conversar
                        </a>
                      </Button>
                    )}
                    {!closed &&
                      (confirming === p.id ? (
                        <div className="flex flex-col gap-2 rounded-xl border border-primary/40 p-3 text-sm sm:flex-row sm:items-center">
                          <span>Fechar o pedido com {p.nome}?</span>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => choose(p.id)} disabled={pending}>
                              {pending ? "Fechando…" : "Confirmar"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => setConfirming(p.id)}>
                          <CheckCircle2 aria-hidden />
                          Escolher este fornecedor
                        </Button>
                      ))}
                  </div>

                  {chosen && (review ? <ReviewDone review={review} /> : <ReviewForm quote={quote} prestador={p} />)}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {!closed && (
        <div className="text-center">
          <Button
            variant="link"
            onClick={() => window.confirm("Encerrar o pedido sem escolher fornecedor?") && choose(null)}
            disabled={pending}
          >
            Encerrar pedido sem escolher
          </Button>
        </div>
      )}
    </div>
  );
}

function ReviewDone({ review }: { review: MyReview }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border p-3 text-sm">
      <span className="flex items-center gap-2 font-medium">
        Sua avaliação
        <RatingStars value={review.nota} />
      </span>
      {review.comentario && <p className="text-muted-foreground">{review.comentario}</p>}
    </div>
  );
}

function ReviewForm({ quote, prestador }: { quote: QuoteDetail; prestador: QuoteReply["prestador"] }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-primary/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nota) return setError("Escolha de 1 a 5 estrelas.");
        startTransition(async () => {
          const result = await submitReview(quote.id, prestador.id, quote.titulo, { nota, comentario });
          if (!result.ok) setError(result.error);
        });
      }}
    >
      <h3 className="font-semibold">Como foi o serviço de {prestador.nome}?</h3>
      <p className="text-xs text-muted-foreground">Sua avaliação aparece no perfil público, com o nome da sua empresa.</p>
      {error && <Alert tone="error">{error}</Alert>}
      <StarInput name={`nota-${prestador.id}`} value={nota} onChange={setNota} />
      <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor={`comentario-${prestador.id}`}>
        Comentário <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <Textarea
        id={`comentario-${prestador.id}`}
        rows={3}
        maxLength={2000}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Qualidade, prazo, atendimento…"
      />
      <Button type="submit" className="sm:self-start" disabled={pending}>
        {pending ? "Enviando…" : "Publicar avaliação"}
      </Button>
    </form>
  );
}
