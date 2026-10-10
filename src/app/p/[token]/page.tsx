import { FileDown, Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Container } from "@/components/layout/container";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyAvatar } from "@/features/companies/components/company-avatar";
import { ProposalDocument } from "@/features/proposals/components/proposal-document";
import { ProposalResponse } from "@/features/proposals/components/proposal-response";
import { formatDocument, proposalCode } from "@/features/proposals/format";
import { getPublicProposal } from "@/features/proposals/queries";
import { formatFullDate } from "@/lib/format";
import { buildWhatsappLink } from "@/lib/whatsapp";

// Link privado: fora de buscadores e sempre renderizado na hora (marca visualização).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orçamento", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

export default async function OrcamentoPublicoPage({ params }: Props) {
  const { token } = await params;
  if (!z.uuid().safeParse(token).success) notFound();
  const p = await getPublicProposal(token);
  if (!p) notFound();

  const f = p.fornecedor;
  const code = proposalCode(p);

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-12">
      {p.eFornecedor && (
        <Alert tone="info">
          Esta é a página que o cliente vê.{" "}
          <Link href={`/painel/propostas/${p.id}`} className="font-medium text-primary hover:underline">
            Voltar ao painel
          </Link>
        </Alert>
      )}
      {p.status === "aceito" && (
        <Alert tone="success">Orçamento aceito em {formatFullDate(p.respondidoEm ?? p.enviadoEm)}. O fornecedor vai entrar em contato.</Alert>
      )}
      {p.status === "recusado" && <Alert tone="info">Orçamento recusado.</Alert>}
      {p.status === "cancelado" && <Alert tone="info">O fornecedor cancelou este orçamento.</Alert>}
      {p.status === "substituido" && <Alert tone="info">Existe uma versão mais nova deste orçamento. Peça o link atualizado ao fornecedor.</Alert>}
      {p.status === "expirado" && (
        <Alert tone="info">Este orçamento venceu em {formatFullDate(p.validade)}. Fale com o fornecedor para atualizar.</Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-6">
          <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CompanyAvatar name={f.nome} logoUrl={f.logoUrl} />
              <div className="flex flex-col text-sm">
                <Link href={`/prestador/${f.slug}`} className="text-base font-semibold hover:text-primary">
                  {f.nome}
                </Link>
                <span className="text-muted-foreground">
                  {f.razaoSocial} · CNPJ {formatDocument(f.cnpj)}
                </span>
                {f.cidade && (
                  <span className="text-muted-foreground">
                    {f.cidade}/{f.uf}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground sm:text-right">Emitido em {formatFullDate(p.enviadoEm)}</p>
          </header>

          <ProposalDocument p={p} />

          {p.status === "enviado" && p.podeResponder && <ProposalResponse token={token} fornecedor={f.nome} />}
          {p.status === "enviado" && !p.podeResponder && !p.eFornecedor && p.quoteId && (
            <Alert tone="info">
              Este orçamento responde a um pedido feito no InduxHub.{" "}
              <Link href={`/login?next=${encodeURIComponent(`/p/${token}`)}`} className="font-medium text-primary hover:underline">
                Entre com a conta da empresa
              </Link>{" "}
              para aceitar ou recusar.
            </Alert>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            {f.whatsapp && (
              <Button asChild variant="whatsapp">
                <a href={buildWhatsappLink(f.whatsapp, `Olá! Tenho uma dúvida sobre o orçamento ${code}.`)} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden />
                  Falar com o fornecedor
                </a>
              </Button>
            )}
            {f.email && (
              <Button asChild variant="outline">
                <a href={`mailto:${f.email}?subject=${encodeURIComponent(`Orçamento ${code}`)}`}>
                  <Mail aria-hidden />
                  E-mail
                </a>
              </Button>
            )}
            <Button asChild variant="outline">
              <a href={`/p/${token}/pdf`} target="_blank" rel="noreferrer">
                <FileDown aria-hidden />
                Baixar PDF
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!p.eFornecedor && (
        <p className="text-center text-sm text-muted-foreground">
          Orçamento enviado pelo InduxHub, marketplace industrial do interior de SP.{" "}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Cadastre sua empresa
          </Link>
        </p>
      )}
    </Container>
  );
}
