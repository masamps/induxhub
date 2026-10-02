import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";

export type DailyMetric = {
  dia: string;
  views: number;
  whatsappClicks: number;
  quoteClicks: number;
  orcamentosRecebidos: number;
};

export type MetricTotals = { views: number; contatos: number; orcamentos: number };

export type DashboardMetrics = {
  days: DailyMetric[];
  current: MetricTotals;
  previous: MetricTotals;
};

const WINDOW = 30;

function isoDay(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function totals(days: DailyMetric[]): MetricTotals {
  return days.reduce(
    (acc, d) => ({
      views: acc.views + d.views,
      contatos: acc.contatos + d.whatsappClicks + d.quoteClicks,
      orcamentos: acc.orcamentos + d.orcamentosRecebidos,
    }),
    { views: 0, contatos: 0, orcamentos: 0 },
  );
}

/** Últimos 30 dias (com zeros nos dias sem evento) e os 30 anteriores para comparação. */
export async function getDashboardMetrics(companyId: string, now = new Date()): Promise<DashboardMetrics> {
  const allDays = Array.from({ length: WINDOW * 2 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (WINDOW * 2 - 1 - i));
    return isoDay(d);
  });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("profile_metrics")
    .select("dia, views, whatsapp_clicks, quote_clicks, orcamentos_recebidos")
    .eq("company_id", companyId)
    .gte("dia", allDays[0])
    .order("dia");
  if (error) throw error;

  const byDay = new Map(data.map((row) => [row.dia, row]));
  const series: DailyMetric[] = allDays.map((dia) => {
    const row = byDay.get(dia);
    return {
      dia,
      views: row?.views ?? 0,
      whatsappClicks: row?.whatsapp_clicks ?? 0,
      quoteClicks: row?.quote_clicks ?? 0,
      orcamentosRecebidos: row?.orcamentos_recebidos ?? 0,
    };
  });

  const days = series.slice(WINDOW);
  return { days, current: totals(days), previous: totals(series.slice(0, WINDOW)) };
}

export type ProfileChecklist = { key: string; label: string; done: boolean; href: string }[];

/** O que falta para o perfil ficar completo (ordem de impacto na conversão). */
export async function getProfileChecklist(companyId: string): Promise<ProfileChecklist> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("companies")
    .select(
      "logo_url, descricao, company_photos(count), equipment(count), certifications(count), key_clients(count)",
    )
    .eq("id", companyId)
    .single();
  if (error) throw error;

  const count = (rel: { count: number }[]) => rel[0]?.count ?? 0;
  return [
    { key: "descricao", label: "Descrição da empresa", done: Boolean(data.descricao), href: "/painel/perfil" },
    { key: "logo", label: "Logo", done: Boolean(data.logo_url), href: "/painel/perfil?aba=fotos" },
    { key: "fotos", label: "Fotos de trabalhos", done: count(data.company_photos) > 0, href: "/painel/perfil?aba=fotos" },
    { key: "equipamentos", label: "Máquinas e equipamentos", done: count(data.equipment) > 0, href: "/painel/perfil?aba=equipamentos" },
    { key: "certificacoes", label: "Certificações", done: count(data.certifications) > 0, href: "/painel/perfil?aba=certificacoes" },
    { key: "clientes", label: "Principais clientes", done: count(data.key_clients) > 0, href: "/painel/perfil?aba=clientes" },
  ];
}
