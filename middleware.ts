import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, tokenFor } from "@/lib/auth";

/**
 * Schützt die gesamte App mit dem Passwort (ENV: APP_PASSWORD).
 * Ist kein Passwort gesetzt (z.B. lokale Entwicklung), bleibt alles offen.
 * Der Ingest-Webhook (/api/ingest) ist ausgenommen – er hat seinen eigenen Token.
 */
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Öffentlich erreichbar (sonst käme man nie zum Login).
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/ingest")
  ) {
    return NextResponse.next();
  }

  const expected = await tokenFor(password);
  const provided = req.cookies.get(AUTH_COOKIE)?.value;
  if (provided === expected) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Alles außer statischen Next-Assets durch die Middleware schicken.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
