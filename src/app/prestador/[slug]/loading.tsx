import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Carregando perfil">
      <div className="bg-hero">
        <Container className="flex items-center gap-5 py-12">
          <Skeleton className="size-24 rounded-2xl" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </Container>
      </div>
      <Container className="grid gap-10 py-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-card" />
            ))}
          </div>
        </div>
        <Skeleton className="h-64 rounded-card" />
      </Container>
    </div>
  );
}
