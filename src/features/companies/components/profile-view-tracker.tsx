"use client";

import { useEffect } from "react";

import { trackEvent } from "@/features/metrics/track";

const STORAGE_PREFIX = "induxhub:view:";

/** Conta uma visualização por perfil por sessão do navegador. */
export function ProfileViewTracker({ companyId }: { companyId: string }) {
  useEffect(() => {
    const key = STORAGE_PREFIX + companyId;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage indisponível (modo privado): conta mesmo assim.
    }
    trackEvent({ companyId, event: "view" });
  }, [companyId]);

  return null;
}
