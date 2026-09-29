import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { env } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "InduxHub · Conectando a indústria ao fornecedor certo",
    template: "%s · InduxHub",
  },
  description:
    "Encontre fornecedores industriais em Sorocaba e região: usinagem, ferramentaria, injeção plástica, solda, automação e mais.",
  openGraph: { locale: "pt_BR", siteName: "InduxHub", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={GeistSans.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
