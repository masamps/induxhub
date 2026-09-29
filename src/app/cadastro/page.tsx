import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Cadastrar empresa" };

export default function CadastroPage() {
  return (
    <ComingSoon
      title="Cadastro em breve"
      description="Em breve sua empresa poderá se cadastrar como contratante ou prestadora de serviços."
    />
  );
}
