export type LeadSource = "google_maps" | "instagram" | "linkedin" | "manual";

export type LeadStatus = "new" | "contacted" | "replied" | "won" | "lost";

export interface Reachability {
  email: boolean;
  phone: boolean;
  contactForm: boolean;
  whatsapp: boolean;
  liveChat: boolean;
  /** Anzahl erreichbarer Kanäle (0–5). Niedrig = schlechte Erreichbarkeit = guter Lead für uns. */
  channels: number;
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  source: LeadSource;
  industry?: string;
  city?: string;
  country?: string;
  website?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  notes?: string;
  status: LeadStatus;

  // --- Anreicherung (automatische Qualifizierung) ---
  hasChatbot: boolean | null;
  chatbotVendor: string | null;
  reachability: Reachability | null;
  enrichedAt: string | null;
  enrichError?: string | null;

  // --- Scoring ---
  score: number;
  scoreReasons: string[];

  createdAt: string;
  updatedAt: string;
}

export type LeadInput = Partial<Lead> & Pick<Lead, "name">;

export const SOURCE_LABELS: Record<LeadSource, string> = {
  google_maps: "Google Maps",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  manual: "Manuell",
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Neu",
  contacted: "Kontaktiert",
  replied: "Geantwortet",
  won: "Gewonnen",
  lost: "Verloren",
};

export type Tier = "hot" | "warm" | "cold";

export function tierOf(score: number): Tier {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
