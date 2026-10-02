import { z } from "zod";

export const ATTACHMENT_MAX_FILES = 5;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
/** Extensões aceitas. Desenhos CAD (dwg, dxf, step) sobem como application/octet-stream. */
export const ATTACHMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "zip", "xlsx", "docx", "dwg", "dxf", "step", "stp"];

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  zip: "application/zip",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function attachmentContentType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ATTACHMENT_EXTENSIONS.includes(ext)) return null;
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export const newQuoteSchema = z.object({
  categoryId: z.coerce.number<string>().int().positive("Escolha a categoria."),
  cityId: z.coerce.number<string>().int().positive("Escolha a cidade."),
  titulo: z.string().trim().min(5, "Resuma em pelo menos 5 caracteres.").max(140),
  descricao: z
    .string()
    .trim()
    .min(20, "Descreva com mais detalhes (mínimo 20 caracteres).")
    .max(5000, "Use no máximo 5000 caracteres."),
  prazoDesejado: z
    .string()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v >= todayIso()), "Escolha uma data a partir de hoje.")
    .transform((v) => v || null),
  anexos: z.array(z.string().max(300)).max(ATTACHMENT_MAX_FILES),
});
export type NewQuoteInput = z.input<typeof newQuoteSchema>;

export const replySchema = z.object({
  mensagem: z.string().trim().min(10, "Escreva pelo menos 10 caracteres.").max(5000),
  valorEstimado: z
    .string()
    .trim()
    .transform((v) => v.replace(/\./g, "").replace(",", "."))
    .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 9_999_999_999), "Valor inválido.")
    .transform((v) => (v === "" ? null : Number(v))),
  prazoDias: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 730), "Prazo entre 1 e 730 dias.")
    .transform((v) => (v === "" ? null : Number(v))),
});
export type ReplyInput = z.input<typeof replySchema>;

export const reviewSchema = z.object({
  nota: z.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5),
  comentario: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null),
});
export type ReviewInput = z.input<typeof reviewSchema>;
