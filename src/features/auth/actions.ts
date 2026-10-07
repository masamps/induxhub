"use server";

import { redirect } from "next/navigation";

import { fail, INVALID_INPUT, ok, type ActionResult } from "@/lib/action-result";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/redirect";
import { autoconfirmEnabled, createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import { authErrorMessage } from "./errors";
import {
  loginSchema,
  newPasswordSchema,
  recoverSchema,
  signUpSchema,
  type LoginInput,
  type NewPasswordInput,
  type RecoverInput,
  type SignUpInput,
} from "./schemas";

function confirmUrl(next: string) {
  return `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signIn(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(authErrorMessage(error));

  redirect(safeNext(next));
}

/** Cria a conta. Sem confirmação de e-mail (ou com AUTH_AUTOCONFIRM), já volta com sessão. */
export async function signUp(
  input: SignUpInput,
  next: string,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();

  if (autoconfirmEnabled()) {
    const { error: createError } = await createAdminClient().auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { nome: parsed.data.nome },
    });
    if (createError) return fail(authErrorMessage(createError));

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (signInError) return fail(authErrorMessage(signInError));
    return ok({ needsConfirmation: false });
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { nome: parsed.data.nome }, emailRedirectTo: confirmUrl(safeNext(next)) },
  });
  if (error) return fail(authErrorMessage(error));

  // Com confirmação ligada, e-mail já cadastrado volta sem erro e sem identidades.
  if (data.user && data.user.identities?.length === 0) {
    return fail("Já existe uma conta com este e-mail. Entre ou recupere a senha.");
  }

  return ok({ needsConfirmation: !data.session });
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

/** Sempre responde igual, exista ou não a conta. */
export async function requestPasswordReset(input: RecoverInput): Promise<ActionResult> {
  const parsed = recoverSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl("/login/nova-senha"),
  });
  if (error?.code === "over_email_send_rate_limit") return fail(authErrorMessage(error));

  return ok();
}

export async function updatePassword(input: NewPasswordInput): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT);

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(authErrorMessage(error));

  redirect("/painel");
}
