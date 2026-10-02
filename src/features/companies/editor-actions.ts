"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyCompanies, isProvider, type MyCompany } from "@/features/auth/session";
import { fail, INVALID_INPUT, ok, UNEXPECTED, type ActionResult } from "@/lib/action-result";
import { companyMediaUrl } from "@/lib/media";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  certificationSchema,
  clientSchema,
  equipmentSchema,
  photoSchema,
  serviceAreaSchema,
  updateCompanySchema,
  type CertificationInput,
  type ClientInput,
  type EquipmentInput,
  type PhotoInput,
  type ServiceAreaInput,
  type UpdateCompanyInput,
} from "./schemas";

const uuid = z.uuid();

/** Empresa ativa do usuário. O RLS no banco é a garantia final; isto só dá mensagens melhores. */
async function editableCompany(): Promise<MyCompany | null> {
  const [company] = await getMyCompanies();
  return company ?? null;
}

function revalidateProfile(company: MyCompany) {
  revalidatePath(`/prestador/${company.slug}`);
  revalidatePath("/painel/perfil");
  revalidatePath("/painel");
}

function ownsPath(company: MyCompany, path: string) {
  return path.startsWith(`${company.id}/`) && !path.includes("..");
}

const NO_COMPANY = "Sua sessão expirou. Entre de novo.";

export async function updateCompanyProfile(
  input: UpdateCompanyInput & { tambemContrata?: boolean },
): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company) return fail(NO_COMPANY);

  const parsed = updateCompanySchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("companies")
    .update({
      razao_social: v.razaoSocial,
      nome_fantasia: v.nomeFantasia,
      city_id: v.cityId,
      whatsapp: v.whatsapp,
      email: v.email,
      site: v.site,
      descricao: v.descricao,
      ano_fundacao: v.anoFundacao,
      raio_km: v.raioKm,
    })
    .eq("id", company.id);
  if (error) {
    console.error("update company", error);
    return fail(UNEXPECTED);
  }

  if (isProvider(company) && typeof input.tambemContrata === "boolean" && input.tambemContrata !== (company.tipo === "ambos")) {
    const { error: tipoError } = await supabase.rpc("set_company_buyer", {
      p_company_id: company.id,
      p_enabled: input.tambemContrata,
    });
    if (tipoError) {
      console.error("set_company_buyer", tipoError);
      return fail(UNEXPECTED);
    }
  }

  revalidateProfile(company);
  revalidatePath("/", "layout");
  return ok();
}

export async function updateServiceArea(input: ServiceAreaInput): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company) return fail(NO_COMPANY);

  const parsed = serviceAreaSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? INVALID_INPUT);
  const { categoryIds, cityIds } = parsed.data;

  const supabase = await createServerSupabase();
  const [currentCategories, currentCities] = await Promise.all([
    supabase.from("company_categories").select("category_id").eq("company_id", company.id),
    supabase.from("company_cities").select("city_id").eq("company_id", company.id),
  ]);
  const oldCategories = currentCategories.data?.map((c) => c.category_id) ?? [];
  const oldCities = currentCities.data?.map((c) => c.city_id) ?? [];

  const removeCategories = oldCategories.filter((id) => !categoryIds.includes(id));
  const addCategories = categoryIds.filter((id) => !oldCategories.includes(id));
  const removeCities = oldCities.filter((id) => !cityIds.includes(id));
  const addCities = cityIds.filter((id) => !oldCities.includes(id));

  const ops = [
    removeCategories.length &&
      supabase.from("company_categories").delete().eq("company_id", company.id).in("category_id", removeCategories),
    addCategories.length &&
      supabase
        .from("company_categories")
        .insert(addCategories.map((category_id) => ({ company_id: company.id, category_id }))),
    removeCities.length &&
      supabase.from("company_cities").delete().eq("company_id", company.id).in("city_id", removeCities),
    addCities.length &&
      supabase.from("company_cities").insert(addCities.map((city_id) => ({ company_id: company.id, city_id }))),
  ];
  const results = await Promise.all(ops.map((op) => op || null));
  const failed = results.find((r) => r?.error);
  if (failed?.error) {
    console.error("service area", failed.error);
    return fail(UNEXPECTED);
  }

  revalidateProfile(company);
  return ok();
}

export async function setLogo(path: string | null): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company) return fail(NO_COMPANY);
  if (path && !ownsPath(company, path)) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { data: current } = await supabase.from("companies").select("logo_url").eq("id", company.id).single();
  const { error } = await supabase
    .from("companies")
    .update({ logo_url: path ? companyMediaUrl(path) : null })
    .eq("id", company.id);
  if (error) return fail(UNEXPECTED);

  // Remove o arquivo anterior do Storage (se era nosso).
  const previous = current?.logo_url?.split("/company-media/")[1];
  if (previous && previous !== path && ownsPath(company, previous)) {
    await supabase.storage.from("company-media").remove([previous]);
  }

  revalidateProfile(company);
  revalidatePath("/buscar");
  return ok();
}

export async function addPhoto(input: PhotoInput): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company) return fail(NO_COMPANY);
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success || !ownsPath(company, parsed.data.path)) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("company_photos")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id);
  const { error } = await supabase.from("company_photos").insert({
    company_id: company.id,
    storage_path: parsed.data.path,
    legenda: parsed.data.legenda,
    tipo: "trabalho",
    ordem: count ?? 0,
  });
  if (error) {
    await supabase.storage.from("company-media").remove([parsed.data.path]);
    if (error.hint === "photo_limit_reached") {
      return fail(company.premium ? "Limite de fotos do plano atingido." : "O plano gratuito permite até 5 fotos. Remova uma para enviar outra.");
    }
    console.error("add photo", error);
    return fail(UNEXPECTED);
  }

  revalidateProfile(company);
  return ok();
}

export async function removePhoto(id: string): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company || !uuid.safeParse(id).success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("company_photos")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id)
    .select("storage_path")
    .maybeSingle();
  if (error) return fail(UNEXPECTED);
  if (data && ownsPath(company, data.storage_path)) {
    await supabase.storage.from("company-media").remove([data.storage_path]);
  }

  revalidateProfile(company);
  return ok();
}

export async function addEquipment(input: EquipmentInput): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company) return fail(NO_COMPANY);
  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("equipment").insert({ company_id: company.id, ...parsed.data });
  if (error) return fail(UNEXPECTED);

  revalidateProfile(company);
  return ok();
}

export async function addCertification(input: CertificationInput): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company) return fail(NO_COMPANY);
  const parsed = certificationSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);
  const { arquivoPath, ...values } = parsed.data;
  if (arquivoPath && !ownsPath(company, arquivoPath)) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("certifications")
    .insert({ company_id: company.id, ...values, arquivo_path: arquivoPath });
  if (error) return fail(UNEXPECTED);

  revalidateProfile(company);
  return ok();
}

export async function addClient(input: ClientInput): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company) return fail(NO_COMPANY);
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("key_clients")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id);
  const { error } = await supabase
    .from("key_clients")
    .insert({ company_id: company.id, nome: parsed.data.nome, ordem: count ?? 0 });
  if (error) return fail(UNEXPECTED);

  revalidateProfile(company);
  return ok();
}

const REMOVABLE = {
  equipment: { table: "equipment", bucket: null },
  certifications: { table: "certifications", bucket: "certifications" },
  key_clients: { table: "key_clients", bucket: null },
} as const;

export async function removeProfileItem(kind: keyof typeof REMOVABLE, id: string): Promise<ActionResult> {
  const company = await editableCompany();
  if (!company || !uuid.safeParse(id).success || !(kind in REMOVABLE)) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  if (kind === "certifications") {
    const { data } = await supabase
      .from("certifications")
      .delete()
      .eq("id", id)
      .eq("company_id", company.id)
      .select("arquivo_path")
      .maybeSingle();
    if (data?.arquivo_path && ownsPath(company, data.arquivo_path)) {
      await supabase.storage.from("certifications").remove([data.arquivo_path]);
    }
  } else {
    const { error } = await supabase.from(REMOVABLE[kind].table).delete().eq("id", id).eq("company_id", company.id);
    if (error) return fail(UNEXPECTED);
  }

  revalidateProfile(company);
  return ok();
}
