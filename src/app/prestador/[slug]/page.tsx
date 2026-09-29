import { CalendarClock, CheckCircle2, Globe, MapPin, Radar } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyAvatar } from "@/features/companies/components/company-avatar";
import { ContactActions } from "@/features/companies/components/contact-actions";
import { PremiumBadge } from "@/features/companies/components/premium-badge";
import { CertificationList } from "@/features/companies/components/profile/certification-list";
import { ClientList } from "@/features/companies/components/profile/client-list";
import { EquipmentList } from "@/features/companies/components/profile/equipment-list";
import { PhotoGallery } from "@/features/companies/components/profile/photo-gallery";
import { EmptySectionText, ProfileSection } from "@/features/companies/components/profile/profile-section";
import { ReviewList } from "@/features/companies/components/profile/review-list";
import { ProfileViewTracker } from "@/features/companies/components/profile-view-tracker";
import { ReputationSummary } from "@/features/companies/components/reputation-summary";
import { getCompanyProfile, listCompanyReviews, type CompanyProfile } from "@/features/companies/queries";
import { buildSearchHref } from "@/features/search/schema";
import { pluralize, yearsInMarket } from "@/lib/format";

export const revalidate = 300;

// Nenhum perfil é gerado no build; cada um é gerado no primeiro acesso e revalidado (ISR).
export function generateStaticParams() {
  return [];
}

type ProfilePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const company = await getCompanyProfile((await params).slug);
  if (!company) return { title: "Empresa não encontrada" };

  const categorias = company.categorias.map((c) => c.nome).join(", ");
  return {
    title: `${company.nomeFantasia} · ${company.cidade.nome}`,
    description: company.descricao ?? `${categorias} em ${company.cidade.nome}, ${company.cidade.uf}.`,
  };
}

export default async function ProviderProfilePage({ params }: ProfilePageProps) {
  const company = await getCompanyProfile((await params).slug);
  if (!company) notFound();

  const reviews = await listCompanyReviews(company.id);

  return (
    <>
      <ProfileViewTracker companyId={company.id} />
      <ProfileHeader company={company} />

      <Container className="grid gap-10 py-8 pb-28 lg:grid-cols-[1fr_320px] lg:pb-8">
        <div className="flex min-w-0 flex-col gap-10">
          <ProfileSection id="sobre" title="Sobre a empresa">
            {company.descricao ? (
              <p className="leading-relaxed text-foreground/90">{company.descricao}</p>
            ) : (
              <EmptySectionText>A empresa ainda não escreveu uma descrição.</EmptySectionText>
            )}
            <ul className="flex flex-wrap gap-2" aria-label="Categorias">
              {company.categorias.map((category) => (
                <li key={category.slug}>
                  <Link href={buildSearchHref({ categoria: category.slug })}>
                    <Badge variant="primary" className="py-1 text-sm">
                      {category.nome}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </ProfileSection>

          <ProfileSection id="fotos" title="Fotos e trabalhos">
            {company.fotos.length > 0 ? (
              <PhotoGallery photos={company.fotos} companyName={company.nomeFantasia} />
            ) : (
              <EmptySectionText>Nenhuma foto publicada ainda.</EmptySectionText>
            )}
          </ProfileSection>

          <ProfileSection id="equipamentos" title="Máquinas e equipamentos">
            {company.equipamentos.length > 0 ? (
              <EquipmentList items={company.equipamentos} />
            ) : (
              <EmptySectionText>Nenhum equipamento informado.</EmptySectionText>
            )}
          </ProfileSection>

          <ProfileSection id="certificacoes" title="Certificações">
            {company.certificacoes.length > 0 ? (
              <CertificationList items={company.certificacoes} />
            ) : (
              <EmptySectionText>Nenhuma certificação informada.</EmptySectionText>
            )}
          </ProfileSection>

          <ProfileSection id="clientes" title="Principais clientes">
            {company.clientes.length > 0 ? (
              <ClientList items={company.clientes} />
            ) : (
              <EmptySectionText>Nenhum cliente informado.</EmptySectionText>
            )}
          </ProfileSection>

          <ProfileSection id="avaliacoes" title="Avaliações">
            <ReputationSummary reputation={company.reputation} />
            {reviews.length > 0 ? (
              <ReviewList reviews={reviews} />
            ) : (
              <EmptySectionText>
                Ainda sem avaliações. Avaliações aparecem depois que um cliente recebe resposta a um orçamento.
              </EmptySectionText>
            )}
          </ProfileSection>
        </div>

        <aside className="order-first flex flex-col gap-4 lg:sticky lg:top-24 lg:order-none lg:self-start">
          <Card className="hidden lg:block">
            <CardContent className="flex flex-col gap-4">
              <p className="font-semibold">Fale com {company.nomeFantasia}</p>
              <ContactActions companyId={company.id} companySlug={company.slug} whatsapp={company.whatsapp} />
            </CardContent>
          </Card>
          <CompanyFacts company={company} />
        </aside>
      </Container>

      {/* Barra fixa no mobile: contato sempre ao alcance do polegar. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <ContactActions
          companyId={company.id}
          companySlug={company.slug}
          whatsapp={company.whatsapp}
          compact
          className="flex-row [&>*]:flex-1"
        />
      </div>
    </>
  );
}

function ProfileHeader({ company }: { company: CompanyProfile }) {
  return (
    <section className="bg-hero">
      <Container className="flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:py-12">
        <CompanyAvatar name={company.nomeFantasia} logoUrl={company.logoUrl} size="lg" />
        <div className="flex min-w-0 flex-col gap-2">
          {company.premium && <PremiumBadge />}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{company.nomeFantasia}</h1>
          <p className="flex items-center gap-1 text-foreground/85">
            <MapPin aria-hidden className="size-4" />
            {company.cidade.nome}, {company.cidade.uf}
          </p>
          <ReputationSummary reputation={company.reputation} />
        </div>
      </Container>
    </section>
  );
}

function CompanyFacts({ company }: { company: CompanyProfile }) {
  const facts = [
    company.anoFundacao && {
      icon: CalendarClock,
      label: "Tempo de mercado",
      value: `${pluralize(yearsInMarket(company.anoFundacao), "ano", "anos")} (desde ${company.anoFundacao})`,
    },
    {
      icon: CheckCircle2,
      label: "Projetos concluídos no InduxHub",
      value: String(company.reputation.projetosConcluidos),
    },
    {
      icon: Radar,
      label: "Área de atuação",
      value: [
        company.cidade.nome,
        ...company.cidadesAtendidas.map((city) => city.nome).filter((nome) => nome !== company.cidade.nome),
      ].join(", ") + (company.raioKm ? ` · raio de ${company.raioKm} km` : ""),
    },
    company.site && { icon: Globe, label: "Site", value: company.site, href: company.site },
  ].filter((fact) => Boolean(fact)) as { icon: typeof Globe; label: string; value: string; href?: string }[];

  return (
    <Card>
      <CardContent>
        <dl className="flex flex-col gap-4">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-3">
              <fact.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="flex min-w-0 flex-col">
                <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                <dd className="break-words">
                  {fact.href ? (
                    <a href={fact.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {fact.value.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
