import "server-only";

import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type { Enums } from "@/types/database";

import type { Reputation } from "../reviews/reputation";

export type CompanyProfile = {
  id: string;
  slug: string;
  nomeFantasia: string;
  razaoSocial: string;
  descricao: string | null;
  logoUrl: string | null;
  capaUrl: string | null;
  site: string | null;
  whatsapp: string | null;
  email: string | null;
  anoFundacao: number | null;
  raioKm: number | null;
  premium: boolean;
  cidade: { nome: string; uf: string };
  categorias: { slug: string; nome: string }[];
  cidadesAtendidas: { slug: string; nome: string }[];
  fotos: { id: string; storagePath: string; legenda: string | null; tipo: Enums<"photo_kind"> }[];
  equipamentos: { id: string; nome: string; modelo: string | null; quantidade: number; capacidade: string | null }[];
  certificacoes: { id: string; nome: string; orgao: string | null; validade: string | null }[];
  clientes: { id: string; nome: string; logoUrl: string | null }[];
  reputation: Reputation;
};

export type CompanyReview = {
  id: string;
  nota: number;
  comentario: string | null;
  projetoDescricao: string | null;
  autor: string;
  createdAt: string;
};

const PROFILE_SELECT = `
  id, slug, nome_fantasia, razao_social, descricao, logo_url, capa_url, site, whatsapp, email,
  ano_fundacao, raio_km, premium,
  city:cities!city_id (nome, uf),
  company_categories (categories (slug, nome, ordem)),
  company_cities (cities (slug, nome)),
  company_photos (id, storage_path, legenda, tipo, ordem),
  equipment (id, nome, modelo, quantidade, capacidade),
  certifications (id, nome, orgao, validade),
  key_clients (id, nome, logo_url, ordem),
  company_stats (nota_media, total_avaliacoes, projetos_concluidos)
`;

/** Perfil público do prestador. `cache` deduplica a chamada entre metadata e página. */
export const getCompanyProfile = cache(async (slug: string): Promise<CompanyProfile | null> => {
  const { data, error } = await createPublicClient()
    .from("companies")
    .select(PROFILE_SELECT)
    .eq("slug", slug)
    .neq("tipo", "contratante")
    .order("ordem", { referencedTable: "company_photos" })
    .order("ordem", { referencedTable: "key_clients" })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const stats = data.company_stats;

  return {
    id: data.id,
    slug: data.slug,
    nomeFantasia: data.nome_fantasia,
    razaoSocial: data.razao_social,
    descricao: data.descricao,
    logoUrl: data.logo_url,
    capaUrl: data.capa_url,
    site: data.site,
    whatsapp: data.whatsapp,
    email: data.email,
    anoFundacao: data.ano_fundacao,
    raioKm: data.raio_km,
    premium: data.premium,
    cidade: data.city,
    categorias: data.company_categories
      .map((row) => row.categories)
      .sort((a, b) => a.ordem - b.ordem)
      .map(({ slug, nome }) => ({ slug, nome })),
    cidadesAtendidas: data.company_cities
      .map((row) => row.cities)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    fotos: data.company_photos.map((photo) => ({
      id: photo.id,
      storagePath: photo.storage_path,
      legenda: photo.legenda,
      tipo: photo.tipo,
    })),
    equipamentos: data.equipment,
    certificacoes: data.certifications,
    clientes: data.key_clients.map((client) => ({
      id: client.id,
      nome: client.nome,
      logoUrl: client.logo_url,
    })),
    reputation: {
      notaMedia: stats?.nota_media ?? null,
      totalAvaliacoes: stats?.total_avaliacoes ?? 0,
      projetosConcluidos: stats?.projetos_concluidos ?? 0,
    },
  };
});

const REVIEWS_LIMIT = 10;

export async function listCompanyReviews(companyId: string): Promise<CompanyReview[]> {
  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, nota, comentario, projeto_descricao, created_at, autor:companies!autor_company_id (nome_fantasia)")
    .eq("prestador_id", companyId)
    .order("created_at", { ascending: false })
    .limit(REVIEWS_LIMIT);
  if (error) throw error;

  return data.map((review) => ({
    id: review.id,
    nota: review.nota,
    comentario: review.comentario,
    projetoDescricao: review.projeto_descricao,
    autor: review.autor.nome_fantasia,
    createdAt: review.created_at,
  }));
}
