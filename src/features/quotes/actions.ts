"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyCompanies, isBuyer, isProvider } from "@/features/auth/session";
import { fail, INVALID_INPUT, ok, UNEXPECTED, type ActionResult } from "@/lib/action-result";
import { createServerSupabase } from "@/lib/supabase/server";

import { newQuoteSchema, replySchema, reviewSchema, type NewQuoteInput, type ReplyInput, type ReviewInput } from "./schemas";

const uuid = z.uuid();

async function activeCompany() {
  const [company] = await getMyCompanies();
  return company ?? null;
}

/** Quantos prestadores recebem o pedido (mesma regra da função do banco, sem a própria empresa). */
export async function previewRecipients(categoryId: number, cityId: number): Promise<number> {
  const company = await activeCompany();
  const supabase = await createServerSupabase();
  const [{ data: category }, { data: city }] = await Promise.all([
    supabase.from("categories").select("slug").eq("id", categoryId).maybeSingle(),
    supabase.from("cities").select("slug").eq("id", cityId).maybeSingle(),
  ]);
  if (!category || !city) return 0;

  const { data } = await supabase.rpc("search_companies", {
    p_city_slug: city.slug,
    p_category_slug: category.slug,
    p_limit: 50,
  });
  return Math.min((data ?? []).filter((c) => c.id !== company?.id).length, 30);
}

export async function createQuoteRequest(input: NewQuoteInput): Promise<ActionResult<{ id: string }>> {
  const company = await activeCompany();
  if (!company) return fail("Cadastre sua empresa para pedir orçamentos.");
  if (!isBuyer(company)) return fail("Sua empresa está cadastrada só como prestadora. Ative a opção de contratar no perfil.");

  const parsed = newQuoteSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("create_quote_request", {
    p_solicitante_id: company.id,
    p_titulo: v.titulo,
    p_descricao: v.descricao,
    p_category_id: v.categoryId,
    p_city_id: v.cityId,
    p_prazo_desejado: v.prazoDesejado ?? undefined,
    p_anexos: v.anexos,
  });
  if (error) {
    console.error("create_quote_request", error);
    return fail(UNEXPECTED);
  }

  revalidatePath("/orcamentos");
  return ok({ id: data });
}

export async function replyToQuote(quoteId: string, input: ReplyInput): Promise<ActionResult> {
  const company = await activeCompany();
  if (!company || !isProvider(company) || !uuid.safeParse(quoteId).success) return fail("Sem permissão.");

  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("reply_to_quote", {
    p_quote_id: quoteId,
    p_prestador_id: company.id,
    p_mensagem: parsed.data.mensagem,
    p_valor_estimado: parsed.data.valorEstimado ?? undefined,
    p_prazo_dias: parsed.data.prazoDias ?? undefined,
  });
  if (error) {
    if (error.hint === "quote_closed") return fail("Este pedido já foi fechado pelo solicitante.");
    if (error.code === "23505") return fail("Você já respondeu este pedido.");
    console.error("reply_to_quote", error);
    return fail(UNEXPECTED);
  }

  revalidatePath(`/orcamentos/${quoteId}`);
  revalidatePath("/painel/orcamentos");
  return ok();
}

/** Fecha o pedido. Com prestador escolhido, conta como projeto concluído dele. */
export async function closeQuote(quoteId: string, prestadorId: string | null): Promise<ActionResult> {
  if (!uuid.safeParse(quoteId).success || (prestadorId && !uuid.safeParse(prestadorId).success)) {
    return fail(INVALID_INPUT);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("close_quote", {
    p_quote_id: quoteId,
    p_prestador_escolhido_id: prestadorId ?? undefined,
  });
  if (error) {
    console.error("close_quote", error);
    return fail(error.code === "42501" ? "Sem permissão." : UNEXPECTED);
  }

  revalidatePath(`/orcamentos/${quoteId}`);
  revalidatePath("/orcamentos");
  return ok();
}

export async function submitReview(
  quoteId: string,
  prestadorId: string,
  projeto: string,
  input: ReviewInput,
): Promise<ActionResult> {
  const company = await activeCompany();
  if (!company || !uuid.safeParse(quoteId).success || !uuid.safeParse(prestadorId).success) {
    return fail("Sem permissão.");
  }

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("reviews").insert({
    quote_id: quoteId,
    prestador_id: prestadorId,
    autor_company_id: company.id,
    autor_user_id: user?.id,
    nota: parsed.data.nota,
    comentario: parsed.data.comentario,
    projeto_descricao: projeto.slice(0, 300),
  });
  if (error) {
    if (error.code === "23505") return fail("Você já avaliou este fornecedor neste pedido.");
    if (error.code === "42501") return fail("Só é possível avaliar quem respondeu ao seu pedido.");
    console.error("review insert", error);
    return fail(UNEXPECTED);
  }

  const { data: provider } = await supabase.from("companies").select("slug").eq("id", prestadorId).single();
  if (provider) revalidatePath(`/prestador/${provider.slug}`);
  revalidatePath(`/orcamentos/${quoteId}`);
  return ok();
}
