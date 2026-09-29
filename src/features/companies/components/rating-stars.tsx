import { Star } from "lucide-react";

import { formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5];

export function RatingStars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Nota ${formatRating(value)} de 5`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {STARS.map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn(
            "size-4",
            value >= star - 0.25 ? "fill-premium text-premium" : "fill-transparent text-muted-foreground/50",
          )}
        />
      ))}
    </span>
  );
}
