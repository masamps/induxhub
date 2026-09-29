import Link from "next/link";

import { Button } from "@/components/ui/button";

import { Container } from "./container";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/buscar">Buscar fornecedores</Link>
          </Button>
          <Button asChild variant="ghost" className="px-3 sm:px-5">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild className="px-4 sm:px-5">
            <Link href="/cadastro">
              Cadastrar<span className="hidden sm:inline"> empresa</span>
            </Link>
          </Button>
        </nav>
      </Container>
    </header>
  );
}
