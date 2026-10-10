"use client";

import { ArrowDown, ArrowUp, Plus, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";

import { saveProposal } from "../actions";
import {
  clientMissing,
  parseDecimal,
  PROPOSAL_MAX_ITEMS,
  proposalSchema,
  proposalTotals,
  UNITS,
  type ProposalInput,
} from "../schemas";

const EMPTY_ITEM: ProposalInput["itens"][number] = { descricao: "", unidade: "un", quantidade: "1", valorUnitario: "" };

function num(raw: string) {
  const v = parseDecimal(raw);
  return v !== null && Number.isFinite(v) ? v : 0;
}

export function ProposalEditor({
  id,
  defaults,
  quote,
}: {
  id: string | null;
  defaults: ProposalInput;
  /** Pedido do marketplace que este orçamento responde. */
  quote: { titulo: string; solicitante: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const form = useForm<ProposalInput>({ defaultValues: defaults });
  const { register, formState, setError, clearErrors, watch, control } = form;
  const { errors } = formState;
  const items = useFieldArray({ control, name: "itens" });

  const watched = watch();
  const totals = proposalTotals({
    itens: watched.itens.map((i) => ({ quantidade: num(i.quantidade), valorUnitario: num(i.valorUnitario) })),
    desconto: num(watched.desconto),
    frete: num(watched.frete),
  });

  function submit(enviar: boolean) {
    return form.handleSubmit((values) => {
      clearErrors();
      setFormError(undefined);
      setSaved(false);
      const parsed = proposalSchema.safeParse(values);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          setError(issue.path.join(".") as FieldPath<ProposalInput>, { message: issue.message });
        }
        setFormError("Confira os campos destacados.");
        return;
      }
      if (enviar && clientMissing(parsed.data)) {
        setError("clienteNome", { message: "Informe o cliente para enviar." });
        return;
      }
      if (proposalTotals(parsed.data).total < 0) {
        setError("desconto", { message: "Desconto maior que o total." });
        return;
      }

      startTransition(async () => {
        const result = await saveProposal(values, id, enviar);
        if (!result.ok) return setFormError(result.error);
        if (result.data.erroEnvio) {
          // Rascunho salvo, envio recusado: segue editando pelo rascunho.
          setFormError(result.data.erroEnvio);
          if (!id) router.replace(`/painel/propostas/${result.data.id}?erro=envio`);
          return;
        }
        if (enviar) {
          router.push(`/painel/propostas/${result.data.id}?enviado=1`);
        } else if (!id) {
          router.replace(`/painel/propostas/${result.data.id}`);
        } else {
          setSaved(true);
          router.refresh();
        }
      });
    });
  }

  const itemError = (index: number, field: keyof ProposalInput["itens"][number]) =>
    errors.itens?.[index]?.[field]?.message;

  return (
    <form onSubmit={submit(true)} noValidate className="flex flex-col gap-6">
      {formError && <Alert tone="error">{formError}</Alert>}
      {saved && <Alert tone="success">Rascunho salvo.</Alert>}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Cliente</h2>
          {quote ? (
            <p className="rounded-xl bg-surface-raised p-3 text-sm">
              Resposta ao pedido <strong>{quote.titulo}</strong> de <strong>{quote.solicitante}</strong>. O
              orçamento aparece para o solicitante junto com as outras propostas.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="clienteNome" label="Nome ou empresa" error={errors.clienteNome?.message} className="sm:col-span-2">
                <Input autoComplete="organization" maxLength={160} {...register("clienteNome")} />
              </Field>
              <Field id="clienteDocumento" label="CPF ou CNPJ" optional error={errors.clienteDocumento?.message}>
                <Input inputMode="numeric" maxLength={18} {...register("clienteDocumento")} />
              </Field>
              <Field id="clienteWhatsapp" label="WhatsApp" optional error={errors.clienteWhatsapp?.message}>
                <Input type="tel" inputMode="tel" placeholder="(15) 99999-0000" {...register("clienteWhatsapp")} />
              </Field>
              <Field id="clienteEmail" label="E-mail" optional error={errors.clienteEmail?.message} className="sm:col-span-2">
                <Input type="email" autoComplete="email" {...register("clienteEmail")} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field id="titulo" label="Título do orçamento" error={errors.titulo?.message}>
            <Input maxLength={140} placeholder="Ex.: Usinagem de 200 eixos em aço 1045" {...register("titulo")} />
          </Field>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Itens</h2>
            <span className="text-sm text-muted-foreground">{items.fields.length} de {PROPOSAL_MAX_ITEMS}</span>
          </div>
          {errors.itens?.message && <p className="text-sm text-danger">{errors.itens.message}</p>}

          <ol className="flex flex-col gap-3">
            {items.fields.map((field, index) => {
              const q = num(watched.itens[index]?.quantidade ?? "");
              const vu = num(watched.itens[index]?.valorUnitario ?? "");
              return (
                <li key={field.id} className="flex flex-col gap-3 rounded-xl border border-border p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-3 w-6 shrink-0 text-sm font-semibold text-muted-foreground">{index + 1}.</span>
                    <Field
                      id={`itens.${index}.descricao`}
                      label="Descrição"
                      error={itemError(index, "descricao")}
                      className="flex-1"
                    >
                      <Input maxLength={500} {...register(`itens.${index}.descricao`)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-8 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
                    <Field id={`itens.${index}.quantidade`} label="Qtd." error={itemError(index, "quantidade")}>
                      <Input inputMode="decimal" {...register(`itens.${index}.quantidade`)} />
                    </Field>
                    <Field id={`itens.${index}.unidade`} label="Unidade">
                      <NativeSelect {...register(`itens.${index}.unidade`)}>
                        {UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field id={`itens.${index}.valorUnitario`} label="Valor unit. (R$)" error={itemError(index, "valorUnitario")}>
                      <Input inputMode="decimal" placeholder="0,00" {...register(`itens.${index}.valorUnitario`)} />
                    </Field>
                    <div className="flex flex-col justify-end gap-1.5">
                      <span className="text-sm font-medium">Total</span>
                      <span className="flex h-11 items-center text-sm font-semibold tabular-nums">
                        {formatCurrency(Math.round(q * vu * 100) / 100)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Subir item ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => items.move(index, index - 1)}
                    >
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Descer item ${index + 1}`}
                      disabled={index === items.fields.length - 1}
                      onClick={() => items.move(index, index + 1)}
                    >
                      <ArrowDown aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover item ${index + 1}`}
                      disabled={items.fields.length === 1}
                      onClick={() => items.remove(index)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={items.fields.length >= PROPOSAL_MAX_ITEMS}
            onClick={() => items.append(EMPTY_ITEM)}
          >
            <Plus aria-hidden />
            Adicionar item
          </Button>

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <Field id="desconto" label="Desconto (R$)" optional error={errors.desconto?.message}>
              <Input inputMode="decimal" placeholder="0,00" {...register("desconto")} />
            </Field>
            <Field id="frete" label="Frete (R$)" optional error={errors.frete?.message}>
              <Input inputMode="decimal" placeholder="0,00" {...register("frete")} />
            </Field>
          </div>
          <dl className="flex flex-col gap-1 rounded-xl bg-surface-raised p-4 text-sm" aria-live="polite">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCurrency(totals.total)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Condições</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="prazoEntregaDias" label="Prazo de entrega (dias)" optional error={errors.prazoEntregaDias?.message}>
              <Input inputMode="numeric" placeholder="15" {...register("prazoEntregaDias")} />
            </Field>
            <Field id="validade" label="Válido até" error={errors.validade?.message}>
              <Input type="date" {...register("validade")} />
            </Field>
          </div>
          <Field id="condicoesPagamento" label="Pagamento" optional error={errors.condicoesPagamento?.message}>
            <Input maxLength={500} placeholder="Ex.: 50% no pedido, 50% na entrega. Boleto 28 dias." {...register("condicoesPagamento")} />
          </Field>
          <Field
            id="observacoes"
            label="Observações"
            optional
            hint="O que está incluso, normas, garantia, impostos."
            error={errors.observacoes?.message}
          >
            <Textarea rows={4} maxLength={5000} {...register("observacoes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" size="lg" disabled={pending} onClick={submit(false)}>
          {pending ? "Salvando…" : "Salvar rascunho"}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          <Send aria-hidden />
          {pending ? "Enviando…" : "Enviar orçamento"}
        </Button>
      </div>
    </form>
  );
}
