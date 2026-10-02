import { z } from "zod";

import { isValidCnpj, onlyDigits } from "@/lib/validation/cnpj";
import { isValidBrPhone, toWhatsappE164 } from "@/lib/validation/phone";

const CURRENT_YEAR = new Date().getFullYear();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((v) => v || null);

/** Campo numérico vindo de <input>: texto vazio vira null. */
const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), message)
    .transform((v) => (v === "" ? null : Number(v)));

export const cnpjField = z
  .string()
  .refine(isValidCnpj, "CNPJ inválido. Confira os números.")
  .transform(onlyDigits);

export const whatsappField = z
  .string()
  .refine(isValidBrPhone, "Informe DDD + número.")
  .transform(toWhatsappE164);

export const siteField = z
  .string()
  .trim()
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine((v) => v === "" || z.url().safeParse(v).success, "Endereço inválido.")
  .transform((v) => v || null);

export const companyIdentitySchema = z.object({
  cnpj: cnpjField,
  razaoSocial: z.string().trim().min(2, "Informe a razão social.").max(200),
  nomeFantasia: z.string().trim().min(2, "Informe o nome fantasia.").max(120),
  cityId: z.coerce.number<string>().int().positive("Escolha a cidade."),
  whatsapp: whatsappField,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || z.email().safeParse(v).success, "E-mail inválido.")
    .transform((v) => v || null),
});

export const providerServicesSchema = z.object({
  categoryIds: z.array(z.number().int()).min(1, "Escolha pelo menos uma categoria.").max(6, "Escolha até 6 categorias."),
  cityIds: z.array(z.number().int()).max(30),
});

export const providerAboutSchema = z.object({
  descricao: z.string().trim().min(30, "Conte um pouco mais (mínimo 30 caracteres).").max(2000),
  anoFundacao: optionalInt(1850, CURRENT_YEAR, `Ano entre 1850 e ${CURRENT_YEAR}.`),
  raioKm: optionalInt(0, 1000, "Raio entre 0 e 1000 km."),
});

export const createCompanySchema = z.discriminatedUnion("tipo", [
  companyIdentitySchema.extend({ tipo: z.literal("contratante") }),
  companyIdentitySchema
    .extend({ tipo: z.literal("prestador"), tambemContrata: z.boolean() })
    .merge(providerServicesSchema)
    .merge(providerAboutSchema),
]);
export type CreateCompanyInput = z.input<typeof createCompanySchema>;

/** Edição dos dados do perfil no painel. */
export const updateCompanySchema = z.object({
  razaoSocial: z.string().trim().min(2, "Informe a razão social.").max(200),
  nomeFantasia: z.string().trim().min(2, "Informe o nome fantasia.").max(120),
  cityId: z.coerce.number<string>().int().positive("Escolha a cidade."),
  whatsapp: whatsappField,
  email: companyIdentitySchema.shape.email,
  site: siteField,
  descricao: optionalText(2000),
  anoFundacao: providerAboutSchema.shape.anoFundacao,
  raioKm: providerAboutSchema.shape.raioKm,
});
export type UpdateCompanyInput = z.input<typeof updateCompanySchema>;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const CERTIFICATE_MAX_BYTES = 10 * 1024 * 1024;
export const CERTIFICATE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export const serviceAreaSchema = providerServicesSchema;
export type ServiceAreaInput = z.input<typeof serviceAreaSchema>;

export const equipmentSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120),
  modelo: optionalText(120),
  quantidade: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 999, "Quantidade entre 1 e 999.")
    .transform(Number),
  capacidade: optionalText(160),
});
export type EquipmentInput = z.input<typeof equipmentSchema>;

export const certificationSchema = z.object({
  nome: z.string().trim().min(2, "Informe a certificação.").max(120),
  orgao: optionalText(120),
  validade: z
    .string()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida.")
    .transform((v) => v || null),
  arquivoPath: z.string().max(300).nullable(),
});
export type CertificationInput = z.input<typeof certificationSchema>;

export const clientSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(120),
});
export type ClientInput = z.input<typeof clientSchema>;

export const photoSchema = z.object({
  path: z.string().min(1).max(300),
  legenda: optionalText(160),
});
export type PhotoInput = z.input<typeof photoSchema>;
