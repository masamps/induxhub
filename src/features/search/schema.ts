import { z } from "zod";

export const SEARCH_PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "relevancia", label: "Mais relevantes" },
  { value: "nota", label: "Melhor avaliados" },
] as const;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .optional()
  .catch(undefined);

/** Normaliza os searchParams de /buscar. Valores inválidos viram o padrão, nunca erro. */
export const searchParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .optional()
    .catch(undefined)
    .transform((value) => value || undefined),
  cidade: slug,
  categoria: slug,
  ordem: z.enum(["relevancia", "nota"]).catch("relevancia"),
  pagina: z.coerce.number().int().min(1).max(500).catch(1),
});

export type SearchFilters = {
  q?: string;
  cidade?: string;
  categoria?: string;
  ordem: z.infer<typeof searchParamsSchema>["ordem"];
  pagina: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseSearchParams(raw: RawSearchParams): SearchFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return searchParamsSchema.parse({
    q: first(raw.q),
    cidade: first(raw.cidade) || undefined,
    categoria: first(raw.categoria) || undefined,
    ordem: first(raw.ordem),
    pagina: first(raw.pagina),
  });
}

/** Monta a URL de /buscar mantendo só os filtros preenchidos. */
export function buildSearchHref(filters: Partial<SearchFilters>) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.cidade) params.set("cidade", filters.cidade);
  if (filters.categoria) params.set("categoria", filters.categoria);
  if (filters.ordem && filters.ordem !== "relevancia") params.set("ordem", filters.ordem);
  if (filters.pagina && filters.pagina > 1) params.set("pagina", String(filters.pagina));
  const query = params.toString();
  return query ? `/buscar?${query}` : "/buscar";
}
