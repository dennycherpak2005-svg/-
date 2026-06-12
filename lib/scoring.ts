import { Lead } from "./types";

/**
 * Branchen, die für Chatbot-/KI-Automatisierung besonders interessant sind
 * (viel Kundenkommunikation, wiederkehrende Anfragen). Lowercase-Matching.
 */
export const TARGET_INDUSTRIES = [
  "restaurant",
  "gastro",
  "café",
  "cafe",
  "hotel",
  "immobilien",
  "makler",
  "real estate",
  "zahnarzt",
  "arzt",
  "praxis",
  "physio",
  "kosmetik",
  "friseur",
  "beauty",
  "fitness",
  "studio",
  "coach",
  "coaching",
  "agentur",
  "agency",
  "handwerk",
  "sanitär",
  "elektriker",
  "kanzlei",
  "steuerberater",
  "autohaus",
  "e-commerce",
  "shop",
  "onlineshop",
];

function matchesTargetIndustry(lead: Lead): boolean {
  const hay = `${lead.industry ?? ""} ${lead.company ?? ""} ${lead.name}`.toLowerCase();
  return TARGET_INDUSTRIES.some((kw) => hay.includes(kw));
}

/**
 * Lead-Score 0–100. Höher = besserer Lead für Chatbot-Automatisierung.
 * Kernidee: Firmen OHNE Chatbot + mit SCHLECHTER Erreichbarkeit = heißeste Leads.
 */
export function scoreLead(lead: Lead): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // --- Chatbot-Status (wichtigstes Signal) ---
  if (lead.hasChatbot === false) {
    score += 45;
    reasons.push("Kein Chatbot/Live-Chat auf der Website (+45)");
  } else if (lead.hasChatbot === true) {
    score -= 30;
    reasons.push(`Hat bereits Chatbot${lead.chatbotVendor ? ` (${lead.chatbotVendor})` : ""} (−30)`);
  } else {
    reasons.push("Chatbot-Status unbekannt – Website noch nicht geprüft");
  }

  // --- Erreichbarkeit (schlechter = besser für uns) ---
  if (lead.reachability) {
    const ch = lead.reachability.channels;
    if (ch <= 1) {
      score += 25;
      reasons.push("Sehr schlechte Erreichbarkeit (≤1 Kanal) (+25)");
    } else if (ch === 2) {
      score += 12;
      reasons.push("Mäßige Erreichbarkeit (2 Kanäle) (+12)");
    } else {
      reasons.push("Gute Erreichbarkeit (3+ Kanäle) (+0)");
    }
    if (!lead.reachability.whatsapp && !lead.reachability.liveChat) {
      score += 8;
      reasons.push("Kein WhatsApp & kein Live-Chat (+8)");
    }
  }

  // --- Erreichbarkeit FÜR UNS (können wir sie kontaktieren?) ---
  if (lead.email) {
    score += 7;
    reasons.push("E-Mail vorhanden (+7)");
  }
  if (lead.phone) {
    score += 5;
    reasons.push("Telefon vorhanden (+5)");
  }

  // --- Online-Präsenz ---
  if (lead.website) {
    score += 8;
    reasons.push("Hat Website (+8)");
  }

  // --- Branche ---
  if (matchesTargetIndustry(lead)) {
    score += 10;
    reasons.push("Passende Zielbranche (+10)");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons };
}
