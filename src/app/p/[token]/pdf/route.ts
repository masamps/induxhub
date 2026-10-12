import { z } from "zod";

import { proposalCode } from "@/features/proposals/format";
import { renderProposalPdf } from "@/features/proposals/pdf";
import { getPublicProposal } from "@/features/proposals/queries";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!z.uuid().safeParse(token).success) return new Response("Não encontrado", { status: 404 });

  const p = await getPublicProposal(token);
  if (!p) return new Response("Não encontrado", { status: 404 });

  const pdf = await renderProposalPdf(p);
  const fileName = `${proposalCode(p).replace(/\s+/g, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
