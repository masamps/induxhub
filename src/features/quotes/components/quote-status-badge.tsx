import { Badge } from "@/components/ui/badge";

import type { QuoteStatus } from "../queries";

const LABELS: Record<QuoteStatus, { label: string; variant: "primary" | "default" | "outline" }> = {
  aberto: { label: "Aguardando respostas", variant: "outline" },
  respondido: { label: "Com respostas", variant: "primary" },
  fechado: { label: "Fechado", variant: "default" },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const { label, variant } = LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
