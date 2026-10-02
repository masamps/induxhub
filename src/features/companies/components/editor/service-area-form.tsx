"use client";

import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ToggleChips } from "@/components/ui/toggle-chips";
import type { CatalogOption } from "@/features/catalog/queries";

import { updateServiceArea } from "../../editor-actions";

export function ServiceAreaForm({
  categories,
  cities,
  initialCategoryIds,
  initialCityIds,
  hqCityId,
}: {
  categories: CatalogOption[];
  cities: CatalogOption[];
  initialCategoryIds: number[];
  initialCityIds: number[];
  hqCityId: number;
}) {
  const [categoryIds, setCategoryIds] = useState(initialCategoryIds);
  const [cityIds, setCityIds] = useState(initialCityIds.filter((id) => id !== hqCityId));
  const [status, setStatus] = useState<{ ok: boolean; message: string }>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus(undefined);
        startTransition(async () => {
          const result = await updateServiceArea({ categoryIds, cityIds });
          setStatus(result.ok ? { ok: true, message: "Área de atuação salva." } : { ok: false, message: result.error });
        });
      }}
    >
      {status && <Alert tone={status.ok ? "success" : "error"}>{status.message}</Alert>}
      <div className="flex flex-col gap-2">
        <h2 id="cat-label" className="font-semibold">
          Categorias
        </h2>
        <p className="text-sm text-muted-foreground">
          Até 6. Você aparece na busca e recebe pedidos dessas categorias.
        </p>
        <ToggleChips
          labelledBy="cat-label"
          options={categories}
          value={categoryIds}
          max={6}
          onChange={setCategoryIds}
        />
      </div>
      <div className="flex flex-col gap-2">
        <h2 id="city-label" className="font-semibold">
          Cidades atendidas
        </h2>
        <p className="text-sm text-muted-foreground">Além da sede. Pedidos dessas cidades também chegam para você.</p>
        <ToggleChips
          labelledBy="city-label"
          options={cities}
          value={cityIds}
          disabledIds={[hqCityId]}
          onChange={setCityIds}
        />
      </div>
      <Button type="submit" size="lg" className="sm:self-end" disabled={pending || categoryIds.length === 0}>
        {pending ? "Salvando…" : "Salvar área de atuação"}
      </Button>
    </form>
  );
}
