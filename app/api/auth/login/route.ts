import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, passwordConfigured, tokenFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Prüft das Passwort und setzt bei Erfolg das Auth-Cookie. */
export async function POST(req: NextRequest) {
  // Kein Passwort konfiguriert → App ist ohnehin offen.
  if (!passwordConfigured()) {
    return NextResponse.json({ ok: true, open: true });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const expected = process.env.APP_PASSWORD!;
  if (!body.password || body.password !== expected) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const token = await tokenFor(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 Tage angemeldet bleiben
  });
  return res;
}
