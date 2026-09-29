import { Crown } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function PremiumBadge() {
  return (
    <Badge variant="premium">
      <Crown aria-hidden />
      Premium
    </Badge>
  );
}
