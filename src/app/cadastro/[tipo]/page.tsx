import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { getMyCompanies, getUser } from "@/features/auth/session";
import { listCategories, listCities } from "@/features/catalog/queries";
import { SignupWizard } from "@/features/onboarding/components/signup-wizard";

const TIPOS = {
  empresa: { tipo: "contratante", title: "Cadastro de empresa", lead: "Para pedir orçamentos a fornecedores." },
  prestador: { tipo: "prestador", title: "Cadastro de prestador", lead: "Seu perfil aparece na busca e recebe pedidos." },
} as const;

type Params = { tipo: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const config = TIPOS[(await params).tipo as keyof typeof TIPOS];
  return { title: config?.title ?? "Cadastro" };
}

export default async function CadastroTipoPage({ params }: { params: Promise<Params> }) {
  const config = TIPOS[(await params).tipo as keyof typeof TIPOS];
  if (!config) notFound();

  const [user, companies, categories, cities] = await Promise.all([
    getUser(),
    getMyCompanies(),
    listCategories(),
    listCities(),
  ]);
  if (companies.length) redirect("/painel");

  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-8 sm:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-3xl">{config.title}</h1>
        <p className="text-muted-foreground">{config.lead}</p>
      </div>
      <SignupWizard
        tipo={config.tipo}
        categories={categories}
        cities={cities}
        account={user ? { email: user.email ?? "" } : null}
      />
    </Container>
  );
}
