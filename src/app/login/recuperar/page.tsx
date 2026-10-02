import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { RecoverForm } from "@/features/auth/components/recover-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function RecuperarPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      description="Enviamos um link para você criar uma nova senha."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <RecoverForm />
    </AuthCard>
  );
}
