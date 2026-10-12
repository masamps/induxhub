"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyCompanies, isProvider } from "@/features/auth/session";
import { fail, INVALID_INPUT, ok, UNEXPECTED, type ActionResult } from "@/lib/action-result";
import { createServerSupabase } from "@/lib/supabase/server";

import { clientMissing, proposalSchema, proposalTotals, respondSchema, type ProposalInput } from "./schemas";

const uuid = z.uuid();

const HINT_MESSAGES: Record<string, string> = {
  proposal_not_draft: "Este orçamento já foi enviado e não pode ser editado. Crie uma nova versão.",
  proposal_no_items: "Adicione ao menos um item.",
  proposal_no_client: "Informe o nome do cliente.",
  proposal_expired: "A validade já passou. Ajuste a data.",
  proposal_final: "Este orçamento já foi respondido ou não está mais disponível.",
  proposal_login: "Entre com a conta da empresa que fez o pedido para responder.",
  proposal_no_version: "Só orçamentos enviados ou recusados ganham nova versão.",
  proposal_draft_exists: "Já existe um rascunho para este pedido. Continue por ele.",
  quote_closed: "Este pedido já foi fechado pelo solicitante.",
};

function dbError(scope: string, error: { code?: string; hint?: string | null; message?: string }) {
  if (error.hint && HINT_MESSAGES[error.hint]) return fail(HINT_MESSAGES[error.hint]);
  if (error.code === "42501") return fail("Sem permissão.");
  if (error.code === "23505") return fail("Já existe um rascunho para este pedido. Continue por ele.");
  console.error(scope, error);
  return fail(UNEXPECTED);
}

async function providerCompany() {
  const [company] = await getMyCompanies();
  return company && isProvider(company) ? company : null;
}

function revalidateProposal(id: string, quoteId: string | null) {
  revalidatePath("/painel/propostas");
  revalidatePath(`/painel/propostas/${id}`);
  if (quoteId) {
    revalidatePath(`/orcamentos/${quoteId}`);
    revalidatePath("/painel/orcamentos");
  }
}

/** Cria ou atualiza o rascunho. Com `enviar`, envia na sequência. */
export async function saveProposal(
  input: ProposalInput,
  id: string | null,
  enviar: boolean,
): Promise<ActionResult<{ id: string; erroEnvio?: string }>> {
  const company = await providerCompany();
  if (!company) return fail("Só fornecedores criam orçamentos.");
  if (id && !uuid.safeParse(id).success) return fail(INVALID_INPUT);

  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);
  const v = parsed.data;
  if (proposalTotals(v).total < 0) return fail("O desconto é maior que o total.");
  if (enviar && clientMissing(v)) return fail("Informe o nome do cliente.");

  const supabase = await createServerSupabase();
  const { data: savedId, error } = await supabase.rpc("save_proposal", {
    p_prestador_id: company.id,
    p_id: id ?? undefined,
    p_dados: {
      titulo: v.titulo,
      quote_id: v.quoteId,
      cliente_nome: v.clienteNome,
      cliente_documento: v.clienteDocumento,
      cliente_email: v.clienteEmail,
      cliente_whatsapp: v.clienteWhatsapp,
      observacoes: v.observacoes,
      condicoes_pagamento: v.condicoesPagamento,
      prazo_entrega_dias: v.prazoEntregaDias,
      validade: v.validade,
      desconto: v.desconto ?? 0,
      frete: v.frete ?? 0,
    },
    p_itens: v.itens.map((i) => ({
      descricao: i.descricao,
      unidade: i.unidade,
      quantidade: i.quantidade,
      valor_unitario: i.valorUnitario,
    })),
  });
  if (error) return dbError("save_proposal", error);

  if (enviar) {
    const { error: sendError } = await supabase.rpc("send_proposal", { p_id: savedId });
    if (sendError) {
      // O rascunho ficou salvo; quem chamou segue editando por ele.
      revalidateProposal(savedId, v.quoteId);
      const failed = dbError("send_proposal", sendError);
      return ok({ id: savedId, erroEnvio: failed.error });
    }
  }

  revalidateProposal(savedId, v.quoteId);
  return ok({ id: savedId });
}

async function quoteOf(id: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("proposals").select("quote_id").eq("id", id).maybeSingle();
  return data?.quote_id ?? null;
}

/** Duplica (novo orçamento) ou cria nova versão (mesmo número). Devolve o rascunho criado. */
export async function copyProposal(id: string, novaVersao: boolean): Promise<ActionResult<{ id: string }>> {
  if (!uuid.safeParse(id).success) return fail(INVALID_INPUT);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("copy_proposal", { p_id: id, p_nova_versao: novaVersao });
  if (error) return dbError("copy_proposal", error);
  revalidatePath("/painel/propostas");
  return ok({ id: data });
}

/** Rascunho é descartado; enviado vira cancelado. */
export async function cancelProposal(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail(INVALID_INPUT);
  const quoteId = await quoteOf(id);
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("cancel_proposal", { p_id: id });
  if (error) return dbError("cancel_proposal", error);
  revalidateProposal(id, quoteId);
  return ok();
}

/** Aceite ou recusa pelo cliente, com ou sem login. */
export async function respondProposal(token: string, input: { aceito: boolean; motivo: string }): Promise<ActionResult> {
  if (!uuid.safeParse(token).success) return fail(INVALID_INPUT);
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("respond_proposal", {
    p_token: token,
    p_aceito: parsed.data.aceito,
    p_motivo: parsed.data.motivo || undefined,
  });
  if (error) return dbError("respond_proposal", error);

  revalidatePath(`/p/${token}`);
  revalidatePath("/painel/propostas");
  revalidatePath("/orcamentos/[id]", "page");
  return ok();
}
