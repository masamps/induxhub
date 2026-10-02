import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { isBuyer, isProvider, requireCompany } from "@/features/auth/session";
import { DashboardNav, type NavItem } from "@/features/dashboard/components/dashboard-nav";
import { countUnreadQuotes } from "@/features/quotes/queries";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { company } = await requireCompany("/painel");
  const provider = isProvider(company);
  const unread = provider ? await countUnreadQuotes(company.id) : 0;

  const items: NavItem[] = [{ href: "/painel", label: "Visão geral" }];
  if (provider) {
    items.push(
      { href: "/painel/orcamentos", label: "Pedidos recebidos", badge: unread },
      { href: "/painel/perfil", label: "Meu perfil" },
    );
  }
  if (isBuyer(company)) items.push({ href: "/orcamentos", label: "Meus pedidos" });

  return (
    <Container className="flex flex-col gap-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Painel</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{company.nomeFantasia}</h1>
        </div>
        {provider && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/prestador/${company.slug}`} target="_blank">
              Ver perfil público
              <ExternalLink aria-hidden />
            </Link>
          </Button>
        )}
      </div>
      <DashboardNav items={items} />
      {children}
    </Container>
  );
}
