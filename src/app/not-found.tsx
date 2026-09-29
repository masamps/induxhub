import { SearchX } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <SearchX aria-hidden className="size-10 text-primary" />
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-md text-muted-foreground">O endereço pode ter mudado ou a empresa saiu do InduxHub.</p>
      <Button asChild>
        <Link href="/buscar">Buscar fornecedores</Link>
      </Button>
    </Container>
  );
}
