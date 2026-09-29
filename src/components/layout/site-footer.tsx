import Link from "next/link";

import { Container } from "./container";
import { Logo } from "./logo";

const LINKS = [
  { href: "/buscar", label: "Buscar fornecedores" },
  { href: "/cadastro", label: "Cadastrar empresa" },
  { href: "/orcamentos/novo", label: "Pedir orçamento" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-footer py-10 text-sm text-muted-foreground">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p>Conectando a indústria ao fornecedor certo.</p>
          <p>Sorocaba e interior de São Paulo.</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-block py-1.5 hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container className="mt-8">
        <p>© {new Date().getFullYear()} InduxHub</p>
      </Container>
    </footer>
  );
}
