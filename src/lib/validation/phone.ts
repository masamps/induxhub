import { onlyDigits } from "./cnpj";

/** Máscara progressiva de telefone BR: (15) 99999-9999 ou (15) 3333-3333. */
export function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.replace(/^(\d{1,2})/, "($1");
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

/** Converte para o formato salvo no banco: 55 + DDD + número. */
export function toWhatsappE164(value: string) {
  const digits = onlyDigits(value);
  return digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
}

export function isValidBrPhone(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

/** Formata o número salvo (55 + DDD + número) para exibição. */
export function formatWhatsapp(e164: string) {
  return maskPhone(e164.replace(/^55/, ""));
}
