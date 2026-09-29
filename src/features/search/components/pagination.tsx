import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { buildSearchHref, type SearchFilters } from "../schema";

type PaginationProps = { filters: SearchFilters; page: number; pageCount: number };

export function Pagination({ filters, page, pageCount }: PaginationProps) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => buildSearchHref({ ...filters, pagina: target });

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link href={hrefFor(page - 1)} rel="prev">
            <ChevronLeft aria-hidden />
            Anterior
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground">
        Página {page} de {pageCount}
      </p>
      {page < pageCount ? (
        <Button asChild variant="outline">
          <Link href={hrefFor(page + 1)} rel="next">
            Próxima
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
