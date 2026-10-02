import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type MyCompany = {
  id: string;
  slug: string;
  nomeFantasia: string;
  tipo: Enums<"company_type">;
  premium: boolean;
  role: Enums<"member_role">;
};

/** Usuário validado no servidor de auth (não confia só no cookie). */
export const getUser = cache(async () => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Empresas do usuário, a mais antiga primeiro (ela é a empresa ativa). */
export const getMyCompanies = cache(async (): Promise<MyCompany[]> => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("company_members")
    .select("role, created_at, companies (id, slug, nome_fantasia, tipo, premium)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;

  return data.flatMap((m) =>
    m.companies
      ? [
          {
            id: m.companies.id,
            slug: m.companies.slug,
            nomeFantasia: m.companies.nome_fantasia,
            tipo: m.companies.tipo,
            premium: m.companies.premium,
            role: m.role,
          },
        ]
      : [],
  );
});

export async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Usuário logado com empresa. Sem empresa, vai concluir o cadastro. */
export async function requireCompany(next: string) {
  const user = await requireUser(next);
  const [company] = await getMyCompanies();
  if (!company) redirect("/cadastro");
  return { user, company };
}

export function isProvider(company: Pick<MyCompany, "tipo">) {
  return company.tipo === "prestador" || company.tipo === "ambos";
}

export function isBuyer(company: Pick<MyCompany, "tipo">) {
  return company.tipo === "contratante" || company.tipo === "ambos";
}
