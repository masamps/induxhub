import { Award, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatRating, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reputationSeal, type Reputation } from "@/features/reviews/reputation";

import { RatingStars } from "./rating-stars";

/** Nota, número de avaliações e selo de reputação. */
export function ReputationSummary({ reputation, className }: { reputation: Reputation; className?: string }) {
  const seal = reputationSeal(reputation);

  if (seal === "novo" || reputation.notaMedia === null) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Badge variant="outline">
          <Sparkles aria-hidden />
          Novo no InduxHub
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <RatingStars value={reputation.notaMedia} />
      <span className="font-semibold">{formatRating(reputation.notaMedia)}</span>
      <span className="text-muted-foreground">
        ({pluralize(reputation.totalAvaliacoes, "avaliação", "avaliações")})
      </span>
      {seal === "destaque" && (
        <Badge variant="primary">
          <Award aria-hidden />
          Bem avaliado
        </Badge>
      )}
    </div>
  );
}
