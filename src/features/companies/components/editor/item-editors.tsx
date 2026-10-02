"use client";

import { FileText, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatFullDate } from "@/lib/format";

import { addCertification, addClient, addEquipment, removeProfileItem } from "../../editor-actions";
import type { EditableProfile } from "../../editor-queries";
import {
  CERTIFICATE_MAX_BYTES,
  CERTIFICATE_TYPES,
  certificationSchema,
  clientSchema,
  equipmentSchema,
  type ClientInput,
  type EquipmentInput,
} from "../../schemas";
import { uploadToStorage } from "./upload";

type Result = { ok: boolean; error?: string };

/** Lista com remover + formulário de adicionar. Validação com o mesmo schema do servidor. */
function useItemForm<T extends FieldValues>(schema: z.ZodType, defaults: T, save: (values: T) => Promise<Result>) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useForm<T>({ defaultValues: defaults as never });

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors();
    setError(undefined);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) form.setError(String(issue.path[0]) as Path<T>, { message: issue.message });
      return;
    }
    startTransition(async () => {
      try {
        const result = await save(values);
        if (!result.ok) return setError(result.error);
        form.reset(defaults);
        router.refresh();
      } catch {
        setError("Não foi possível salvar. Tente de novo.");
      }
    });
  });

  return { form, onSubmit, error, pending };
}

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => Promise<Result> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Remover ${label}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await onRemove();
          if (result.ok) router.refresh();
        })
      }
    >
      <Trash2 aria-hidden />
    </Button>
  );
}

function ItemList({ empty, children }: { empty: string; children: React.ReactNode[] }) {
  if (!children.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">{children}</ul>;
}

function AddForm<T extends FieldValues>({
  title,
  state,
  children,
}: {
  title: string;
  state: { form: UseFormReturn<T>; onSubmit: () => void; error?: string; pending: boolean };
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={state.onSubmit} noValidate className="flex flex-col gap-4 rounded-xl border border-dashed border-border p-4">
      <h3 className="font-semibold">{title}</h3>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {children}
      <Button type="submit" variant="outline" className="sm:self-start" disabled={state.pending}>
        <Plus aria-hidden />
        {state.pending ? "Adicionando…" : "Adicionar"}
      </Button>
    </form>
  );
}

export function EquipmentEditor({ items }: { items: EditableProfile["equipment"] }) {
  const state = useItemForm<EquipmentInput>(
    equipmentSchema,
    { nome: "", modelo: "", quantidade: "1", capacidade: "" },
    addEquipment,
  );
  const { register, formState } = state.form;

  return (
    <div className="flex flex-col gap-6">
      <ItemList empty="Nenhum equipamento cadastrado. Clientes industriais olham isso primeiro.">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {item.quantidade > 1 && <span className="text-primary">{item.quantidade}× </span>}
                {item.nome}
                {item.modelo && <span className="text-muted-foreground"> · {item.modelo}</span>}
              </p>
              {item.capacidade && <p className="text-sm text-muted-foreground">{item.capacidade}</p>}
            </div>
            <RemoveButton label={item.nome} onRemove={() => removeProfileItem("equipment", item.id)} />
          </li>
        ))}
      </ItemList>
      <AddForm title="Adicionar equipamento" state={state}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="eq-nome" label="Máquina ou equipamento" error={formState.errors.nome?.message}>
            <Input placeholder="Centro de usinagem CNC" {...register("nome")} />
          </Field>
          <Field id="eq-modelo" label="Modelo" optional error={formState.errors.modelo?.message}>
            <Input placeholder="Romi D 800" {...register("modelo")} />
          </Field>
          <Field id="eq-quantidade" label="Quantidade" error={formState.errors.quantidade?.message}>
            <Input inputMode="numeric" {...register("quantidade")} />
          </Field>
          <Field id="eq-capacidade" label="Capacidade" optional error={formState.errors.capacidade?.message}>
            <Input placeholder="Curso 800 x 530 x 580 mm" {...register("capacidade")} />
          </Field>
        </div>
      </AddForm>
    </div>
  );
}

type CertificationForm = { nome: string; orgao: string; validade: string; arquivo: FileList | null };

export function CertificationEditor({ items, companyId }: { items: EditableProfile["certifications"]; companyId: string }) {
  const state = useItemForm<CertificationForm>(
    certificationSchema.omit({ arquivoPath: true }),
    { nome: "", orgao: "", validade: "", arquivo: null },
    async ({ arquivo, ...values }) => {
      const file = arquivo?.[0];
      if (file && (!CERTIFICATE_TYPES.includes(file.type) || file.size > CERTIFICATE_MAX_BYTES)) {
        return { ok: false, error: "O certificado deve ser PDF ou imagem de até 10 MB." };
      }
      const arquivoPath = file ? await uploadToStorage("certifications", companyId, "certificados", file) : null;
      return addCertification({ ...values, arquivoPath });
    },
  );
  const { register, formState } = state.form;

  return (
    <div className="flex flex-col gap-6">
      <ItemList empty="Nenhuma certificação cadastrada.">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.nome}</p>
              <p className="text-sm text-muted-foreground">
                {[item.orgao, item.validade && `Válida até ${formatFullDate(item.validade)}`].filter(Boolean).join(" · ")}
              </p>
              {item.arquivoUrl && (
                <a
                  href={item.arquivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FileText aria-hidden className="size-3.5" />
                  Ver arquivo
                </a>
              )}
            </div>
            <RemoveButton label={item.nome} onRemove={() => removeProfileItem("certifications", item.id)} />
          </li>
        ))}
      </ItemList>
      <AddForm title="Adicionar certificação" state={state}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cert-nome" label="Certificação" error={formState.errors.nome?.message}>
            <Input placeholder="ISO 9001:2015" {...register("nome")} />
          </Field>
          <Field id="cert-orgao" label="Órgão certificador" optional error={formState.errors.orgao?.message}>
            <Input placeholder="Bureau Veritas" {...register("orgao")} />
          </Field>
          <Field id="cert-validade" label="Validade" optional error={formState.errors.validade?.message}>
            <Input type="date" {...register("validade")} />
          </Field>
          <Field id="cert-arquivo" label="Arquivo do certificado" optional hint="Fica privado, só você vê.">
            <Input type="file" accept={CERTIFICATE_TYPES.join(",")} className="py-2.5" {...register("arquivo")} />
          </Field>
        </div>
      </AddForm>
    </div>
  );
}

export function ClientEditor({ items }: { items: EditableProfile["clients"] }) {
  const state = useItemForm<ClientInput>(clientSchema, { nome: "" }, addClient);
  const { register, formState } = state.form;

  return (
    <div className="flex flex-col gap-6">
      <ItemList empty="Nenhum cliente cadastrado. Clientes conhecidos passam confiança.">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <p className="min-w-0 flex-1 font-medium">{item.nome}</p>
            <RemoveButton label={item.nome} onRemove={() => removeProfileItem("key_clients", item.id)} />
          </li>
        ))}
      </ItemList>
      <AddForm title="Adicionar cliente" state={state}>
        <Field id="cli-nome" label="Nome do cliente" hint="Só cite clientes que autorizam a divulgação." error={formState.errors.nome?.message}>
          <Input {...register("nome")} />
        </Field>
      </AddForm>
    </div>
  );
}
