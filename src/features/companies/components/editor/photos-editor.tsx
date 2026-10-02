"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyAvatar } from "@/features/companies/components/company-avatar";
import { companyMediaUrl } from "@/lib/media";

import { addPhoto, removePhoto, setLogo } from "../../editor-actions";
import type { EditableProfile } from "../../editor-queries";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "../../schemas";
import { uploadToStorage } from "./upload";

function checkImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return "Envie JPG, PNG ou WebP.";
  if (file.size > IMAGE_MAX_BYTES) return "A imagem passa de 5 MB. Reduza e tente de novo.";
  return null;
}

export function PhotosEditor({ profile, limit }: { profile: EditableProfile; limit: number }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string | null>(null);
  const [legenda, setLegenda] = useState("");
  const [, startTransition] = useTransition();
  const full = profile.photos.length >= limit;

  async function run(key: string, task: () => Promise<{ ok: boolean; error?: string }>) {
    setError(undefined);
    setBusy(key);
    try {
      const result = await task();
      if (!result.ok) setError(result.error);
      else startTransition(() => router.refresh());
    } catch {
      setError("Não foi possível enviar o arquivo. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  function onLogo(file: File | undefined) {
    if (!file) return;
    const problem = checkImage(file);
    if (problem) return setError(problem);
    void run("logo", async () => setLogo(await uploadToStorage("company-media", profile.id, "logo", file)));
  }

  function onPhoto(file: File | undefined) {
    if (!file) return;
    const problem = checkImage(file);
    if (problem) return setError(problem);
    void run("foto", async () => {
      const result = await addPhoto({ path: await uploadToStorage("company-media", profile.id, "fotos", file), legenda });
      if (result.ok) setLegenda("");
      return result;
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <Alert tone="error">{error}</Alert>}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Logo</h2>
        <div className="flex items-center gap-4">
          <CompanyAvatar name={profile.nome_fantasia} logoUrl={profile.logo_url} size="lg" />
          <div className="flex flex-col gap-2">
            <FilePicker label={busy === "logo" ? "Enviando…" : profile.logo_url ? "Trocar logo" : "Enviar logo"} disabled={!!busy} onFile={onLogo} />
            {profile.logo_url && (
              <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => void run("logo", () => setLogo(null))}>
                Remover logo
              </Button>
            )}
            <p className="text-xs text-muted-foreground">Quadrada, pelo menos 200×200 px.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Fotos da empresa e de trabalhos</h2>
          <span className="text-sm text-muted-foreground">
            {profile.photos.length} de {limit}
          </span>
        </div>
        {profile.photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.photos.map((photo) => (
              <li key={photo.id} className="flex flex-col gap-1.5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-raised">
                  <Image
                    src={companyMediaUrl(photo.storagePath)}
                    alt={photo.legenda ?? "Foto"}
                    fill
                    sizes="(min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 size-9 bg-background/80"
                    aria-label={`Remover foto${photo.legenda ? ` ${photo.legenda}` : ""}`}
                    disabled={!!busy}
                    onClick={() => void run(photo.id, () => removePhoto(photo.id))}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                {photo.legenda && <span className="truncate text-xs text-muted-foreground">{photo.legenda}</span>}
              </li>
            ))}
          </ul>
        )}
        {full ? (
          <Alert tone="info">
            {profile.premium
              ? "Limite de fotos atingido."
              : "O plano gratuito permite 5 fotos. No Premium serão até 30. Remova uma foto para enviar outra."}
          </Alert>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium" htmlFor="legenda">
              Legenda <span className="font-normal text-muted-foreground">(opcional)</span>
              <Input
                id="legenda"
                maxLength={160}
                value={legenda}
                onChange={(e) => setLegenda(e.target.value)}
                placeholder="Ex.: Eixo usinado em aço 4140"
              />
            </label>
            <FilePicker label={busy === "foto" ? "Enviando…" : "Adicionar foto"} disabled={!!busy} onFile={onPhoto} />
          </div>
        )}
      </section>
    </div>
  );
}

function FilePicker({ label, disabled, onFile }: { label: string; disabled: boolean; onFile: (file?: File) => void }) {
  return (
    <label
      className="flex h-11 w-fit cursor-pointer items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-surface-raised has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
    >
      <ImagePlus aria-hidden className="size-4" />
      {label}
      <input
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}
