import { MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CompanyCardData } from "@/features/search/queries";
import { cn } from "@/lib/utils";

import { CompanyAvatar } from "./company-avatar";
import { ContactActions } from "./contact-actions";
import { PremiumBadge } from "./premium-badge";
import { ReputationSummary } from "./reputation-summary";

const MAX_CATEGORIES = 3;

export function CompanyCard({ company }: { company: CompanyCardData }) {
  const extraCategories = company.categorias.length - MAX_CATEGORIES;

  return (
    <Card
      className={cn(
        "relative flex w-full flex-col gap-4 p-5 transition-colors hover:border-primary/50",
        company.premium && "border-premium/40",
      )}
    >
      <div className="flex items-start gap-4">
        <CompanyAvatar name={company.nomeFantasia} logoUrl={company.logoUrl} size={company.premium ? "lg" : "md"} />
        <div className="flex min-w-0 flex-col gap-1">
          {company.premium && <PremiumBadge />}
          <h3 className="text-lg leading-tight font-semibold">
            {/* O link cobre o card inteiro; os botões ficam acima dele. */}
            <Link href={`/prestador/${company.slug}`} className="after:absolute after:inset-0 after:rounded-card">
              {company.nomeFantasia}
            </Link>
          </h3>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin aria-hidden className="size-4" />
            {company.cidade}, {company.uf}
          </p>
        </div>
      </div>

      <ReputationSummary reputation={company.reputation} />

      {company.descricao && <p className="line-clamp-2 text-sm text-muted-foreground">{company.descricao}</p>}

      <ul className="flex flex-wrap gap-1.5" aria-label="Categorias">
        {company.categorias.slice(0, MAX_CATEGORIES).map((categoria) => (
          <li key={categoria}>
            <Badge>{categoria}</Badge>
          </li>
        ))}
        {extraCategories > 0 && (
          <li>
            <Badge variant="outline">+{extraCategories}</Badge>
          </li>
        )}
      </ul>

      <ContactActions
        companyId={company.id}
        companySlug={company.slug}
        whatsapp={company.whatsapp}
        className="relative z-10 mt-auto"
      />
    </Card>
  );
}
