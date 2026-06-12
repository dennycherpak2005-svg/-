/* ============================================================
   store.js – gemeinsame Datenschicht (localStorage)
   Wird vom Dashboard UND vom öffentlichen Formular genutzt.
   ============================================================ */

const STORE_KEY = "leadcrm.v1";

/** Pipeline-Stufen – Reihenfolge bestimmt die Spalten im Board. */
const STAGES = [
  { id: "neu",          label: "Neu",          color: "#0891b2" },
  { id: "kontaktiert",  label: "Kontaktiert",  color: "#4f46e5" },
  { id: "qualifiziert", label: "Qualifiziert", color: "#7c3aed" },
  { id: "angebot",      label: "Angebot",      color: "#d97706" },
  { id: "gewonnen",     label: "Gewonnen",     color: "#16a34a" },
  { id: "verloren",     label: "Verloren",     color: "#dc2626" },
];

const stageById = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

/* ---------- Low-level Persistenz ---------- */
function readAll() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { leads: [] };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.leads)) data.leads = [];
    return data;
  } catch (e) {
    console.error("Konnte Daten nicht lesen:", e);
    return { leads: [] };
  }
}

function writeAll(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  // andere Tabs / Seiten benachrichtigen
  try { window.dispatchEvent(new Event("leadcrm:changed")); } catch (_) {}
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- Öffentliche API ---------- */
const Store = {
  STAGES,
  stageById,

  getLeads() {
    return readAll().leads.sort((a, b) => b.createdAt - a.createdAt);
  },

  getLead(id) {
    return readAll().leads.find((l) => l.id === id) || null;
  },

  /** Neuen Lead anlegen (vom Formular oder manuell). */
  addLead(input) {
    const data = readAll();
    const lead = {
      id: uid(),
      name: (input.name || "").trim(),
      email: (input.email || "").trim(),
      phone: (input.phone || "").trim(),
      company: (input.company || "").trim(),
      message: (input.message || "").trim(),
      budget: (input.budget || "").trim(),
      source: input.source || "Webformular",
      stage: input.stage || "neu",
      notes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (input.message) {
      lead.notes.push({ id: uid(), text: input.message, at: Date.now(), kind: "anfrage" });
    }
    data.leads.push(lead);
    writeAll(data);
    return lead;
  },

  updateLead(id, patch) {
    const data = readAll();
    const lead = data.leads.find((l) => l.id === id);
    if (!lead) return null;
    Object.assign(lead, patch, { updatedAt: Date.now() });
    writeAll(data);
    return lead;
  },

  setStage(id, stage) {
    return this.updateLead(id, { stage });
  },

  addNote(id, text) {
    const data = readAll();
    const lead = data.leads.find((l) => l.id === id);
    if (!lead) return null;
    lead.notes = lead.notes || [];
    lead.notes.push({ id: uid(), text: text.trim(), at: Date.now(), kind: "note" });
    lead.updatedAt = Date.now();
    writeAll(data);
    return lead;
  },

  deleteLead(id) {
    const data = readAll();
    data.leads = data.leads.filter((l) => l.id !== id);
    writeAll(data);
  },

  /** Hilfsfunktion: Beispieldaten beim allerersten Start. */
  seedIfEmpty() {
    const data = readAll();
    if (data.leads.length > 0) return;
    const now = Date.now();
    const day = 86400000;
    const demo = [
      { name: "Lena Hoffmann", email: "lena.hoffmann@brightlabs.de", phone: "+49 151 2345678", company: "BrightLabs GmbH", source: "Webformular", stage: "neu", budget: "5.000 €", message: "Interessiert an eurem Premium-Paket, bitte um Rückruf.", createdAt: now - day * 0.2 },
      { name: "Tomáš Novák", email: "t.novak@nordwind.io", phone: "+420 777 112 233", company: "Nordwind s.r.o.", source: "Empfehlung", stage: "kontaktiert", budget: "12.000 €", message: "Wir suchen eine Lösung für 20 Mitarbeiter.", createdAt: now - day * 1.5 },
      { name: "Sarah Klein", email: "sarah@klein-design.de", phone: "+49 170 9988776", company: "Klein Design", source: "LinkedIn", stage: "qualifiziert", budget: "8.500 €", message: "Demo-Termin gewünscht.", createdAt: now - day * 3 },
      { name: "Mehmet Yıldız", email: "myildiz@atlasbau.de", phone: "+49 160 4455667", company: "Atlas Bau AG", source: "Webformular", stage: "angebot", budget: "22.000 €", message: "Angebot für Jahreslizenz erhalten, prüft intern.", createdAt: now - day * 5 },
      { name: "Julia Fischer", email: "j.fischer@greenstep.eco", phone: "+49 152 3344556", company: "GreenStep", source: "Messe", stage: "gewonnen", budget: "15.000 €", message: "Vertrag unterschrieben! 🎉", createdAt: now - day * 8 },
      { name: "Paul Berger", email: "paul.berger@gmx.de", phone: "+49 176 1122334", company: "", source: "Webformular", stage: "verloren", budget: "2.000 €", message: "Budget passt aktuell nicht.", createdAt: now - day * 10 },
    ];
    demo.forEach((d) => this.addLead(d));
  },
};
