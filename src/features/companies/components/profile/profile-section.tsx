import * as React from "react";

import { cn } from "@/lib/utils";

type ProfileSectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function ProfileSection({ id, title, children, className }: ProfileSectionProps) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-4", className)}>
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function EmptySectionText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-card border border-dashed border-border p-5 text-sm text-muted-foreground">{children}</p>;
}
