"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Sobe o arquivo direto do navegador para "{companyId}/{pasta}/{aleatório}.{ext}". */
export async function uploadToStorage(bucket: string, companyId: string, folder: string, file: File) {
  const ext = EXTENSIONS[file.type] ?? "bin";
  const path = `${companyId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createBrowserSupabase().storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}
