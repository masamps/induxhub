export type ProposalStatus = "rascunho" | "enviado" | "aceito" | "recusado" | "cancelado" | "substituido" | "expirado";

export const STATUS_LABELS: Record<ProposalStatus, { label: string; variant: "primary" | "default" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  enviado: { label: "Enviado", variant: "primary" },
  aceito: { label: "Aceito", variant: "primary" },
  recusado: { label: "Recusado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "default" },
  substituido: { label: "Substituído", variant: "default" },
  expirado: { label: "Vencido", variant: "default" },
};

/** "ORC-2026-0007" ou "ORC-2026-0007 v2". Rascunho não tem número. */
export function proposalCode(p: { numero: number | null; versao: number; enviadoEm: string | null }) {
  if (p.numero === null || !p.enviadoEm) return "Rascunho";
  const ano = new Date(p.enviadoEm).getFullYear();
  const base = `ORC-${ano}-${String(p.numero).padStart(4, "0")}`;
  return p.versao > 1 ? `${base} v${p.versao}` : base;
}

export function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Mesmo cálculo de `proposal_effective_status` no banco. */
export function effectiveStatus(status: Exclude<ProposalStatus, "expirado">, validade: string): ProposalStatus {
  return status === "enviado" && validade < todayIso() ? "expirado" : status;
}

const quantityFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
export function formatQuantity(value: number) {
  return quantityFormatter.format(value);
}

/** Documento só com dígitos → CPF ou CNPJ formatado. */
export function formatDocument(doc: string) {
  if (doc.length === 11) return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (doc.length === 14) return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return doc;
}
