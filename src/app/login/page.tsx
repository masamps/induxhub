import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { AuthCard } from "@/features/auth/components/auth-card";
import { GoogleButton } from "@/features/auth/components/google-button";
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
      description="Acesse o painel da sua empresa com Google ou e-mail."
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
      {params.erro === "google" && (
        <Alert tone="error">Não foi possível entrar com o Google. Tente de novo.</Alert>
      )}
      <GoogleButton next={next} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou com e-mail
        <span className="h-px flex-1 bg-border" />
      </div>
      <LoginForm next={next} />
    </AuthCard>
  );
}
