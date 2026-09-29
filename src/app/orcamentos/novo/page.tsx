import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Pedir orçamento" };

export default function NovoOrcamentoPage() {
  return (
    <ComingSoon
      title="Pedido de orçamento em breve"
      description="Enquanto isso, fale direto com o fornecedor pelo botão Conversar agora."
    />
  );
}
