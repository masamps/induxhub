export const WHATSAPP_DEFAULT_MESSAGE =
  "Olá, encontrei sua empresa no InduxHub e gostaria de um orçamento.";

export function buildWhatsappLink(e164: string, message = WHATSAPP_DEFAULT_MESSAGE) {
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
