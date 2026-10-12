import { z } from "zod";

import { todayIso } from "./format";

export const PROPOSAL_MAX_ITEMS = 200;

export const UNITS = [
  { value: "un", label: "un" },
  { value: "pc", label: "peça" },
  { value: "cj", label: "conjunto" },
  { value: "h", label: "hora" },
  { value: "kg", label: "kg" },
  { value: "m", label: "m" },
  { value: "m2", label: "m²" },
  { value: "m3", label: "m³" },
  { value: "l", label: "litro" },
  { value: "servico", label: "serviço" },
] as const;
export type Unit = (typeof UNITS)[number]["value"];

export function unitLabel(value: string) {
  return UNITS.find((u) => u.value === value)?.label ?? value;
}

/** "1.234,56", "1.234" ou "1234.56" → número. Vazio → null. Inválido → NaN. */
export function parseDecimal(raw: string): number | null {
  const v = raw.trim();
  if (v === "") return null;
  const thousands = v.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(v);
  const normalized = thousands ? v.replace(/\./g, "").replace(",", ".") : v;
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

const money = (label: string) =>
  z
    .string()
    .transform(parseDecimal)
    .refine((v) => v === null || (Number.isFinite(v) && v <= 9_999_999_999 && Math.abs(Math.round(v * 100) - v * 100) < 1e-6), `${label} inválido.`);

const itemSchema = z.object({
  descricao: z.string().trim().min(1, "Descreva o item.").max(500),
  unidade: z.enum(UNITS.map((u) => u.value) as [Unit, ...Unit[]]),
  quantidade: z
    .string()
    .transform(parseDecimal)
    .refine((v) => v !== null && Number.isFinite(v) && v > 0 && v < 1_000_000_000, "Quantidade inválida."),
  valorUnitario: money("Valor").refine((v) => v !== null, "Informe o valor."),
});

const digits = (v: string) => v.replace(/\D/g, "");

export const proposalSchema = z.object({
  quoteId: z.uuid().nullable(),
  titulo: z.string().trim().min(3, "Dê um título ao orçamento.").max(140),
  clienteNome: z
    .string()
    .trim()
    .max(160)
    .refine((v) => v === "" || v.length >= 2, "Nome muito curto."),
  clienteDocumento: z
    .string()
    .transform(digits)
    .refine((v) => v === "" || v.length === 11 || v.length === 14, "CPF ou CNPJ incompleto."),
  clienteEmail: z.union([z.literal(""), z.email("E-mail inválido.").max(254)]),
  clienteWhatsapp: z
    .string()
    .transform(digits)
    .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "WhatsApp com DDD."),
  itens: z.array(itemSchema).min(1, "Adicione ao menos um item.").max(PROPOSAL_MAX_ITEMS),
  desconto: money("Desconto"),
  frete: money("Frete"),
  prazoEntregaDias: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 730), "Prazo entre 1 e 730 dias.")
    .transform((v) => (v === "" ? null : Number(v))),
  validade: z
    .string()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= todayIso(), "Escolha uma data a partir de hoje."),
  condicoesPagamento: z.string().trim().max(500),
  observacoes: z.string().trim().max(5000),
});
export type ProposalInput = z.input<typeof proposalSchema>;
export type ProposalValues = z.output<typeof proposalSchema>;

/** Cliente é obrigatório só no envio; rascunho salva sem ele. */
export function clientMissing(v: ProposalValues) {
  return v.quoteId === null && v.clienteNome.length < 2;
}

export function proposalTotals(v: {
  itens: { quantidade: number | null; valorUnitario: number | null }[];
  desconto: number | null;
  frete: number | null;
}) {
  const subtotal = v.itens.reduce((sum, i) => sum + Math.round((i.quantidade ?? 0) * (i.valorUnitario ?? 0) * 100), 0) / 100;
  return { subtotal, total: subtotal - (v.desconto ?? 0) + (v.frete ?? 0) };
}

export const respondSchema = z.object({
  aceito: z.boolean(),
  motivo: z.string().trim().max(1000),
});
