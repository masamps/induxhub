"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { replyToQuote } from "../actions";
import { replySchema, type ReplyInput } from "../schemas";

export function ReplyForm({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setFormError] = useState<string>();
  const form = useForm<ReplyInput>({ defaultValues: { mensagem: "", valorEstimado: "", prazoDias: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors();
    const parsed = replySchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        form.setError(String(issue.path[0]) as keyof ReplyInput, { message: issue.message });
      }
      return;
    }
    startTransition(async () => {
      setFormError(undefined);
      const result = await replyToQuote(quoteId, values);
      if (!result.ok) setFormError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Enviar proposta</h2>
      {error && <Alert tone="error">{error}</Alert>}
      <Field
        id="mensagem"
        label="Mensagem"
        hint="Como vai atender, o que está incluso, condições de pagamento."
        error={errors.mensagem?.message}
      >
        <Textarea rows={5} maxLength={5000} {...form.register("mensagem")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="valorEstimado" label="Valor estimado (R$)" optional error={errors.valorEstimado?.message}>
          <Input inputMode="decimal" placeholder="12.500,00" {...form.register("valorEstimado")} />
        </Field>
        <Field id="prazoDias" label="Prazo de entrega (dias)" optional error={errors.prazoDias?.message}>
          <Input inputMode="numeric" placeholder="15" {...form.register("prazoDias")} />
        </Field>
      </div>
      <Button type="submit" size="lg" className="sm:self-end" disabled={pending}>
        {pending ? "Enviando…" : "Enviar proposta"}
      </Button>
    </form>
  );
}
