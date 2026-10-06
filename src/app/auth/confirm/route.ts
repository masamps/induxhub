import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/redirect";
import { createServerSupabase } from "@/lib/supabase/server";

/** Destino dos links de e-mail (confirmação e recuperação de senha) e da volta do Google. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Provedor OAuth recusou ou o usuário cancelou.
  if (searchParams.get("error")) return NextResponse.redirect(`${origin}/login?erro=google`);

  const supabase = await createServerSupabase();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing token") };

  if (error) return NextResponse.redirect(`${origin}/login?erro=link`);
  return NextResponse.redirect(`${origin}${next}`);
}
