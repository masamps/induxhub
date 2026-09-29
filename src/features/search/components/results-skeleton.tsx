import { Skeleton } from "@/components/ui/skeleton";

export function ResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando fornecedores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
          <div className="flex gap-4">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}
