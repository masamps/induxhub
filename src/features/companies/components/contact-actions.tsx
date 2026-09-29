"use client";

import { FileText, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/features/metrics/track";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type ContactActionsProps = {
  companyId: string;
  companySlug: string;
  whatsapp: string | null;
  /** Rótulos curtos para a barra fixa do mobile. */
  compact?: boolean;
  className?: string;
};

export function ContactActions({ companyId, companySlug, whatsapp, compact = false, className }: ContactActionsProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button asChild>
        <Link
          href={`/orcamentos/novo?prestador=${companySlug}`}
          onClick={() => trackEvent({ companyId, event: "quote_click" })}
        >
          <FileText aria-hidden />
          {compact ? "Orçamento" : "Solicitar orçamento"}
        </Link>
      </Button>
      {whatsapp && (
        <Button asChild variant="whatsapp">
          <a
            href={buildWhatsappLink(whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent({ companyId, event: "whatsapp" })}
          >
            <MessageCircle aria-hidden />
            {compact ? "WhatsApp" : "Conversar agora"}
            <span className="sr-only">(abre o WhatsApp)</span>
          </a>
        </Button>
      )}
    </div>
  );
}
