import { CheckCircle2, Circle, FileText, Lock, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isBuyer, isProvider, requireCompany } from "@/features/auth/session";
import { MetricsChart } from "@/features/dashboard/components/metrics-chart";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { getDashboardMetrics, getProfileChecklist } from "@/features/dashboard/queries";
import { QuoteList } from "@/features/quotes/components/quote-list";
import { listMyQuotes } from "@/features/quotes/queries";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { company } = await requireCompany("/painel");
  const { bemvindo } = await searchParams;
  const provider = isProvider(company);
  const buyer = isBuyer(company);

  const [metrics, checklist, myQuotes] = await Promise.all([
    provider ? getDashboardMetrics(company.id) : null,
    provider ? getProfileChecklist(company.id) : null,
    buyer ? listMyQuotes(company.id, 5) : null,
  ]);
  const pending = checklist?.filter((item) => !item.done) ?? [];

  return (
    <div className="flex flex-col gap-6">
      {bemvindo && (
        <Alert tone="success">
          Cadastro concluído.{" "}
          {provider ? "Complete o perfil para aparecer melhor na busca." : "Já pode pedir seu primeiro orçamento."}
        </Alert>
      )}

      {metrics && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Visualizações do perfil" value={metrics.current.views} previous={metrics.previous.views} />
            <StatTile label="Contatos gerados" value={metrics.current.contatos} previous={metrics.previous.contatos} />
            <StatTile label="Orçamentos recebidos" value={metrics.current.orcamentos} previous={metrics.previous.orcamentos} />
          </div>
          <Card>
            <CardContent>
              <MetricsChart days={metrics.days} />
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {checklist && (
          <Card>
            <CardHeader>
              <CardTitle>{pending.length ? "Complete seu perfil" : "Perfil completo"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {pending.length
                  ? "Perfis completos recebem mais contatos."
                  : "Mantenha fotos e certificações atualizadas."}
              </p>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col">
                {checklist.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-raised"
                    >
                      {item.done ? (
                        <CheckCircle2 aria-hidden className="size-5 text-whatsapp" />
                      ) : (
                        <Circle aria-hidden className="size-5 text-muted-foreground" />
                      )}
                      <span className={item.done ? "text-muted-foreground" : undefined}>{item.label}</span>
                      <span className="sr-only">{item.done ? "(feito)" : "(pendente)"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {myQuotes && (
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>Meus pedidos</CardTitle>
              <Button asChild size="sm">
                <Link href="/orcamentos/novo">
                  <Plus aria-hidden />
                  Pedir orçamento
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <QuoteList
                quotes={myQuotes}
                empty={
                  <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                    <FileText aria-hidden className="size-8" />
                    Nenhum pedido ainda. Descreva o serviço e receba respostas de fornecedores da região.
                  </div>
                }
              />
              {myQuotes.length > 0 && (
                <Link href="/orcamentos" className="mt-3 inline-block text-sm text-primary hover:underline">
                  Ver todos
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {provider && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {!company.premium && <Lock aria-hidden className="size-4 text-premium" />}
                Relatórios detalhados
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {company.premium
                ? "Em breve: origem das visitas, buscas que levaram ao seu perfil e taxa de resposta."
                : "No plano Premium: destaque na busca, até 30 fotos e relatórios de origem das visitas. Em breve."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
