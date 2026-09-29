import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function EmptyResults({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-border px-6 py-16 text-center">
      <SearchX aria-hidden className="size-10 text-primary" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Nenhum fornecedor encontrado</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {hasFilters
            ? "Tente outra cidade, remova a categoria ou use menos palavras na busca."
            : "Ainda não há fornecedores cadastrados na região."}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {hasFilters && (
          <Button asChild variant="outline">
            <Link href="/buscar">Limpar filtros</Link>
          </Button>
        )}
        <Button asChild>
          <Link href="/orcamentos/novo">Pedir orçamento a vários fornecedores</Link>
        </Button>
      </div>
    </div>
  );
}
