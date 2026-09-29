import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultsSkeleton } from "@/features/search/components/results-skeleton";

export default function Loading() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-40 w-full rounded-card lg:h-24" />
      <ResultsSkeleton />
    </Container>
  );
}
