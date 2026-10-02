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
};

export function authErrorMessage(error: AuthError) {
  return (error.code && MESSAGES[error.code]) || "Não foi possível concluir. Tente de novo.";
}
