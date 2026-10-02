"use client";

import { ChevronDown, FileText, LayoutDashboard, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Account = { email: string; nome?: string } | null;

function toAccount(user: { email?: string; user_metadata?: { nome?: string } } | null | undefined): Account {
  return user ? { email: user.email ?? "", nome: user.user_metadata?.nome } : null;
}

/**
 * Parte do header que depende de sessão. Roda no navegador para que as
 * páginas públicas continuem estáticas e em cache.
 */
export function AccountNav() {
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  // Sessão pode mudar no servidor (login e cadastro via server action): relê a cada navegação.
  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => setAccount(toAccount(data.session?.user)));
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const { data } = createBrowserSupabase().auth.onAuthStateChange((_event, session) =>
      setAccount(toAccount(session?.user)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createBrowserSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (account === undefined) {
    return <div aria-hidden className="h-11 w-40" />;
  }

  if (!account) {
    return (
      <>
        <Button asChild variant="ghost" className="px-3 sm:px-5">
          <Link href="/login">Entrar</Link>
        </Button>
        <Button asChild className="px-4 sm:px-5">
          <Link href="/cadastro">
            Cadastrar<span className="hidden sm:inline"> empresa</span>
          </Link>
        </Button>
      </>
    );
  }

  const label = account.nome?.split(" ")[0] || account.email;

  return (
    <details ref={menuRef} className="group relative">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-surface-raised [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
          <User aria-hidden className="size-4" />
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{label}</span>
        <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        <span className="sr-only">Menu da conta</span>
      </summary>
      <div className="absolute right-0 mt-2 flex w-56 flex-col rounded-xl border border-border bg-surface p-1.5 shadow-card">
        <p className="truncate px-3 py-2 text-xs text-muted-foreground">{account.email}</p>
        <MenuLink href="/painel" icon={LayoutDashboard}>
          Painel
        </MenuLink>
        <MenuLink href="/orcamentos" icon={FileText}>
          Meus pedidos
        </MenuLink>
        <button
          type="button"
          onClick={signOut}
          className="flex h-11 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-surface-raised"
        >
          <LogOut aria-hidden className="size-4" />
          Sair
        </button>
      </div>
    </details>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface-raised">
      <Icon aria-hidden className="size-4" />
      {children}
    </Link>
  );
}
