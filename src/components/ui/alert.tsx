import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const ICONS = { error: AlertCircle, success: CheckCircle2, info: Info };
const STYLES = {
  error: "border-danger/40 bg-danger/10 text-danger",
  success: "border-whatsapp/40 bg-whatsapp/10 text-whatsapp",
  info: "border-primary/40 bg-primary/10 text-foreground",
};

export function Alert({
  tone = "info",
  className,
  children,
}: {
  tone?: keyof typeof ICONS;
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-xl border px-4 py-3 text-sm", STYLES[tone], className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
