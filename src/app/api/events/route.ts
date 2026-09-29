import { NextResponse } from "next/server";

import { trackEventSchema } from "@/features/metrics/schema";
import { createPublicClient } from "@/lib/supabase/public";

export async function POST(request: Request) {
  const parsed = trackEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  const { error } = await createPublicClient().rpc("track_event", {
    p_company_id: parsed.data.companyId,
    p_event: parsed.data.event,
  });
  if (error) {
    console.error("track_event falhou", error);
    return NextResponse.json({ error: "Falha ao registrar evento" }, { status: 502 });
  }

  return new NextResponse(null, { status: 204 });
}
