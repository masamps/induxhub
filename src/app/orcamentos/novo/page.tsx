import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { isBuyer, requireCompany } from "@/features/auth/session";
import { listCategories, listCities } from "@/features/catalog/queries";
import { NewQuoteForm } from "@/features/quotes/components/new-quote-form";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pedir orçamento" };

type Search = { prestador?: string; categoria?: string; cidade?: string };

/** Pré-seleção vinda de um perfil (?prestador=slug) ou da busca (?categoria=&cidade=). */
async function resolveDefaults(params: Search, companyCityId: number) {
  const supabase = await createServerSupabase();

  if (params.prestador) {
    const { data } = await supabase
      .from("companies")
      .select("nome_fantasia, city_id, company_categories (category_id), company_cities (city_id)")
      .eq("slug", params.prestador)
      .maybeSingle();
    if (data) {
      const served = [data.city_id, ...data.company_cities.map((c) => c.city_id)];
      return {
        categoryId: data.company_categories[0]?.category_id,
        cityId: served.includes(companyCityId) ? companyCityId : data.city_id,
        prestadorNome: data.nome_fantasia,
      };
    }
  }

  const [categories, cities] = await Promise.all([listCategories(), listCities()]);
  return {
    categoryId: categories.find((c) => c.slug === params.categoria)?.id,
    cityId: cities.find((c) => c.slug === params.cidade)?.id ?? companyCityId,
    prestadorNome: undefined,
  };
}

export default async function NovoOrcamentoPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { company } = await requireCompany(`/orcamentos/novo${params.prestador ? `?prestador=${params.prestador}` : ""}`);

  const supabase = await createServerSupabase();
  const [{ data: own }, categories, cities] = await Promise.all([
    supabase.from("companies").select("city_id").eq("id", company.id).single(),
    listCategories(),
    listCities(),
  ]);
  const defaults = await resolveDefaults(params, own?.city_id ?? 0);

  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-8 sm:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Pedir orçamento</h1>
        <p className="text-muted-foreground">
          Descreva o serviço. Fornecedores da região recebem o pedido e respondem com valor e prazo.
        </p>
      </div>
      {isBuyer(company) ? (
        <Card>
          <CardContent className="p-5 sm:p-8">
            <NewQuoteForm
              companyId={company.id}
              categories={categories}
              cities={cities}
              defaults={defaults}
              prestadorNome={defaults.prestadorNome}
            />
          </CardContent>
        </Card>
      ) : (
        <Alert tone="info">
          Sua empresa está cadastrada só como prestadora. Para pedir orçamentos,{" "}
          <Link href="/painel/perfil" className="font-medium text-primary underline">
            ative a opção “também contrato serviços”
          </Link>{" "}
          no seu perfil.
        </Alert>
      )}
    </Container>
  );
}
