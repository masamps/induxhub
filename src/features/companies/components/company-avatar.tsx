import Image from "next/image";

import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type CompanyAvatarProps = {
  name: string;
  logoUrl: string | null;
  size?: "md" | "lg";
  className?: string;
};

const SIZES = { md: "size-14 text-lg", lg: "size-24 text-3xl" };
const PIXELS = { md: 56, lg: 96 };

export function CompanyAvatar({ name, logoUrl, size = "md", className }: CompanyAvatarProps) {
  const base = cn(
    "shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-raised",
    SIZES[size],
    className,
  );

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`Logo de ${name}`}
        width={PIXELS[size]}
        height={PIXELS[size]}
        className={cn(base, "object-cover")}
      />
    );
  }

  return (
    <div aria-hidden className={cn(base, "grid place-items-center font-bold text-primary")}>
      {initials(name)}
    </div>
  );
}
