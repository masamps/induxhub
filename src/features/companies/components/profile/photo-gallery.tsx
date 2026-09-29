import Image from "next/image";

import type { CompanyProfile } from "@/features/companies/queries";
import { companyMediaUrl } from "@/lib/media";

export function PhotoGallery({ photos, companyName }: { photos: CompanyProfile["fotos"]; companyName: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo, index) => {
        const src = companyMediaUrl(photo.storagePath);
        return (
          <li key={photo.id} className="flex flex-col gap-1.5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-border bg-surface-raised">
              <Image
                src={src}
                alt={photo.legenda ?? `Foto ${index + 1} de ${companyName}`}
                fill
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
                // SVGs estáticos do seed não passam pelo otimizador de imagens.
                unoptimized={src.endsWith(".svg")}
              />
            </div>
            {photo.legenda && <p className="text-xs text-muted-foreground">{photo.legenda}</p>}
          </li>
        );
      })}
    </ul>
  );
}
