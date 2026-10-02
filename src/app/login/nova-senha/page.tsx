import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { NewPasswordForm } from "@/features/auth/components/new-password-form";
import { requireUser } from "@/features/auth/session";

export const metadata: Metadata = { title: "Nova senha" };

export default async function NovaSenhaPage() {
  await requireUser("/login/nova-senha");
  return (
    <AuthCard title="Criar nova senha">
      <NewPasswordForm />
    </AuthCard>
  );
}
