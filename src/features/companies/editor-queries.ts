import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type EditableProfile = Pick<
  Tables<"companies">,
  | "id"
  | "slug"
  | "tipo"
  | "premium"
  | "cnpj"
  | "razao_social"
  | "nome_fantasia"
  | "city_id"
  | "whatsapp"
  | "email"
  | "site"
  | "descricao"
  | "ano_fundacao"
  | "raio_km"
  | "logo_url"
> & {
  categoryIds: number[];
  cityIds: number[];
  photos: { id: string; storagePath: string; legenda: string | null; tipo: string }[];
  equipment: Tables<"equipment">[];
  certifications: (Tables<"certifications"> & { arquivoUrl: string | null })[];
  clients: Tables<"key_clients">[];
};

export async function getEditableProfile(companyId: string): Promise<EditableProfile> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `id, slug, tipo, premium, cnpj, razao_social, nome_fantasia, city_id, whatsapp, email, site, descricao,
       ano_fundacao, raio_km, logo_url,
       company_categories (category_id), company_cities (city_id),
       company_photos (id, storage_path, legenda, tipo, ordem, created_at),
       equipment (*), certifications (*), key_clients (*)`,
    )
    .eq("id", companyId)
    .single();
  if (error) throw error;

  const certPaths = data.certifications.flatMap((c) => (c.arquivo_path ? [c.arquivo_path] : []));
  const signed = certPaths.length
    ? (await supabase.storage.from("certifications").createSignedUrls(certPaths, 60 * 10)).data
    : [];

  const { company_categories, company_cities, company_photos, equipment, certifications, key_clients, ...company } = data;
  return {
    ...company,
    categoryIds: company_categories.map((c) => c.category_id),
    cityIds: company_cities.map((c) => c.city_id),
    photos: [...company_photos]
      .sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at))
      .map((p) => ({ id: p.id, storagePath: p.storage_path, legenda: p.legenda, tipo: p.tipo })),
    equipment: [...equipment].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    certifications: [...certifications]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({ ...c, arquivoUrl: signed?.find((s) => s.path === c.arquivo_path)?.signedUrl ?? null })),
    clients: [...key_clients].sort((a, b) => a.ordem - b.ordem),
  };
}
