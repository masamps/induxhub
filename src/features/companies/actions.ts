"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/features/auth/session";
import { fail, INVALID_INPUT, ok, UNEXPECTED, type ActionResult } from "@/lib/action-result";
import { createServerSupabase } from "@/lib/supabase/server";

import { createCompanySchema, slugify, type CreateCompanyInput } from "./schemas";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

/** Slug livre a partir do nome; em colisão, acrescenta a cidade e depois um número. */
async function availableSlug(supabase: Supabase, nome: string, citySlug: string) {
  const base = slugify(nome) || "empresa";
  const candidates = [base, `${base}-${citySlug}`, ...Array.from({ length: 8 }, (_, i) => `${base}-${citySlug}-${i + 2}`)];
  const { data } = await supabase.from("companies").select("slug").in("slug", candidates);
  const taken = new Set(data?.map((c) => c.slug));
  return candidates.find((c) => !taken.has(c)) ?? `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createCompany(input: CreateCompanyInput): Promise<ActionResult<{ slug: string }>> {
  const user = await getUser();
  if (!user) return fail("Sua sessão expirou. Entre de novo para continuar.");

  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);
  const values = parsed.data;

  const supabase = await createServerSupabase();

  const { data: city } = await supabase.from("cities").select("slug").eq("id", values.cityId).single();
  if (!city) return fail("Cidade inválida.");

  const slug = await availableSlug(supabase, values.nomeFantasia, city.slug);
  const tipo = values.tipo === "prestador" && values.tambemContrata ? "ambos" : values.tipo;

  const { data: companyId, error } = await supabase.rpc("create_company", {
    p_tipo: tipo,
    p_slug: slug,
    p_razao_social: values.razaoSocial,
    p_nome_fantasia: values.nomeFantasia,
    p_cnpj: values.cnpj,
    p_city_id: values.cityId,
    p_whatsapp: values.whatsapp,
    p_email: values.email ?? user.email ?? undefined,
  });

  if (error) {
    if (error.code === "23505" && error.message.includes("cnpj")) {
      return fail("Este CNPJ já está cadastrado. Se a empresa é sua, entre com a conta que a cadastrou.");
    }
    console.error("create_company", error);
    return fail(UNEXPECTED);
  }

  if (values.tipo === "prestador") {
    const extraCities = values.cityIds.filter((id) => id !== values.cityId);
    const results = await Promise.all([
      supabase
        .from("companies")
        .update({ descricao: values.descricao, ano_fundacao: values.anoFundacao, raio_km: values.raioKm })
        .eq("id", companyId),
      supabase
        .from("company_categories")
        .insert(values.categoryIds.map((category_id) => ({ company_id: companyId, category_id }))),
      extraCities.length
        ? supabase.from("company_cities").insert(extraCities.map((city_id) => ({ company_id: companyId, city_id })))
        : null,
    ]);
    const failed = results.find((r) => r?.error);
    // A empresa já existe; o restante pode ser completado no painel.
    if (failed?.error) console.error("create_company details", failed.error);
  }

  revalidatePath("/");
  return ok({ slug });
}
