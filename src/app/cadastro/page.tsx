import { Factory, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { getMyCompanies } from "@/features/auth/session";

export const metadata: Metadata = { title: "Cadastrar empresa" };

const OPTIONS = [
  {
    href: "/cadastro/empresa",
    icon: Factory,
    title: "Preciso de serviços",
    description: "Peça orçamentos a fornecedores da região e compare as respostas.",
  },
  {
    href: "/cadastro/prestador",
    icon: Wrench,
    title: "Ofereço serviços",
    description: "Crie o perfil da sua empresa e receba pedidos de orçamento.",
  },
];

export default async function CadastroPage() {
  const [company] = await getMyCompanies();
  if (company) redirect("/painel");

  return (
    <Container className="flex max-w-3xl flex-col gap-8 py-10 sm:py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Como sua empresa vai usar o InduxHub?</h1>
        <p className="text-muted-foreground">Cadastro gratuito. Leva poucos minutos.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card transition-colors hover:border-primary"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon aria-hidden className="size-6" />
            </span>
            <span className="text-lg font-semibold group-hover:text-primary">{title}</span>
            <span className="text-sm text-muted-foreground">{description}</span>
          </Link>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </Container>
  );
}
