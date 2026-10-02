"use client";

import { FileUp, Paperclip, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogOption } from "@/features/catalog/queries";
import { pluralize } from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase/browser";

import { createQuoteRequest, previewRecipients } from "../actions";
import {
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_FILES,
  attachmentContentType,
  newQuoteSchema,
  type NewQuoteInput,
} from "../schemas";

type Values = Omit<NewQuoteInput, "anexos">;
type Attachment = { path: string; name: string };

function safeFileName(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
  return clean.slice(-80) || "arquivo";
}

export function NewQuoteForm({
  companyId,
  categories,
  cities,
  defaults,
  prestadorNome,
}: {
  companyId: string;
  categories: CatalogOption[];
  cities: CatalogOption[];
  defaults: { categoryId?: number; cityId?: number };
  prestadorNome?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recipients, setRecipients] = useState<number | null>(null);

  const form = useForm<Values>({
    defaultValues: {
      categoryId: defaults.categoryId ? String(defaults.categoryId) : "",
      cityId: defaults.cityId ? String(defaults.cityId) : "",
      titulo: "",
      descricao: "",
      prazoDesejado: "",
    },
  });
  const { register, formState, setError, clearErrors, watch } = form;
  const { errors } = formState;
  const categoryId = Number(watch("categoryId"));
  const cityId = Number(watch("cityId"));

  useEffect(() => {
    if (!categoryId || !cityId) return setRecipients(null);
    let cancelled = false;
    previewRecipients(categoryId, cityId).then((count) => !cancelled && setRecipients(count));
    return () => {
      cancelled = true;
    };
  }, [categoryId, cityId]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setFormError(undefined);
    const list = Array.from(files).slice(0, ATTACHMENT_MAX_FILES - attachments.length);
    const invalid = list.find((f) => !attachmentContentType(f.name) || f.size > ATTACHMENT_MAX_BYTES);
    if (invalid) {
      return setFormError(`"${invalid.name}" não pode ser anexado. Formatos aceitos de até 10 MB: ${ATTACHMENT_EXTENSIONS.join(", ")}.`);
    }

    setUploading(true);
    const supabase = createBrowserSupabase();
    const uploaded: Attachment[] = [];
    for (const file of list) {
      const path = `${companyId}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("quote-attachments").upload(path, file, { contentType: attachmentContentType(file.name)! });
      if (error) {
        setFormError(`Não foi possível enviar "${file.name}". Tente de novo.`);
        break;
      }
      uploaded.push({ path, name: file.name });
    }
    setAttachments((current) => [...current, ...uploaded]);
    setUploading(false);
  }

  function removeAttachment(path: string) {
    setAttachments((current) => current.filter((a) => a.path !== path));
    // Arquivo órfão é removido em segundo plano; falha aqui não bloqueia o pedido.
    void createBrowserSupabase().storage.from("quote-attachments").remove([path]);
  }

  const onSubmit = form.handleSubmit((values) => {
    clearErrors();
    const input = { ...values, anexos: attachments.map((a) => a.path) };
    const parsed = newQuoteSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(String(issue.path[0]) as keyof Values, { message: issue.message });
      }
      document.getElementById(String(parsed.error.issues[0]?.path[0]))?.focus();
      return;
    }
    startTransition(async () => {
      setFormError(undefined);
      const result = await createQuoteRequest(input);
      if (!result.ok) return setFormError(result.error);
      router.push(`/orcamentos/${result.data.id}?enviado=1`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && <Alert tone="error">{formError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="categoryId" label="Tipo de serviço" error={errors.categoryId?.message}>
          <NativeSelect {...register("categoryId")}>
            <option value="">Escolha a categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="cityId" label="Onde será o serviço" error={errors.cityId?.message}>
          <NativeSelect {...register("cityId")}>
            <option value="">Escolha a cidade</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      {recipients !== null && (
        <Alert tone={recipients ? "info" : "error"}>
          <span className="flex items-center gap-2">
            <Users aria-hidden className="size-4" />
            {recipients
              ? `${prestadorNome ? `${prestadorNome} e outros fornecedores` : "Fornecedores"} da região vão receber: ${pluralize(recipients, "empresa", "empresas")}.`
              : "Ainda não há fornecedores desta categoria nesta cidade. Tente uma cidade vizinha."}
          </span>
        </Alert>
      )}

      <Field id="titulo" label="Título do pedido" hint="Ex.: Usinagem de 500 eixos em aço 1045" error={errors.titulo?.message}>
        <Input maxLength={140} {...register("titulo")} />
      </Field>

      <Field
        id="descricao"
        label="Descrição"
        hint="Quantidade, material, medidas, normas e o que mais o fornecedor precisa saber."
        error={errors.descricao?.message}
      >
        <Textarea rows={6} maxLength={5000} {...register("descricao")} />
      </Field>

      <Field id="prazoDesejado" label="Prazo desejado" optional error={errors.prazoDesejado?.message}>
        <Input type="date" className="sm:max-w-56" {...register("prazoDesejado")} />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Anexos <span className="font-normal text-muted-foreground">(opcional)</span>
        </span>
        <p className="text-xs text-muted-foreground">
          Desenhos, fotos ou especificações (PDF, imagem, DWG, STEP, planilha). Até 10 MB cada, no máximo{" "}
          {ATTACHMENT_MAX_FILES}.
        </p>
        {attachments.length > 0 && (
          <ul className="flex flex-col gap-2">
            {attachments.map((a) => (
              <li key={a.path} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <Paperclip aria-hidden className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  onClick={() => removeAttachment(a.path)}
                  aria-label={`Remover ${a.name}`}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {attachments.length < ATTACHMENT_MAX_FILES && (
          <label className="flex h-11 w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm font-medium hover:bg-surface-raised has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
            <FileUp aria-hidden className="size-4" />
            {uploading ? "Enviando…" : "Adicionar arquivo"}
            <input
              type="file"
              multiple
              accept={ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                void onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <Button type="submit" size="lg" className="sm:self-end" disabled={pending || uploading || recipients === 0}>
        {pending ? "Enviando pedido…" : "Enviar pedido"}
      </Button>
    </form>
  );
}
