import type { Metadata } from "next";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { listCategories, listCities, type CatalogOption } from "@/features/catalog/queries";
import { EmptyResults } from "@/features/search/components/empty-results";
import { Pagination } from "@/features/search/components/pagination";
import { ResultsGrid } from "@/features/search/components/results-grid";
import { ResultsSkeleton } from "@/features/search/components/results-skeleton";
import { SearchForm } from "@/features/search/components/search-form";
import { searchCompanies } from "@/features/search/queries";
import { parseSearchParams, type SearchFilters } from "@/features/search/schema";
import { pluralize } from "@/lib/format";

type SearchPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function nameOf(options: CatalogOption[], slug?: string) {
  return options.find((option) => option.slug === slug)?.nome;
}

function describeFilters(filters: SearchFilters, categories: CatalogOption[], cities: CatalogOption[]) {
  const category = nameOf(categories, filters.categoria);
  const city = nameOf(cities, filters.cidade);
  const what = category ?? "Fornecedores";
  return city ? `${what} em ${city}` : `${what} na região de Sorocaba`;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const filters = parseSearchParams(await searchParams);
  const [categories, cities] = await Promise.all([listCategories(), listCities()]);
  return { title: describeFilters(filters, categories, cities) };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const filters = parseSearchParams(await searchParams);
  const [categories, cities] = await Promise.all([listCategories(), listCities()]);

  return (
    <Container className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">{describeFilters(filters, categories, cities)}</h1>
      <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
        <SearchForm categories={categories} cities={cities} defaults={filters} showSort />
      </div>
      {/* A key reinicia o Suspense a cada nova busca, mostrando o skeleton. */}
      <Suspense key={JSON.stringify(filters)} fallback={<ResultsSkeleton />}>
        <SearchResults filters={filters} />
      </Suspense>
    </Container>
  );
}

async function SearchResults({ filters }: { filters: SearchFilters }) {
  const result = await searchCompanies(filters);
  const hasFilters = Boolean(filters.q || filters.cidade || filters.categoria);

  if (result.items.length === 0) {
    return <EmptyResults hasFilters={hasFilters} />;
  }

  return (
    <section aria-label="Resultados" className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {pluralize(result.total, "fornecedor encontrado", "fornecedores encontrados")}
      </p>
      <ResultsGrid companies={result.items} />
      <Pagination filters={filters} page={result.page} pageCount={result.pageCount} />
    </section>
  );
}
