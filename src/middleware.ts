import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED = ["/painel", "/orcamentos"];
const GUEST_ONLY = ["/login"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!user && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && GUEST_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

// Só rotas que dependem de sessão. Páginas públicas seguem estáticas e em cache.
export const config = {
  matcher: ["/painel/:path*", "/orcamentos/:path*", "/p/:path*", "/login/:path*", "/cadastro/:path*", "/auth/:path*"],
};
