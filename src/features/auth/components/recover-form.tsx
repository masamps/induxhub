"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { requestPasswordReset } from "../actions";
import { recoverSchema, type RecoverInput } from "../schemas";

export function RecoverForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string }>();
  const form = useForm<RecoverInput>({ resolver: zodResolver(recoverSchema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => setResult(await requestPasswordReset(values))),
  );

  if (result?.ok) {
    return (
      <Alert tone="success">
        Se houver uma conta com este e-mail, enviamos um link para criar nova senha. Confira também o spam.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      <Field id="email" label="E-mail da conta" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link"}
      </Button>
    </form>
  );
}
