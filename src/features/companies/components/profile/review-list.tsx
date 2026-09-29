import type { CompanyReview } from "@/features/companies/queries";
import { formatMonthYear } from "@/lib/format";

import { RatingStars } from "../rating-stars";

export function ReviewList({ reviews }: { reviews: CompanyReview[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li key={review.id} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <RatingStars value={review.nota} />
            <time dateTime={review.createdAt} className="text-sm text-muted-foreground">
              {formatMonthYear(review.createdAt)}
            </time>
          </div>
          {review.comentario && <p>{review.comentario}</p>}
          <p className="text-sm text-muted-foreground">
            {review.autor}
            {review.projetoDescricao && ` · ${review.projetoDescricao}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
