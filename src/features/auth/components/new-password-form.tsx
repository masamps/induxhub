"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

import { updatePassword } from "../actions";
import { newPasswordSchema, type NewPasswordInput } from "../schemas";

export function NewPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await updatePassword(values);
      if (result && !result.ok) setError(result.error);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="password" label="Nova senha" hint="Pelo menos 8 caracteres." error={errors.password?.message}>
        <PasswordInput autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Field id="confirm" label="Repita a senha" error={errors.confirm?.message}>
        <PasswordInput autoComplete="new-password" {...form.register("confirm")} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
