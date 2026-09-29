import { Construction } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { Container } from "./container";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <Construction aria-hidden className="size-10 text-primary" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{description}</p>
      <Button asChild variant="outline">
        <Link href="/buscar">Buscar fornecedores</Link>
      </Button>
    </Container>
  );
}
