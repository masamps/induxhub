import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return <ComingSoon title="Login em breve" description="O acesso ao painel da sua empresa chega na próxima etapa." />;
}
