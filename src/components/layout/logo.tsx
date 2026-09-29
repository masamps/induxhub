import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-lg text-lg font-bold tracking-tight">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground"
      >
        IH
      </span>
      <span>
        Indux<span className="text-primary">Hub</span>
      </span>
    </Link>
  );
}
