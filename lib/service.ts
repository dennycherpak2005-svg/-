import { randomUUID } from "crypto";
import { mutate, readLeads } from "./db";
import { Lead, LeadInput, LeadSource, LeadStatus } from "./types";
import { scoreLead } from "./scoring";
import { enrichWebsite } from "./enrich";

const VALID_SOURCES: LeadSource[] = ["google_maps", "instagram", "linkedin", "manual"];
const VALID_STATUS: LeadStatus[] = ["new", "contacted", "replied", "won", "lost"];

function clean(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** Baut aus rohem Input (z.B. n8n-Webhook) einen vollständigen Lead. */
export function buildLead(input: LeadInput): Lead {
  const now = new Date().toISOString();
  const source = VALID_SOURCES.includes(input.source as LeadSource)
    ? (input.source as LeadSource)
    : "manual";
  const status = VALID_STATUS.includes(input.status as LeadStatus)
    ? (input.status as LeadStatus)
    : "new";

  const base: Lead = {
    id: input.id || randomUUID(),
    name: clean(input.name) || "Unbenannter Lead",
    company: clean(input.company),
    source,
    industry: clean(input.industry),
    city: clean(input.city),
    country: clean(input.country),
    website: clean(input.website),
    email: clean(input.email),
    phone: clean(input.phone),
    instagram: clean(input.instagram),
    linkedin: clean(input.linkedin),
    notes: clean(input.notes),
    status,
    hasChatbot: input.hasChatbot ?? null,
    chatbotVendor: input.chatbotVendor ?? null,
    reachability: input.reachability ?? null,
    enrichedAt: input.enrichedAt ?? null,
    enrichError: input.enrichError ?? null,
    score: 0,
    scoreReasons: [],
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  const { score, reasons } = scoreLead(base);
  base.score = score;
  base.scoreReasons = reasons;
  return base;
}

/** Dedup-Schlüssel: website > email > instagram > linkedin > name+city. */
function dedupeKey(l: Lead): string {
  return (
    l.website?.toLowerCase().replace(/\/$/, "") ||
    l.email?.toLowerCase() ||
    l.instagram?.toLowerCase() ||
    l.linkedin?.toLowerCase() ||
    `${l.name}|${l.city ?? ""}`.toLowerCase()
  );
}

export async function listLeads(): Promise<Lead[]> {
  const leads = await readLeads();
  return leads.sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
}

export async function createLeads(inputs: LeadInput[]): Promise<{ added: number; skipped: number; leads: Lead[] }> {
  const built = inputs.map(buildLead);
  return mutate((leads) => {
    const existing = new Set(leads.map(dedupeKey));
    const toAdd: Lead[] = [];
    for (const l of built) {
      const key = dedupeKey(l);
      if (existing.has(key)) continue;
      existing.add(key);
      toAdd.push(l);
    }
    return {
      leads: [...leads, ...toAdd],
      result: { added: toAdd.length, skipped: built.length - toAdd.length, leads: toAdd },
    };
  });
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  return mutate((leads) => {
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return { leads, result: null };
    const merged: Lead = { ...leads[idx], ...patch, id, updatedAt: new Date().toISOString() };
    const { score, reasons } = scoreLead(merged);
    merged.score = score;
    merged.scoreReasons = reasons;
    leads[idx] = merged;
    return { leads, result: merged };
  });
}

export async function deleteLead(id: string): Promise<boolean> {
  return mutate((leads) => {
    const next = leads.filter((l) => l.id !== id);
    return { leads: next, result: next.length !== leads.length };
  });
}

/** Reichert einen Lead per Website-Analyse an und aktualisiert Score. */
export async function enrichLead(id: string): Promise<Lead | null> {
  const leads = await readLeads();
  const lead = leads.find((l) => l.id === id);
  if (!lead) return null;
  if (!lead.website) {
    return updateLead(id, { enrichError: "Keine Website hinterlegt", enrichedAt: new Date().toISOString() });
  }
  try {
    const r = await enrichWebsite(lead.website);
    return updateLead(id, {
      hasChatbot: r.hasChatbot,
      chatbotVendor: r.chatbotVendor,
      reachability: r.reachability,
      enrichedAt: new Date().toISOString(),
      enrichError: null,
    });
  } catch (e) {
    return updateLead(id, {
      enrichError: e instanceof Error ? e.message : "Anreicherung fehlgeschlagen",
      enrichedAt: new Date().toISOString(),
    });
  }
}
