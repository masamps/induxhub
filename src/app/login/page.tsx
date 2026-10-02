import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string; senha?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  return (
    <AuthCard
      title="Entrar"
      description="Acesse o painel da sua empresa."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Cadastre sua empresa
          </Link>
        </>
      }
    >
      {params.erro === "link" && (
        <Alert tone="error">Link inválido ou expirado. Entre ou peça um novo link.</Alert>
      )}
      <LoginForm next={next} />
    </AuthCard>
  );
}
