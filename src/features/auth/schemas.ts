import { z } from "zod";

export const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.");
export const password = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .max(72, "Use no máximo 72 caracteres.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email,
  password,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const recoverSchema = z.object({ email });
export type RecoverInput = z.infer<typeof recoverSchema>;

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
