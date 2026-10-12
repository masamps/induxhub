"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { respondProposal } from "../actions";

/** Aceitar ou recusar pelo link. Funciona sem login para orçamento avulso. */
export function ProposalResponse({ token, fornecedor }: { token: string; fornecedor: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "aceitar" | "recusar">("idle");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string>();

  function respond(aceito: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await respondProposal(token, { aceito, motivo });
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="error">{error}</Alert>}
      {mode === "idle" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" size="lg" onClick={() => setMode("aceitar")}>
            <Check aria-hidden />
            Aceitar orçamento
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={() => setMode("recusar")}>
            <X aria-hidden />
            Recusar
          </Button>
        </div>
      )}
      {mode === "aceitar" && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 p-4">
          <p className="text-sm">
            Confirmar o aceite? <strong>{fornecedor}</strong> é avisado e entra em contato para combinar a execução.
          </p>
          <div className="flex gap-2">
            <Button type="button" disabled={pending} onClick={() => respond(true)}>
              {pending ? "Enviando…" : "Confirmar aceite"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Voltar
            </Button>
          </div>
        </div>
      )}
      {mode === "recusar" && (
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <Field id="motivo" label="Quer dizer o motivo?" optional hint="Ajuda o fornecedor a mandar uma proposta melhor.">
            <Textarea rows={3} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="button" disabled={pending} onClick={() => respond(false)}>
              {pending ? "Enviando…" : "Recusar orçamento"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
