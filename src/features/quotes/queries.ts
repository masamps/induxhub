import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type QuoteStatus = Enums<"quote_status">;

export type QuoteSummary = {
  id: string;
  titulo: string;
  status: QuoteStatus;
  categoria: string;
  cidade: string;
  createdAt: string;
  respostas: number;
  destinatarios: number;
};

export async function listMyQuotes(companyId: string, limit = 50): Promise<QuoteSummary[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("quote_requests")
    .select(
      "id, titulo, status, created_at, categories (nome), cities (nome), quote_replies (count), quote_recipients (count)",
    )
    .eq("solicitante_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.map((q) => ({
    id: q.id,
    titulo: q.titulo,
    status: q.status,
    categoria: q.categories.nome,
    cidade: q.cities.nome,
    createdAt: q.created_at,
    respostas: q.quote_replies[0]?.count ?? 0,
    destinatarios: q.quote_recipients[0]?.count ?? 0,
  }));
}

export async function countUnreadQuotes(providerId: string) {
  const supabase = await createServerSupabase();
  const { count, error } = await supabase
    .from("quote_recipients")
    .select("quote_id", { count: "exact", head: true })
    .eq("prestador_id", providerId)
    .is("visualizado_em", null);
  if (error) throw error;
  return count ?? 0;
}

export type InboxItem = {
  id: string;
  titulo: string;
  status: QuoteStatus;
  categoria: string;
  cidade: string;
  solicitante: string;
  prazoDesejado: string | null;
  enviadoEm: string;
  visualizadoEm: string | null;
  respondidoEm: string | null;
  escolhido: boolean;
};

export type InboxFilter = "todos" | "novos" | "respondidos";

export async function listInbox(providerId: string, filter: InboxFilter = "todos"): Promise<InboxItem[]> {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("quote_recipients")
    .select(
      `enviado_em, visualizado_em, respondido_em,
       quote_requests (id, titulo, status, prazo_desejado, prestador_escolhido_id,
         categories (nome), cities (nome), solicitante:companies!solicitante_id (nome_fantasia))`,
    )
    .eq("prestador_id", providerId)
    .order("enviado_em", { ascending: false })
    .limit(100);
  if (filter === "novos") query = query.is("respondido_em", null);
  if (filter === "respondidos") query = query.not("respondido_em", "is", null);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((r) => ({
    id: r.quote_requests.id,
    titulo: r.quote_requests.titulo,
    status: r.quote_requests.status,
    categoria: r.quote_requests.categories.nome,
    cidade: r.quote_requests.cities.nome,
    solicitante: r.quote_requests.solicitante.nome_fantasia,
    prazoDesejado: r.quote_requests.prazo_desejado,
    enviadoEm: r.enviado_em,
    visualizadoEm: r.visualizado_em,
    respondidoEm: r.respondido_em,
    escolhido: r.quote_requests.prestador_escolhido_id === providerId,
  }));
}

export type QuoteDetail = {
  id: string;
  titulo: string;
  descricao: string;
  status: QuoteStatus;
  categoria: string;
  cidade: string;
  prazoDesejado: string | null;
  createdAt: string;
  fechadoEm: string | null;
  escolhidoId: string | null;
  solicitante: { id: string; nome: string; slug: string; whatsapp: string | null; cidade: string };
  anexos: { path: string; nome: string; url: string | null }[];
};

export type QuoteReply = {
  id: string;
  mensagem: string;
  valorEstimado: number | null;
  prazoDias: number | null;
  createdAt: string;
  prestador: {
    id: string;
    nome: string;
    slug: string;
    whatsapp: string | null;
    premium: boolean;
    cidade: string;
    notaMedia: number | null;
    totalAvaliacoes: number;
    projetosConcluidos: number;
  };
};

export type MyReview = { prestadorId: string; nota: number; comentario: string | null };

/** Nome legível do anexo: tira a pasta e o prefixo aleatório do upload. */
function attachmentName(path: string) {
  return path.split("/").pop()!.replace(/^[0-9a-f]{8}-/, "");
}

async function loadQuote(id: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("quote_requests")
    .select(
      `id, titulo, descricao, status, prazo_desejado, anexos, created_at, fechado_em, prestador_escolhido_id,
       categories (nome), cities (nome),
       solicitante:companies!solicitante_id (id, nome_fantasia, slug, whatsapp, city:cities!city_id (nome))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const signed = data.anexos.length
    ? (await supabase.storage.from("quote-attachments").createSignedUrls(data.anexos, 60 * 10)).data
    : [];

  const quote: QuoteDetail = {
    id: data.id,
    titulo: data.titulo,
    descricao: data.descricao,
    status: data.status,
    categoria: data.categories.nome,
    cidade: data.cities.nome,
    prazoDesejado: data.prazo_desejado,
    createdAt: data.created_at,
    fechadoEm: data.fechado_em,
    escolhidoId: data.prestador_escolhido_id,
    solicitante: {
      id: data.solicitante.id,
      nome: data.solicitante.nome_fantasia,
      slug: data.solicitante.slug,
      whatsapp: data.solicitante.whatsapp,
      cidade: data.solicitante.city.nome,
    },
    anexos: data.anexos.map((path) => ({
      path,
      nome: attachmentName(path),
      url: signed?.find((s) => s.path === path)?.signedUrl ?? null,
    })),
  };
  return { supabase, quote };
}

/** Visão do solicitante: pedido, respostas para comparar e avaliações já feitas. */
export async function getQuoteForOwner(id: string) {
  const loaded = await loadQuote(id);
  if (!loaded) return null;
  const { supabase, quote } = loaded;

  const [replies, recipients, reviews] = await Promise.all([
    supabase
      .from("quote_replies")
      .select(
        `id, mensagem, valor_estimado, prazo_dias, created_at,
         prestador:companies!prestador_id (id, nome_fantasia, slug, whatsapp, premium, city:cities!city_id (nome),
           company_stats (nota_media, total_avaliacoes, projetos_concluidos))`,
      )
      .eq("quote_id", id)
      .order("created_at"),
    supabase.from("quote_recipients").select("visualizado_em").eq("quote_id", id),
    supabase.from("reviews").select("prestador_id, nota, comentario").eq("quote_id", id),
  ]);
  if (replies.error) throw replies.error;
  if (recipients.error) throw recipients.error;
  if (reviews.error) throw reviews.error;

  return {
    quote,
    destinatarios: recipients.data.length,
    visualizaram: recipients.data.filter((r) => r.visualizado_em).length,
    replies: replies.data.map(
      (r): QuoteReply => ({
        id: r.id,
        mensagem: r.mensagem,
        valorEstimado: r.valor_estimado,
        prazoDias: r.prazo_dias,
        createdAt: r.created_at,
        prestador: {
          id: r.prestador.id,
          nome: r.prestador.nome_fantasia,
          slug: r.prestador.slug,
          whatsapp: r.prestador.whatsapp,
          premium: r.prestador.premium,
          cidade: r.prestador.city.nome,
          notaMedia: r.prestador.company_stats?.nota_media ?? null,
          totalAvaliacoes: r.prestador.company_stats?.total_avaliacoes ?? 0,
          projetosConcluidos: r.prestador.company_stats?.projetos_concluidos ?? 0,
        },
      }),
    ),
    reviews: reviews.data.map((r): MyReview => ({ prestadorId: r.prestador_id, nota: r.nota, comentario: r.comentario })),
  };
}

/** Visão do prestador destinatário: pedido e a própria resposta. */
export async function getQuoteForProvider(id: string, providerId: string) {
  const loaded = await loadQuote(id);
  if (!loaded) return null;
  const { supabase, quote } = loaded;

  const [recipient, reply] = await Promise.all([
    supabase
      .from("quote_recipients")
      .select("enviado_em, visualizado_em, respondido_em")
      .eq("quote_id", id)
      .eq("prestador_id", providerId)
      .maybeSingle(),
    supabase
      .from("quote_replies")
      .select("id, mensagem, valor_estimado, prazo_dias, created_at")
      .eq("quote_id", id)
      .eq("prestador_id", providerId)
      .maybeSingle(),
  ]);
  if (recipient.error) throw recipient.error;
  if (reply.error) throw reply.error;
  if (!recipient.data) return null;

  return {
    quote,
    recipient: recipient.data,
    reply: reply.data
      ? {
          mensagem: reply.data.mensagem,
          valorEstimado: reply.data.valor_estimado,
          prazoDias: reply.data.prazo_dias,
          createdAt: reply.data.created_at,
        }
      : null,
  };
}
