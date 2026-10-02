import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

export type CatalogOption = { id: number; slug: string; nome: string };

const CATALOG_REVALIDATE_SECONDS = 60 * 60;

export const listCategories = unstable_cache(
  async (): Promise<CatalogOption[]> => {
    const { data, error } = await createPublicClient()
      .from("categories")
      .select("id, slug, nome")
      .order("ordem");
    if (error) throw error;
    return data;
  },
  ["catalog:categories:v2"],
  { revalidate: CATALOG_REVALIDATE_SECONDS },
);

export const listCities = unstable_cache(
  async (): Promise<CatalogOption[]> => {
    const { data, error } = await createPublicClient()
      .from("cities")
      .select("id, slug, nome")
      .order("nome");
    if (error) throw error;
    return data;
  },
  ["catalog:cities:v2"],
  { revalidate: CATALOG_REVALIDATE_SECONDS },
);
