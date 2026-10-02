"use client";

import { ArrowLeft, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import type { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleChips } from "@/components/ui/toggle-chips";
import { signUp } from "@/features/auth/actions";
import { signUpSchema } from "@/features/auth/schemas";
import type { CatalogOption } from "@/features/catalog/queries";
import { createCompany } from "@/features/companies/actions";
import { companyIdentitySchema, providerAboutSchema, providerServicesSchema } from "@/features/companies/schemas";
import { maskCnpj } from "@/lib/validation/cnpj";
import { maskPhone } from "@/lib/validation/phone";

import { StepProgress } from "./step-progress";

type Tipo = "contratante" | "prestador";
type StepKey = "conta" | "empresa" | "servicos" | "sobre" | "revisao";

type Values = {
  nome: string;
  emailConta: string;
  password: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cityId: string;
  whatsapp: string;
  email: string;
  categoryIds: number[];
  cityIds: number[];
  descricao: string;
  anoFundacao: string;
  raioKm: string;
  tambemContrata: boolean;
};

const EMPTY: Values = {
  nome: "",
  emailConta: "",
  password: "",
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  cityId: "",
  whatsapp: "",
  email: "",
  categoryIds: [],
  cityIds: [],
  descricao: "",
  anoFundacao: "",
  raioKm: "",
  tambemContrata: false,
};

const STEP_LABELS: Record<StepKey, string> = {
  conta: "Sua conta",
  empresa: "Dados da empresa",
  servicos: "Serviços e região",
  sobre: "Sobre a empresa",
  revisao: "Revisão",
};

const STEPS: Record<Tipo, StepKey[]> = {
  contratante: ["conta", "empresa", "revisao"],
  prestador: ["conta", "empresa", "servicos", "sobre", "revisao"],
};

type Draft = { values: Omit<Values, "password">; step: StepKey };

function withoutPassword(values: Values): Draft["values"] {
  const draft: Partial<Values> = { ...values };
  delete draft.password;
  return draft as Draft["values"];
}

function draftKey(tipo: Tipo) {
  return `induxhub:cadastro:${tipo}`;
}

function readDraft(tipo: Tipo): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(tipo));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(tipo: Tipo, draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(draftKey(tipo), JSON.stringify(draft));
    else window.localStorage.removeItem(draftKey(tipo));
  } catch {
    // Navegação privada ou armazenamento cheio: segue sem rascunho.
  }
}

export function SignupWizard({
  tipo,
  categories,
  cities,
  account,
}: {
  tipo: Tipo;
  categories: CatalogOption[];
  cities: CatalogOption[];
  account: { email: string } | null;
}) {
  const router = useRouter();
  // Fixo na montagem: criar a conta no meio do fluxo não pode deslocar as etapas.
  const [startedWithAccount] = useState(() => Boolean(account));
  const steps = useMemo(() => STEPS[tipo].filter((s) => !(startedWithAccount && s === "conta")), [tipo, startedWithAccount]);
  const [stepIndex, setStepIndex] = useState(0);
  const [formError, setFormError] = useState<string>();
  const [awaitingEmail, setAwaitingEmail] = useState<string>();
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({ defaultValues: { ...EMPTY, email: account?.email ?? "" } });
  const { register, setValue, watch, getValues, setError, clearErrors, formState } = form;
  const { errors } = formState;
  const step = steps[stepIndex] ?? "revisao";

  // Restaura o rascunho (ex.: volta do link de confirmação de e-mail).
  useEffect(() => {
    const draft = readDraft(tipo);
    if (!draft) return;
    form.reset({ ...EMPTY, ...draft.values, password: "", email: draft.values.email || account?.email || "" });
    const index = steps.indexOf(draft.step);
    setStepIndex(index >= 0 ? index : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeDraft(tipo, { values: withoutPassword(getValues()), step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /** Valida só os campos da etapa com o schema do servidor e marca os erros no form. */
  function validate<S extends z.ZodType>(schema: S, fields: Record<string, unknown>, map: Record<string, FieldPath<Values>> = {}) {
    clearErrors();
    const result = schema.safeParse(fields);
    if (result.success) return true;
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      setError(map[key] ?? (key as FieldPath<Values>), { message: issue.message });
    }
    const first = String(result.error.issues[0]?.path[0]);
    document.getElementById(map[first] ?? first)?.focus();
    return false;
  }

  function goTo(index: number) {
    setFormError(undefined);
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    const v = getValues();
    switch (step) {
      case "conta": {
        if (!validate(signUpSchema, { nome: v.nome, email: v.emailConta, password: v.password }, { email: "emailConta" }))
          return;
        startTransition(async () => {
          setFormError(undefined);
          writeDraft(tipo, { values: { ...withoutPassword(v), email: v.email || v.emailConta }, step: "empresa" });
          const result = await signUp(
            { nome: v.nome, email: v.emailConta, password: v.password },
            `/cadastro/${tipo === "prestador" ? "prestador" : "empresa"}`,
          );
          if (!result.ok) return setFormError(result.error);
          if (!v.email) setValue("email", v.emailConta);
          if (result.data.needsConfirmation) return setAwaitingEmail(v.emailConta);
          router.refresh();
          goTo(stepIndex + 1);
        });
        return;
      }
      case "empresa":
        if (validate(companyIdentitySchema, v)) goTo(stepIndex + 1);
        return;
      case "servicos":
        if (validate(providerServicesSchema, v)) goTo(stepIndex + 1);
        return;
      case "sobre":
        if (validate(providerAboutSchema, v)) goTo(stepIndex + 1);
        return;
      case "revisao":
        submit();
    }
  }

  function submit() {
    const v = getValues();
    startTransition(async () => {
      setFormError(undefined);
      const result = await createCompany(
        tipo === "prestador"
          ? { ...v, tipo: "prestador" }
          : {
              tipo: "contratante",
              cnpj: v.cnpj,
              razaoSocial: v.razaoSocial,
              nomeFantasia: v.nomeFantasia,
              cityId: v.cityId,
              whatsapp: v.whatsapp,
              email: v.email,
            },
      );
      if (!result.ok) return setFormError(result.error);
      writeDraft(tipo, null);
      router.push("/painel?bemvindo=1");
      router.refresh();
    });
  }

  if (awaitingEmail) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <MailCheck aria-hidden className="size-10 text-primary" />
          <h2 className="text-xl font-bold">Confirme seu e-mail</h2>
          <p className="text-muted-foreground">
            Enviamos um link para <strong className="text-foreground">{awaitingEmail}</strong>. Abra o link neste
            aparelho para continuar o cadastro de onde parou.
          </p>
        </CardContent>
      </Card>
    );
  }

  const cityOptions = cities.map((c) => ({ id: c.id, nome: c.nome }));
  const categoryOptions = categories.map((c) => ({ id: c.id, nome: c.nome }));
  const values = watch();

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-5 sm:p-8">
        <StepProgress steps={steps.map((s) => STEP_LABELS[s])} current={stepIndex} />

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="flex flex-col gap-5"
        >
          {formError && <Alert tone="error">{formError}</Alert>}

          {step === "conta" && (
            <>
              <Field id="nome" label="Seu nome" error={errors.nome?.message}>
                <Input autoComplete="name" {...register("nome")} />
              </Field>
              <Field id="emailConta" label="E-mail" hint="Você vai usar para entrar." error={errors.emailConta?.message}>
                <Input type="email" autoComplete="email" inputMode="email" {...register("emailConta")} />
              </Field>
              <Field id="password" label="Senha" hint="Pelo menos 8 caracteres." error={errors.password?.message}>
                <PasswordInput autoComplete="new-password" {...register("password")} />
              </Field>
            </>
          )}

          {step === "empresa" && (
            <>
              <Field id="cnpj" label="CNPJ" error={errors.cnpj?.message}>
                <Input
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  {...register("cnpj", { onChange: (e) => setValue("cnpj", maskCnpj(e.target.value)) })}
                />
              </Field>
              <Field id="razaoSocial" label="Razão social" error={errors.razaoSocial?.message}>
                <Input autoComplete="organization" {...register("razaoSocial")} />
              </Field>
              <Field
                id="nomeFantasia"
                label="Nome fantasia"
                hint="É o nome que aparece para os clientes."
                error={errors.nomeFantasia?.message}
              >
                <Input {...register("nomeFantasia")} />
              </Field>
              <Field id="cityId" label="Cidade da sede" error={errors.cityId?.message}>
                <NativeSelect {...register("cityId")}>
                  <option value="">Escolha a cidade</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="whatsapp" label="WhatsApp" error={errors.whatsapp?.message}>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(15) 99999-9999"
                  {...register("whatsapp", { onChange: (e) => setValue("whatsapp", maskPhone(e.target.value)) })}
                />
              </Field>
              <Field id="email" label="E-mail comercial" optional error={errors.email?.message}>
                <Input type="email" inputMode="email" {...register("email")} />
              </Field>
            </>
          )}

          {step === "servicos" && (
            <>
              <div className="flex flex-col gap-2">
                <p id="categorias-label" className="text-sm font-medium">
                  O que sua empresa faz?
                </p>
                <p className="text-xs text-muted-foreground">Escolha até 6. Você recebe pedidos dessas categorias.</p>
                <ToggleChips
                  labelledBy="categorias-label"
                  options={categoryOptions}
                  value={values.categoryIds}
                  max={6}
                  onChange={(ids) => setValue("categoryIds", ids)}
                />
                {errors.categoryIds && (
                  <p id="categoryIds" tabIndex={-1} className="text-xs text-danger">
                    {errors.categoryIds.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p id="cidades-label" className="text-sm font-medium">
                  Atende outras cidades?
                </p>
                <p className="text-xs text-muted-foreground">A cidade da sede já está incluída.</p>
                <ToggleChips
                  labelledBy="cidades-label"
                  options={cityOptions}
                  value={values.cityIds}
                  disabledIds={[Number(values.cityId)]}
                  onChange={(ids) => setValue("cityIds", ids)}
                />
              </div>
            </>
          )}

          {step === "sobre" && (
            <>
              <Field
                id="descricao"
                label="Descrição"
                hint="Serviços, materiais, diferenciais. Aparece no seu perfil."
                error={errors.descricao?.message}
              >
                <Textarea rows={5} maxLength={2000} {...register("descricao")} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="anoFundacao" label="Ano de fundação" optional error={errors.anoFundacao?.message}>
                  <Input inputMode="numeric" maxLength={4} placeholder="2005" {...register("anoFundacao")} />
                </Field>
                <Field id="raioKm" label="Raio de atendimento (km)" optional error={errors.raioKm?.message}>
                  <Input inputMode="numeric" maxLength={4} placeholder="80" {...register("raioKm")} />
                </Field>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" className="size-5 accent-[var(--primary)]" {...register("tambemContrata")} />
                Minha empresa também contrata serviços
              </label>
            </>
          )}

          {step === "revisao" && (
            <Review
              tipo={tipo}
              values={values}
              cities={cities}
              categories={categories}
              onEdit={(key) => goTo(steps.indexOf(key))}
            />
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
            {stepIndex > 0 ? (
              <Button type="button" variant="ghost" onClick={() => goTo(stepIndex - 1)} disabled={pending}>
                <ArrowLeft aria-hidden />
                Voltar
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Aguarde…" : step === "revisao" ? "Concluir cadastro" : step === "conta" ? "Criar conta" : "Continuar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Review({
  tipo,
  values,
  cities,
  categories,
  onEdit,
}: {
  tipo: Tipo;
  values: Values;
  cities: CatalogOption[];
  categories: CatalogOption[];
  onEdit: (step: StepKey) => void;
}) {
  const cityName = (id: number) => cities.find((c) => c.id === id)?.nome;
  const rows: { step: StepKey; items: [string, string | undefined][] }[] = [
    {
      step: "empresa",
      items: [
        ["CNPJ", values.cnpj],
        ["Razão social", values.razaoSocial],
        ["Nome fantasia", values.nomeFantasia],
        ["Cidade", cityName(Number(values.cityId))],
        ["WhatsApp", values.whatsapp],
        ["E-mail", values.email || undefined],
      ],
    },
  ];
  if (tipo === "prestador") {
    rows.push(
      {
        step: "servicos",
        items: [
          ["Categorias", values.categoryIds.map((id) => categories.find((c) => c.id === id)?.nome).join(", ")],
          ["Outras cidades", values.cityIds.map(cityName).filter(Boolean).join(", ") || "Só a sede"],
        ],
      },
      {
        step: "sobre",
        items: [
          ["Descrição", values.descricao],
          ["Fundação", values.anoFundacao || undefined],
          ["Raio", values.raioKm ? `${values.raioKm} km` : undefined],
          ["Também contrata", values.tambemContrata ? "Sim" : "Não"],
        ],
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((section) => (
        <section key={section.step} className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{STEP_LABELS[section.step]}</h3>
            <Button type="button" variant="link" size="sm" onClick={() => onEdit(section.step)}>
              Editar
            </Button>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
            {section.items
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
