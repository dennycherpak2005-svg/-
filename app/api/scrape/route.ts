import { NextRequest, NextResponse } from "next/server";
import { scrapeGoogleMaps } from "@/lib/scrapers/googlePlaces";
import { createLeads } from "@/lib/service";

export const dynamic = "force-dynamic";

/**
 * Startet eine Lead-Suche über Google Maps (Places API) und legt die Treffer an.
 * Body: { "industry": "Zahnarzt", "city": "München", "maxResults": 20 }
 */
export async function POST(req: NextRequest) {
  let body: { industry?: string; city?: string; maxResults?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const industry = (body.industry ?? "").trim();
  const city = (body.city ?? "").trim();
  if (!industry && !city) {
    return NextResponse.json({ error: "Bitte Branche und/oder Stadt angeben" }, { status: 400 });
  }

  try {
    const { leads, demo } = await scrapeGoogleMaps({ industry, city, maxResults: body.maxResults });
    const result = await createLeads(leads);
    return NextResponse.json({ ok: true, demo, found: leads.length, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Suche fehlgeschlagen" },
      { status: 502 }
    );
  }
}
