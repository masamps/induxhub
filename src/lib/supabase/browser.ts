import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Cliente do navegador (singleton). Lê a mesma sessão em cookies do servidor. */
export function createBrowserSupabase() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
