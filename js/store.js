/* ============================================================
   store.js – Datenschicht des Akquise-Cockpits (localStorage)
   ============================================================ */

const STORE_KEY = "leadcrm.v2";

/** Lead-Temperatur – die Hauptachse für Akquise. */
const TEMPS = [
  { id: "kalt",  label: "Kalt",  color: "#0891b2", emoji: "🧊" },
  { id: "warm",  label: "Warm",  color: "#d97706", emoji: "🌤️" },
  { id: "heiss", label: "Heiß",  color: "#dc2626", emoji: "🔥" },
];

/** Outreach-Status (Akquise-Trichter). */
const STATUSES = [
  { id: "offen",       label: "Offen",         color: "#64748b" },
  { id: "kontaktiert", label: "Kontaktiert",   color: "#4f46e5" },
  { id: "geantwortet", label: "Geantwortet",   color: "#0891b2" },
  { id: "termin",      label: "Termin",        color: "#7c3aed" },
  { id: "kunde",       label: "Kunde",         color: "#16a34a" },
  { id: "abgelehnt",   label: "Kein Interesse",color: "#dc2626" },
];

const tempById   = (id) => TEMPS.find((t) => t.id === id) || TEMPS[0];
const statusById = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

/* ---------- Persistenz ---------- */
function readAll() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { leads: [], templates: [] };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.leads)) data.leads = [];
    if (!Array.isArray(data.templates)) data.templates = [];
    return data;
  } catch (e) {
    console.error("Lesefehler:", e);
    return { leads: [], templates: [] };
  }
}
function writeAll(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Speichern fehlgeschlagen:", e);
    // Speicher voll o.ä. – Oberfläche informieren, damit nichts unbemerkt verloren geht.
    try { window.dispatchEvent(new CustomEvent("leadcrm:error", { detail: "Speicher voll – bitte per 💾 Backup sichern und alte/abgelehnte Leads löschen." })); } catch (_) {}
    return false;
  }
  try { window.dispatchEvent(new Event("leadcrm:changed")); } catch (_) {}
  return true;
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
/** Dedupe-Schlüssel eines Leads: E-Mail, Telefon und Name+Ort. */
function leadKeys(l) {
  const keys = [];
  const email = (l.email || "").toLowerCase().trim();
  const phone = (l.phone || "").replace(/\D/g, "");
  const name = (l.name || l.company || "").toLowerCase().replace(/\s+/g, " ").trim();
  const loc = (l.location || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (email) keys.push("e:" + email);
  if (phone.length >= 6) keys.push("p:" + phone);
  if (name && loc) keys.push("n:" + name + "|" + loc); // nur Name+Ort zusammen (sicher)
  return keys;
}

/* ---------- API ---------- */
const Store = {
  TEMPS, STATUSES, tempById, statusById,

  getLeads() {
    return readAll().leads.sort((a, b) => b.createdAt - a.createdAt);
  },
  getLead(id) { return readAll().leads.find((l) => l.id === id) || null; },

  addLead(input) {
    const data = readAll();
    const lead = normalizeLead(input);
    data.leads.push(lead);
    writeAll(data);
    return lead;
  },

  /** Mehrere Leads importieren – dedupliziert über E-Mail, Telefon UND Name+Ort
   *  (wichtig für gescrapte Leads ohne Kontaktdaten – sonst Dubletten-Flut). */
  importLeads(list) {
    const data = readAll();
    const seen = new Set(data.leads.flatMap(leadKeys));
    let skipped = 0;
    const addedLeads = [];
    list.forEach((input) => {
      const keys = leadKeys(input);
      if (keys.some((k) => seen.has(k))) { skipped++; return; }
      const lead = normalizeLead(input);
      keys.forEach((k) => seen.add(k));
      data.leads.push(lead);
      addedLeads.push(lead);
    });
    writeAll(data);
    return { added: addedLeads.length, skipped, addedLeads };
  },

  /** Bestehende Dubletten entfernen – behält je Dublette die Version mit dem
   *  meisten Verlauf (Aktivitäten/Kontakt). Gibt die Anzahl entfernter zurück. */
  dedupe() {
    const data = readAll();
    const score = (l) => (l.activities ? l.activities.length : 0) * 1000 + (l.lastContact ? 1 : 0);
    const ranked = [...data.leads].sort((a, b) => score(b) - score(a));
    const seen = new Set();
    const keep = [];
    ranked.forEach((l) => {
      const keys = leadKeys(l);
      if (keys.length && keys.some((k) => seen.has(k))) return; // Dublette -> verwerfen
      keys.forEach((k) => seen.add(k));
      keep.push(l);
    });
    const removed = data.leads.length - keep.length;
    if (removed > 0) { data.leads = keep; writeAll(data); }
    return removed;
  },

  updateLead(id, patch) {
    const data = readAll();
    const lead = data.leads.find((l) => l.id === id);
    if (!lead) return null;
    Object.assign(lead, patch, { updatedAt: Date.now() });
    writeAll(data);
    return lead;
  },
  setTemperature(id, t) { return this.updateLead(id, { temperature: t }); },
  setStatus(id, s) { return this.updateLead(id, { status: s }); },
  setFollowUp(id, ts) { return this.updateLead(id, { nextFollowUp: ts }); },

  /** Aktivität protokollieren (Mail, Anruf, Notiz, Status). */
  logActivity(id, act) {
    const data = readAll();
    const lead = data.leads.find((l) => l.id === id);
    if (!lead) return null;
    lead.activities = lead.activities || [];
    lead.activities.push({ id: uid(), type: act.type, text: act.text || "", outcome: act.outcome || "", at: Date.now() });
    if (act.type === "mail" || act.type === "call") lead.lastContact = Date.now();
    if (act.status) lead.status = act.status;
    if (act.temperature) lead.temperature = act.temperature;
    if (act.nextFollowUp !== undefined) lead.nextFollowUp = act.nextFollowUp;
    lead.updatedAt = Date.now();
    writeAll(data);
    return lead;
  },

  deleteLead(id) {
    const data = readAll();
    data.leads = data.leads.filter((l) => l.id !== id);
    writeAll(data);
  },

  /* ---------- Mail-Vorlagen ---------- */
  getTemplates() { return readAll().templates; },
  saveTemplate(tpl) {
    const data = readAll();
    if (tpl.id) {
      const t = data.templates.find((x) => x.id === tpl.id);
      if (t) Object.assign(t, tpl);
    } else {
      tpl.id = uid();
      data.templates.push(tpl);
    }
    writeAll(data);
    return tpl;
  },
  deleteTemplate(id) {
    const data = readAll();
    data.templates = data.templates.filter((t) => t.id !== id);
    writeAll(data);
  },

  /* ---------- Erststart: Demo-Daten ---------- */
  seedIfEmpty() {
    const data = readAll();
    if (data.leads.length || data.templates.length) return;
    const now = Date.now(), day = 86400000;
    const demoTemplates = [
      {
        name: "Kalt – kurze Vorstellung",
        subject: "Kurze Frage zu {{firma}}",
        body: "Hallo {{vorname}},\n\nich bin auf {{firma}} gestoßen und glaube, wir können euch helfen, [Nutzen in einem Satz].\n\nHättest du diese Woche 15 Minuten für ein kurzes Gespräch?\n\nViele Grüße\n[Dein Name]",
      },
      {
        name: "Follow-up",
        subject: "Nachfrage: {{firma}}",
        body: "Hallo {{vorname}},\n\nich wollte kurz nachhaken, ob meine letzte Nachricht bei dir angekommen ist.\n\nPasst ein kurzer Call diese oder nächste Woche?\n\nBeste Grüße\n[Dein Name]",
      },
    ];
    demoTemplates.forEach((t) => this.saveTemplate(t));

    const demo = [
      { name: "Lena Hoffmann", email: "lena@brightlabs.de", phone: "+49 151 2345678", company: "BrightLabs GmbH", position: "Marketing", source: "Google Maps", temperature: "heiss", status: "termin", nextFollowUp: now + day, createdAt: now - day * 1 },
      { name: "Tomáš Novák", email: "t.novak@nordwind.io", phone: "+420 777 112233", company: "Nordwind s.r.o.", position: "CEO", source: "LinkedIn", temperature: "warm", status: "kontaktiert", nextFollowUp: now - day * 0.5, createdAt: now - day * 2 },
      { name: "Sarah Klein", email: "sarah@klein-design.de", phone: "+49 170 9988776", company: "Klein Design", position: "Inhaberin", source: "Branchenbuch", temperature: "warm", status: "geantwortet", createdAt: now - day * 3 },
      { name: "Mehmet Yıldız", email: "m.yildiz@atlasbau.de", phone: "+49 160 4455667", company: "Atlas Bau AG", position: "Einkauf", source: "Import", temperature: "kalt", status: "offen", createdAt: now - day * 4 },
      { name: "Julia Fischer", email: "j.fischer@greenstep.eco", phone: "+49 152 3344556", company: "GreenStep", position: "Gründerin", source: "Messe", temperature: "heiss", status: "kunde", createdAt: now - day * 6 },
      { name: "Paul Berger", email: "paul.berger@gmx.de", phone: "+49 176 1122334", company: "Berger Consulting", position: "", source: "Google Maps", temperature: "kalt", status: "offen", createdAt: now - day * 7 },
      { name: "Anna Weber", email: "anna@weber-immo.de", phone: "+49 171 5566778", company: "Weber Immobilien", position: "Geschäftsführerin", source: "Import", temperature: "kalt", status: "offen", createdAt: now - day * 8 },
    ];
    demo.forEach((d) => this.addLead(d));
  },
};

/* ---------- Hilfen ---------- */
function normalizeLead(input) {
  return {
    id: uid(),
    name: (input.name || "").trim(),
    email: (input.email || "").trim(),
    phone: (input.phone || "").trim(),
    company: (input.company || "").trim(),
    position: (input.position || "").trim(),
    website: (input.website || "").trim(),
    location: (input.location || "").trim(),
    source: (input.source || "Manuell").trim(),
    temperature: input.temperature || "kalt",
    status: input.status || "offen",
    activities: input.message ? [{ id: uid(), type: "note", text: input.message, outcome: "", at: Date.now() }] : [],
    lastContact: input.lastContact || null,
    nextFollowUp: input.nextFollowUp || null,
    createdAt: input.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}

/** Vorname aus vollem Namen. */
function firstName(name) { return (name || "").trim().split(/\s+/)[0] || ""; }

/** Platzhalter in Vorlagen ersetzen. */
function fillTemplate(text, lead) {
  return String(text || "")
    .replace(/\{\{\s*name\s*\}\}/gi, lead.name || "")
    .replace(/\{\{\s*vorname\s*\}\}/gi, firstName(lead.name))
    .replace(/\{\{\s*firma\s*\}\}/gi, lead.company || "")
    .replace(/\{\{\s*position\s*\}\}/gi, lead.position || "")
    .replace(/\{\{\s*ort\s*\}\}/gi, lead.location || "");
}
