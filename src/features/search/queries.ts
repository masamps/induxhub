import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import type { Reputation } from "../reviews/reputation";
import { SEARCH_PAGE_SIZE, type SearchFilters } from "./schema";

export type CompanyCardData = {
  id: string;
  slug: string;
  nomeFantasia: string;
  descricao: string | null;
  logoUrl: string | null;
  premium: boolean;
  whatsapp: string | null;
  cidade: string;
  uf: string;
  categorias: string[];
  reputation: Reputation;
};

export type SearchResult = {
  items: CompanyCardData[];
  total: number;
  page: number;
  pageCount: number;
};

export async function searchCompanies(
  filters: SearchFilters,
  pageSize = SEARCH_PAGE_SIZE,
): Promise<SearchResult> {
  const { data, error } = await createPublicClient().rpc("search_companies", {
    p_query: filters.q,
    p_city_slug: filters.cidade,
    p_category_slug: filters.categoria,
    p_sort: filters.ordem,
    p_limit: pageSize,
    p_offset: (filters.pagina - 1) * pageSize,
  });
  if (error) throw error;

  const total = data[0]?.total_count ?? 0;

  return {
    // Tipos gerados de RPC não marcam colunas nulas; o mapeamento abaixo trata isso.
    items: data.map((row) => ({
      id: row.id,
      slug: row.slug,
      nomeFantasia: row.nome_fantasia,
      descricao: row.descricao ?? null,
      logoUrl: row.logo_url ?? null,
      premium: row.premium,
      whatsapp: row.whatsapp ?? null,
      cidade: row.cidade,
      uf: row.uf,
      categorias: row.categorias ?? [],
      reputation: {
        notaMedia: row.nota_media === null ? null : Number(row.nota_media),
        totalAvaliacoes: row.total_avaliacoes,
        projetosConcluidos: row.projetos_concluidos,
      },
    })),
    total,
    page: filters.pagina,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  };
}
