import { NextRequest, NextResponse } from "next/server";
import { createLeads } from "@/lib/service";
import { LeadInput } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Webhook-Endpunkt für n8n / Flowise.
 * n8n scraped die Leads (Google Maps, Instagram, LinkedIn) und POSTet sie hier hin.
 *
 * Optionaler Schutz: setze die ENV-Variable INGEST_TOKEN und schicke sie als
 * Header  "x-ingest-token"  oder Query  ?token=...  mit.
 *
 * Body: ein Lead-Objekt ODER ein Array von Lead-Objekten.
 * Minimal nötig: { "name": "..." }. Sinnvoll zusätzlich: website, email, phone,
 * source ("google_maps" | "instagram" | "linkedin"), industry, city.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.INGEST_TOKEN;
  if (expected) {
    const provided =
      req.headers.get("x-ingest-token") || req.nextUrl.searchParams.get("token");
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  // Unterstützt {leads:[...]}, [...] oder ein einzelnes Objekt.
  let inputs: LeadInput[];
  if (Array.isArray(body)) inputs = body as LeadInput[];
  else if (body && typeof body === "object" && Array.isArray((body as any).leads))
    inputs = (body as any).leads;
  else inputs = [body as LeadInput];

  inputs = inputs.filter((i) => i && typeof i.name === "string" && i.name.trim());
  if (!inputs.length) {
    return NextResponse.json({ error: "Keine gültigen Leads (jeder braucht 'name')" }, { status: 400 });
  }

  const result = await createLeads(inputs);
  return NextResponse.json({ ok: true, ...result });
}
