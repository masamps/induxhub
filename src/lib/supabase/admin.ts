import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const serverEnv = z
  .object({
    AUTH_AUTOCONFIRM: z.enum(["true", "false"]).default("false"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  })
  .parse({
    AUTH_AUTOCONFIRM: process.env.AUTH_AUTOCONFIRM || undefined,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  });

/**
 * Teste/preview: cria a conta já confirmada, sem enviar e-mail.
 * Exige AUTH_AUTOCONFIRM=true e a service role. Nunca ligar em produção.
 */
export function autoconfirmEnabled() {
  return serverEnv.AUTH_AUTOCONFIRM === "true" && !!serverEnv.SUPABASE_SERVICE_ROLE_KEY;
}

/** Cliente com service role: ignora RLS. Só no servidor, só para auth admin. */
export function createAdminClient() {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente");
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
