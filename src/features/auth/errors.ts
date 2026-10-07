import type { AuthError } from "@supabase/supabase-js";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail. Entre ou recupere a senha.",
  email_exists: "Já existe uma conta com este e-mail. Entre ou recupere a senha.",
  weak_password: "Senha fraca. Use letras e números, com pelo menos 8 caracteres.",
  over_email_send_rate_limit: "Muitos e-mails enviados. Tente de novo em alguns minutos.",
  over_request_rate_limit: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  same_password: "A nova senha precisa ser diferente da atual.",
  signup_disabled: "Cadastro temporariamente desativado.",
  email_address_not_authorized: "Não conseguimos enviar o e-mail de confirmação para este endereço.",
  email_address_invalid: "E-mail inválido. Confira o endereço.",
};

// GoTrue devolve 500 sem código específico quando o SMTP falha.
const SEND_FAILED = /error sending .*email/i;

export function authErrorMessage(error: AuthError) {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (SEND_FAILED.test(error.message)) return "Não conseguimos enviar o e-mail de confirmação. Tente de novo mais tarde.";
  return "Não foi possível concluir. Tente de novo.";
}
