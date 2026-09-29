import { env } from "@/lib/env";

const COMPANY_MEDIA_BUCKET = "company-media";

/**
 * Resolve o caminho salvo em `company_photos.storage_path`.
 * Caminhos iniciados por "/" são assets estáticos (seed); os demais ficam no Storage.
 */
export function companyMediaUrl(path: string) {
  if (path.startsWith("/")) return path;
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${COMPANY_MEDIA_BUCKET}/${path}`;
}
