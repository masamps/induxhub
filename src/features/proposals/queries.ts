import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

import { effectiveStatus, type ProposalStatus } from "./format";
import type { Unit } from "./schemas";

export type ProposalListItem = {
  id: string;
  numero: number | null;
  versao: number;
  titulo: string;
  clienteNome: string | null;
  total: number;
  status: ProposalStatus;
  validade: string;
  enviadoEm: string | null;
  visualizadoEm: string | null;
  updatedAt: string;
  quoteId: string | null;
};

export type ProposalFilter = "todos" | "rascunhos" | "enviados" | "aceitos";

const FILTER_STATUS: Record<ProposalFilter, Enums<"proposal_status">[] | null> = {
  todos: ["rascunho", "enviado", "aceito", "recusado", "cancelado"],
  rascunhos: ["rascunho"],
  enviados: ["enviado"],
  aceitos: ["aceito"],
};

export async function listMyProposals(providerId: string, filter: ProposalFilter = "todos"): Promise<ProposalListItem[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("proposals")
    .select("id, numero, versao, titulo, cliente_nome, total, status, validade, enviado_em, visualizado_em, updated_at, quote_id")
    .eq("prestador_id", providerId)
    .in("status", FILTER_STATUS[filter] ?? [])
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  return data.map((p) => ({
    id: p.id,
    numero: p.numero,
    versao: p.versao,
    titulo: p.titulo,
    clienteNome: p.cliente_nome,
    total: p.total,
    status: effectiveStatus(p.status, p.validade),
    validade: p.validade,
    enviadoEm: p.enviado_em,
    visualizadoEm: p.visualizado_em,
    updatedAt: p.updated_at,
    quoteId: p.quote_id,
  }));
}

export type ProposalItem = {
  descricao: string;
  unidade: Unit;
  quantidade: number;
  valorUnitario: number;
  total: number;
};

export type ProposalDetail = {
  id: string;
  prestadorId: string;
  numero: number | null;
  versao: number;
  origemId: string | null;
  quoteId: string | null;
  quoteTitulo: string | null;
  titulo: string;
  clienteNome: string | null;
  clienteDocumento: string | null;
  clienteEmail: string | null;
  clienteWhatsapp: string | null;
  observacoes: string | null;
  condicoesPagamento: string | null;
  prazoEntregaDias: number | null;
  validade: string;
  desconto: number;
  frete: number;
  subtotal: number;
  total: number;
  status: ProposalStatus;
  token: string;
  enviadoEm: string | null;
  visualizadoEm: string | null;
  respondidoEm: string | null;
  motivoRecusa: string | null;
  createdAt: string;
  itens: ProposalItem[];
};

/** Orçamento completo para o fornecedor. RLS garante que só membros leem. */
export async function getProposalForProvider(id: string, providerId: string): Promise<ProposalDetail | null> {
  const supabase = await createServerSupabase();
  const { data: p, error } = await supabase
    .from("proposals")
    .select(
      `*, quote:quote_requests!quote_id (titulo),
       proposal_items (descricao, unidade, quantidade, valor_unitario, total, ordem)`,
    )
    .eq("id", id)
    .eq("prestador_id", providerId)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;

  return {
    id: p.id,
    prestadorId: p.prestador_id,
    numero: p.numero,
    versao: p.versao,
    origemId: p.origem_id,
    quoteId: p.quote_id,
    quoteTitulo: p.quote?.titulo ?? null,
    titulo: p.titulo,
    clienteNome: p.cliente_nome,
    clienteDocumento: p.cliente_documento,
    clienteEmail: p.cliente_email,
    clienteWhatsapp: p.cliente_whatsapp,
    observacoes: p.observacoes,
    condicoesPagamento: p.condicoes_pagamento,
    prazoEntregaDias: p.prazo_entrega_dias,
    validade: p.validade,
    desconto: p.desconto,
    frete: p.frete,
    subtotal: p.subtotal,
    total: p.total,
    status: effectiveStatus(p.status, p.validade),
    token: p.token_publico,
    enviadoEm: p.enviado_em,
    visualizadoEm: p.visualizado_em,
    respondidoEm: p.respondido_em,
    motivoRecusa: p.motivo_recusa,
    createdAt: p.created_at,
    itens: [...p.proposal_items]
      .sort((a, b) => a.ordem - b.ordem)
      .map((i) => ({
        descricao: i.descricao,
        unidade: i.unidade as Unit,
        quantidade: i.quantidade,
        valorUnitario: i.valor_unitario,
        total: i.total ?? 0,
      })),
  };
}

/** Rascunho já aberto pelo fornecedor para um pedido, se houver. */
export async function findQuoteDraft(quoteId: string, providerId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("proposals")
    .select("id")
    .eq("quote_id", quoteId)
    .eq("prestador_id", providerId)
    .eq("status", "rascunho")
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Pedido que o fornecedor pode orçar: recebido e ainda aberto. */
export async function getQuoteToPropose(quoteId: string, providerId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, titulo, descricao, status, prazo_desejado, solicitante:companies!solicitante_id (nome_fantasia), quote_recipients!inner (prestador_id)")
    .eq("id", quoteId)
    .eq("quote_recipients.prestador_id", providerId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status === "fechado") return null;
  return { id: data.id, titulo: data.titulo, descricao: data.descricao, solicitante: data.solicitante.nome_fantasia };
}

export type PublicProposal = {
  id: string;
  numero: number;
  versao: number;
  status: ProposalStatus;
  titulo: string;
  quoteId: string | null;
  clienteNome: string;
  clienteDocumento: string | null;
  observacoes: string | null;
  condicoesPagamento: string | null;
  prazoEntregaDias: number | null;
  validade: string;
  desconto: number;
  frete: number;
  subtotal: number;
  total: number;
  enviadoEm: string;
  respondidoEm: string | null;
  motivoRecusa: string | null;
  eFornecedor: boolean;
  podeResponder: boolean;
  itens: ProposalItem[];
  fornecedor: {
    id: string;
    slug: string;
    nome: string;
    razaoSocial: string;
    cnpj: string;
    logoUrl: string | null;
    whatsapp: string | null;
    email: string | null;
    cidade: string | null;
    uf: string | null;
  };
};

type RawPublic = {
  id: string;
  numero: number;
  versao: number;
  status: ProposalStatus;
  titulo: string;
  quote_id: string | null;
  cliente_nome: string;
  cliente_documento: string | null;
  observacoes: string | null;
  condicoes_pagamento: string | null;
  prazo_entrega_dias: number | null;
  validade: string;
  desconto: number;
  frete: number;
  subtotal: number;
  total: number;
  enviado_em: string;
  respondido_em: string | null;
  motivo_recusa: string | null;
  e_fornecedor: boolean;
  pode_responder: boolean;
  itens: { descricao: string; unidade: Unit; quantidade: number; valor_unitario: number; total: number }[];
  fornecedor: {
    id: string;
    slug: string;
    nome: string;
    razao_social: string;
    cnpj: string;
    logo_url: string | null;
    whatsapp: string | null;
    email: string | null;
    cidade: string | null;
    uf: string | null;
  };
};

/** Orçamento pelo link público. Funciona sem login; abrir marca como visto. */
export async function getPublicProposal(token: string): Promise<PublicProposal | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("get_public_proposal", { p_token: token });
  if (error) throw error;
  if (!data) return null;
  const p = data as unknown as RawPublic;

  return {
    id: p.id,
    numero: p.numero,
    versao: p.versao,
    status: p.status,
    titulo: p.titulo,
    quoteId: p.quote_id,
    clienteNome: p.cliente_nome,
    clienteDocumento: p.cliente_documento,
    observacoes: p.observacoes,
    condicoesPagamento: p.condicoes_pagamento,
    prazoEntregaDias: p.prazo_entrega_dias,
    validade: p.validade,
    desconto: Number(p.desconto),
    frete: Number(p.frete),
    subtotal: Number(p.subtotal),
    total: Number(p.total),
    enviadoEm: p.enviado_em,
    respondidoEm: p.respondido_em,
    motivoRecusa: p.motivo_recusa,
    eFornecedor: p.e_fornecedor,
    podeResponder: p.pode_responder,
    itens: p.itens.map((i) => ({
      descricao: i.descricao,
      unidade: i.unidade,
      quantidade: Number(i.quantidade),
      valorUnitario: Number(i.valor_unitario),
      total: Number(i.total),
    })),
    fornecedor: {
      id: p.fornecedor.id,
      slug: p.fornecedor.slug,
      nome: p.fornecedor.nome,
      razaoSocial: p.fornecedor.razao_social,
      cnpj: p.fornecedor.cnpj,
      logoUrl: p.fornecedor.logo_url,
      whatsapp: p.fornecedor.whatsapp,
      email: p.fornecedor.email,
      cidade: p.fornecedor.cidade,
      uf: p.fornecedor.uf,
    },
  };
}

/** Contagem para o painel: orçamentos enviados aguardando o cliente. */
export async function countOpenProposals(providerId: string) {
  const supabase = await createServerSupabase();
  const { count, error } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("prestador_id", providerId)
    .eq("status", "enviado");
  if (error) throw error;
  return count ?? 0;
}
