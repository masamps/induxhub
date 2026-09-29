import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted-foreground disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
