"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogOption } from "@/features/catalog/queries";
import { maskCnpj } from "@/lib/validation/cnpj";
import { formatWhatsapp, maskPhone } from "@/lib/validation/phone";

import type { EditableProfile } from "../../editor-queries";
import { updateCompanyProfile } from "../../editor-actions";
import { updateCompanySchema, type UpdateCompanyInput } from "../../schemas";

type Values = UpdateCompanyInput & { tambemContrata: boolean };

export function ProfileDataForm({ profile, cities }: { profile: EditableProfile; cities: CatalogOption[] }) {
  const provider = profile.tipo !== "contratante";
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string }>();
  const form = useForm<Values>({
    defaultValues: {
      razaoSocial: profile.razao_social,
      nomeFantasia: profile.nome_fantasia,
      cityId: String(profile.city_id),
      whatsapp: profile.whatsapp ? formatWhatsapp(profile.whatsapp) : "",
      email: profile.email ?? "",
      site: profile.site ?? "",
      descricao: profile.descricao ?? "",
      anoFundacao: profile.ano_fundacao ? String(profile.ano_fundacao) : "",
      raioKm: profile.raio_km !== null ? String(profile.raio_km) : "",
      tambemContrata: profile.tipo === "ambos",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors();
    setStatus(undefined);
    const parsed = updateCompanySchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        form.setError(String(issue.path[0]) as keyof Values, { message: issue.message });
      }
      document.getElementById(String(parsed.error.issues[0]?.path[0]))?.focus();
      return;
    }
    startTransition(async () => {
      const result = await updateCompanyProfile(values);
      setStatus(result.ok ? { ok: true, message: "Alterações salvas." } : { ok: false, message: result.error });
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {status && <Alert tone={status.ok ? "success" : "error"}>{status.message}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="cnpj" label="CNPJ" hint="Para alterar o CNPJ, fale com o suporte.">
          <Input value={maskCnpj(profile.cnpj)} readOnly disabled />
        </Field>
        <Field id="cityId" label="Cidade da sede" error={errors.cityId?.message}>
          <NativeSelect {...form.register("cityId")}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="razaoSocial" label="Razão social" error={errors.razaoSocial?.message}>
          <Input {...form.register("razaoSocial")} />
        </Field>
        <Field id="nomeFantasia" label="Nome fantasia" error={errors.nomeFantasia?.message}>
          <Input {...form.register("nomeFantasia")} />
        </Field>
        <Field id="whatsapp" label="WhatsApp" error={errors.whatsapp?.message}>
          <Input
            type="tel"
            inputMode="tel"
            {...form.register("whatsapp", { onChange: (e) => form.setValue("whatsapp", maskPhone(e.target.value)) })}
          />
        </Field>
        <Field id="email" label="E-mail comercial" optional error={errors.email?.message}>
          <Input type="email" inputMode="email" {...form.register("email")} />
        </Field>
        <Field id="site" label="Site" optional error={errors.site?.message} className="sm:col-span-2">
          <Input inputMode="url" placeholder="www.suaempresa.com.br" {...form.register("site")} />
        </Field>
      </div>

      {provider && (
        <>
          <Field
            id="descricao"
            label="Descrição"
            hint="Serviços, materiais, diferenciais. É o primeiro texto do seu perfil."
            error={errors.descricao?.message}
          >
            <Textarea rows={6} maxLength={2000} {...form.register("descricao")} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="anoFundacao" label="Ano de fundação" optional error={errors.anoFundacao?.message}>
              <Input inputMode="numeric" maxLength={4} {...form.register("anoFundacao")} />
            </Field>
            <Field id="raioKm" label="Raio de atendimento (km)" optional error={errors.raioKm?.message}>
              <Input inputMode="numeric" maxLength={4} {...form.register("raioKm")} />
            </Field>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" {...form.register("tambemContrata")} />
            Minha empresa também contrata serviços (pode pedir orçamentos)
          </label>
        </>
      )}

      <Button type="submit" size="lg" className="sm:self-end" disabled={pending}>
        {pending ? "Salvando…" : "Salvar alterações"}
      </Button>
    </form>
  );
}
