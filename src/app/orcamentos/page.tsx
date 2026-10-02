import { FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCompany } from "@/features/auth/session";
import { QuoteList } from "@/features/quotes/components/quote-list";
import { listMyQuotes } from "@/features/quotes/queries";

export const metadata: Metadata = { title: "Meus pedidos" };

export default async function OrcamentosPage() {
  const { company } = await requireCompany("/orcamentos");
  const quotes = await listMyQuotes(company.id);

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{company.nomeFantasia}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Meus pedidos</h1>
        </div>
        <Button asChild>
          <Link href="/orcamentos/novo">
            <Plus aria-hidden />
            Pedir orçamento
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent>
          <QuoteList
            quotes={quotes}
            empty={
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <FileText aria-hidden className="size-10 text-muted-foreground" />
                <p className="font-medium">Nenhum pedido ainda</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Descreva o serviço uma vez e receba propostas de fornecedores da região para comparar.
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </Container>
  );
}
