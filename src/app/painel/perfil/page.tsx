import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { isProvider, requireCompany } from "@/features/auth/session";
import { listCategories, listCities } from "@/features/catalog/queries";
import { CertificationEditor, ClientEditor, EquipmentEditor } from "@/features/companies/components/editor/item-editors";
import { PhotosEditor } from "@/features/companies/components/editor/photos-editor";
import { ProfileDataForm } from "@/features/companies/components/editor/profile-data-form";
import { ServiceAreaForm } from "@/features/companies/components/editor/service-area-form";
import { getEditableProfile } from "@/features/companies/editor-queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Meu perfil" };

const TABS = [
  { key: "dados", label: "Dados" },
  { key: "area", label: "Área de atuação", provider: true },
  { key: "fotos", label: "Logo e fotos", provider: true },
  { key: "equipamentos", label: "Equipamentos", provider: true },
  { key: "certificacoes", label: "Certificações", provider: true },
  { key: "clientes", label: "Clientes", provider: true },
] as const;

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { company } = await requireCompany("/painel/perfil");
  const provider = isProvider(company);
  const tabs = TABS.filter((t) => !("provider" in t) || provider);
  const { aba } = await searchParams;
  const tab = tabs.find((t) => t.key === aba)?.key ?? "dados";

  const [profile, categories, cities] = await Promise.all([
    getEditableProfile(company.id),
    listCategories(),
    listCities(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Seções do perfil" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {tabs.map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "dados" ? "/painel/perfil" : `/painel/perfil?aba=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap",
                  tab === t.key ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Card>
        <CardContent className="p-5 sm:p-8">
          {tab === "dados" && <ProfileDataForm profile={profile} cities={cities} />}
          {tab === "area" && (
            <ServiceAreaForm
              categories={categories}
              cities={cities}
              initialCategoryIds={profile.categoryIds}
              initialCityIds={profile.cityIds}
              hqCityId={profile.city_id}
            />
          )}
          {tab === "fotos" && <PhotosEditor profile={profile} limit={profile.premium ? 30 : 5} />}
          {tab === "equipamentos" && <EquipmentEditor items={profile.equipment} />}
          {tab === "certificacoes" && <CertificationEditor items={profile.certifications} companyId={profile.id} />}
          {tab === "clientes" && <ClientEditor items={profile.clients} />}
        </CardContent>
      </Card>
    </div>
  );
}
