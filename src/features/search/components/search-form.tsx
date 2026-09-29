import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { CatalogOption } from "@/features/catalog/queries";
import { cn } from "@/lib/utils";

import { SORT_OPTIONS, type SearchFilters } from "../schema";

type SearchFormProps = {
  categories: CatalogOption[];
  cities: CatalogOption[];
  defaults?: Partial<SearchFilters>;
  showSort?: boolean;
  className?: string;
};

/** Formulário GET para /buscar: funciona sem JavaScript e gera URLs compartilháveis. */
export function SearchForm({ categories, cities, defaults = {}, showSort = false, className }: SearchFormProps) {
  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:items-end",
        showSort ? "lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" : "lg:grid-cols-[2fr_1fr_1fr_auto]",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="busca-q">O que você precisa?</Label>
        <Input
          id="busca-q"
          name="q"
          type="search"
          maxLength={80}
          defaultValue={defaults.q}
          placeholder="Ex.: usinagem CNC, molde de injeção"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="busca-categoria">Categoria</Label>
        <NativeSelect id="busca-categoria" name="categoria" defaultValue={defaults.categoria ?? ""}>
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="busca-cidade">Cidade</Label>
        <NativeSelect id="busca-cidade" name="cidade" defaultValue={defaults.cidade ?? ""}>
          <option value="">Toda a região</option>
          {cities.map((city) => (
            <option key={city.slug} value={city.slug}>
              {city.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      {showSort && (
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="busca-ordem">Ordenar por</Label>
          <NativeSelect id="busca-ordem" name="ordem" defaultValue={defaults.ordem ?? "relevancia"}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1">
        <Search aria-hidden />
        Buscar
      </Button>
    </form>
  );
}
