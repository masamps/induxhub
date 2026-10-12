"use client";

import { Ban, Check, Copy, FileDown, GitBranch, Link2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { cancelProposal, copyProposal } from "../actions";
import type { ProposalStatus } from "../format";

export function ProposalActions({
  id,
  status,
  publicUrl,
  whatsappUrl,
  podeNovaVersao,
}: {
  id: string;
  status: ProposalStatus;
  publicUrl: string;
  whatsappUrl: string;
  podeNovaVersao: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const shareable = status === "enviado";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não deu para copiar. Selecione o link e copie manualmente.");
    }
  }

  function copy(novaVersao: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await copyProposal(id, novaVersao);
      if (!result.ok) return setError(result.error);
      router.push(`/painel/propostas/${result.data.id}`);
    });
  }

  function cancel() {
    setError(undefined);
    startTransition(async () => {
      const result = await cancelProposal(id);
      setConfirmCancel(false);
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="error">{error}</Alert>}
      {shareable && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="whatsapp">
            <a href={whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden />
              Enviar pelo WhatsApp
            </a>
          </Button>
          <Button type="button" variant="outline" onClick={copyLink}>
            {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
            {copied ? "Link copiado" : "Copiar link"}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`${publicUrl}/pdf`} target="_blank" rel="noreferrer">
            <FileDown aria-hidden />
            Baixar PDF
          </a>
        </Button>
        {podeNovaVersao && (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => copy(true)}>
            <GitBranch aria-hidden />
            Nova versão
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => copy(false)}>
          <Copy aria-hidden />
          Duplicar
        </Button>
        {status === "enviado" && !confirmCancel && (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmCancel(true)}>
            <Ban aria-hidden />
            Cancelar orçamento
          </Button>
        )}
      </div>
      {confirmCancel && (
        <div className="flex flex-col gap-2 rounded-xl border border-danger/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>O cliente não poderá mais aceitar este orçamento.</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
              Voltar
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={cancel}>
              Cancelar orçamento
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DiscardDraftButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();

  if (!confirm) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(true)}>
        Descartar rascunho
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {error && <span className="text-danger">{error}</span>}
      <span>Descartar este rascunho?</span>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        Não
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelProposal(id);
            if (!result.ok) return setError(result.error);
            router.push("/painel/propostas");
          })
        }
      >
        Descartar
      </Button>
    </div>
  );
}
