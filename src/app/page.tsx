import { ArrowRight, Building2, FileText, Handshake } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { listCategories, listCities } from "@/features/catalog/queries";
import { ResultsGrid } from "@/features/search/components/results-grid";
import { SearchForm } from "@/features/search/components/search-form";
import { searchCompanies } from "@/features/search/queries";
import { buildSearchHref } from "@/features/search/schema";

export const revalidate = 300;

const FEATURED_COUNT = 6;

const STEPS = [
  { icon: FileText, title: "Descreva o serviço", text: "Categoria, cidade, prazo e anexos em um só pedido." },
  { icon: Building2, title: "Receba propostas", text: "Fornecedores da região respondem com valor e prazo." },
  { icon: Handshake, title: "Compare e feche", text: "Veja reputação, equipamentos e certificações antes de escolher." },
];

export default async function HomePage() {
  const [categories, cities, featured] = await Promise.all([
    listCategories(),
    listCities(),
    searchCompanies({ ordem: "nota", pagina: 1 }, FEATURED_COUNT),
  ]);

  return (
    <>
      <section className="bg-hero">
        <Container className="flex flex-col gap-8 py-14 sm:py-20">
          <div className="flex max-w-2xl flex-col gap-4">
            <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
              Conectando a indústria ao fornecedor certo.
            </h1>
            <p className="text-lg text-foreground/85">
              Encontre usinagem, ferramentaria, injeção plástica, solda, automação e outros serviços em Sorocaba e
              região.
            </p>
          </div>
          <div className="rounded-card border border-white/10 bg-background/70 p-4 shadow-card backdrop-blur sm:p-5">
            <SearchForm categories={categories} cities={cities} />
          </div>
        </Container>
      </section>

      <section aria-labelledby="categorias-titulo" className="py-12">
        <Container className="flex flex-col gap-6">
          <h2 id="categorias-titulo" className="text-2xl font-bold">
            Serviços por categoria
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={buildSearchHref({ categoria: category.slug })}
                  className="flex min-h-14 items-center justify-between gap-2 rounded-card border border-border bg-surface px-4 py-3 font-medium transition-colors hover:border-primary/60 hover:text-primary"
                >
                  {category.nome}
                  <ArrowRight aria-hidden className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {featured.items.length > 0 && (
        <section aria-labelledby="destaques-titulo" className="py-12">
          <Container className="flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4">
              <h2 id="destaques-titulo" className="text-2xl font-bold">
                Fornecedores em destaque
              </h2>
              <Button asChild variant="link" className="px-0">
                <Link href="/buscar">Ver todos</Link>
              </Button>
            </div>
            <ResultsGrid companies={featured.items} />
          </Container>
        </section>
      )}

      <section aria-labelledby="como-funciona-titulo" className="py-12">
        <Container className="flex flex-col gap-6">
          <h2 id="como-funciona-titulo" className="text-2xl font-bold">
            Como funciona
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
                <step.icon aria-hidden className="size-7 text-primary" />
                <h3 className="font-semibold">
                  {index + 1}. {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3 rounded-card bg-surface-raised p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Presta serviços para a indústria?</h3>
              <p className="text-sm text-muted-foreground">Cadastre sua empresa e receba pedidos da sua região.</p>
            </div>
            <Button asChild size="lg">
              <Link href="/cadastro">Cadastrar minha empresa</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
