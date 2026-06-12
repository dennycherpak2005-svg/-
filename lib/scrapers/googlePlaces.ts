import { LeadInput } from "../types";

/**
 * Google-Maps-Scraper über die offizielle Google Places API (Text Search, New).
 * Du suchst z.B. "Zahnarzt München" und bekommst lokale Unternehmen mit
 * Name, Website, Telefon und Adresse zurück – die ideale Basis für Kaltakquise.
 *
 * Braucht einen API-Key (ENV: GOOGLE_MAPS_API_KEY). Ohne Key liefert die
 * Funktion realistische Demo-Daten, damit das Dashboard sofort nutzbar ist.
 */

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface PlacesResponse {
  places?: {
    displayName?: { text?: string };
    websiteUri?: string;
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    formattedAddress?: string;
    primaryTypeDisplayName?: { text?: string };
  }[];
}

export interface ScrapeParams {
  industry: string;
  city: string;
  maxResults?: number;
}

export interface ScrapeOutcome {
  leads: LeadInput[];
  demo: boolean;
}

function cityFromAddress(addr: string | undefined, fallback: string): string {
  if (!addr) return fallback;
  // "Straße 1, 80331 München, Deutschland" → "München"
  const parts = addr.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const withZip = parts[parts.length - 2];
    return withZip.replace(/^\d{4,5}\s*/, "") || fallback;
  }
  return fallback;
}

export async function scrapeGoogleMaps(params: ScrapeParams): Promise<ScrapeOutcome> {
  const industry = params.industry.trim();
  const city = params.city.trim();
  const max = Math.min(Math.max(params.maxResults ?? 20, 1), 20);
  const query = `${industry} ${city}`.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { leads: demoLeads(industry, city, max), demo: true };
  }

  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.displayName,places.websiteUri,places.internationalPhoneNumber,places.nationalPhoneNumber,places.formattedAddress,places.primaryTypeDisplayName",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "de", maxResultCount: max }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google Places API: HTTP ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as PlacesResponse;
  const leads: LeadInput[] = (data.places ?? []).map((p) => ({
    name: p.displayName?.text || "Unbekanntes Unternehmen",
    source: "google_maps",
    industry: p.primaryTypeDisplayName?.text || industry,
    city: cityFromAddress(p.formattedAddress, city),
    website: p.websiteUri,
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber,
    notes: p.formattedAddress,
  }));

  return { leads, demo: false };
}

/** Plausible Demo-Leads, solange kein API-Key gesetzt ist. */
function demoLeads(industry: string, city: string, count: number): LeadInput[] {
  const ind = industry || "Unternehmen";
  const c = city || "Berlin";
  const suffixes = ["GmbH", "& Partner", "Zentrum", "Studio", "am Markt", "City", "Express", "Pro", "Plus", "24"];
  // Ein paar Demo-Domains, die echt erreichbar sind, damit die Anreicherung greift.
  const demoDomains = ["example.com", "example.org", "example.net", "iana.org", undefined, undefined];
  const out: LeadInput[] = [];
  const n = Math.min(count, 12);
  for (let i = 0; i < n; i++) {
    const website = demoDomains[i % demoDomains.length];
    out.push({
      name: `${ind} ${suffixes[i % suffixes.length]} ${c}`,
      source: "google_maps",
      industry: ind,
      city: c,
      country: "DE",
      website,
      phone: `+49 30 ${100000 + i * 137}`,
      notes: "Demo-Lead (kein API-Key gesetzt) – zum Ausprobieren.",
    });
  }
  return out;
}
