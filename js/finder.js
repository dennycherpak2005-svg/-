/* ============================================================
   finder.js – Lead-Finder (Auto-Scraper über OpenStreetMap)
   Quellen: Nominatim (Ort → Bounding-Box) + Overpass (Firmen).
   Beides kostenlos, ohne API-Key, CORS-fähig → läuft im Browser.
   ============================================================ */

const FINDER_KEY = "leadcrm.finder";

/** Branchen → OpenStreetMap-Tags. */
const BRANCHEN = [
  { label: "Restaurant",         filters: [["amenity", "restaurant"]] },
  { label: "Café",               filters: [["amenity", "cafe"]] },
  { label: "Bar / Kneipe",       filters: [["amenity", "bar"], ["amenity", "pub"]] },
  { label: "Hotel",              filters: [["tourism", "hotel"]] },
  { label: "Bäckerei",           filters: [["shop", "bakery"]] },
  { label: "Friseur",            filters: [["shop", "hairdresser"]] },
  { label: "Kosmetik / Beauty",  filters: [["shop", "beauty"]] },
  { label: "Fitnessstudio",      filters: [["leisure", "fitness_centre"]] },
  { label: "Zahnarzt",           filters: [["amenity", "dentist"], ["healthcare", "dentist"]] },
  { label: "Arztpraxis",         filters: [["amenity", "doctors"], ["healthcare", "doctor"]] },
  { label: "Apotheke",           filters: [["amenity", "pharmacy"]] },
  { label: "Anwalt / Kanzlei",   filters: [["office", "lawyer"]] },
  { label: "Steuerberater",      filters: [["office", "tax_advisor"]] },
  { label: "Immobilienmakler",   filters: [["office", "estate_agent"]] },
  { label: "Versicherung",       filters: [["office", "insurance"]] },
  { label: "Autohaus",           filters: [["shop", "car"]] },
  { label: "KFZ-Werkstatt",      filters: [["shop", "car_repair"]] },
  { label: "Elektriker",         filters: [["craft", "electrician"]] },
  { label: "Sanitär / Klempner", filters: [["craft", "plumber"]] },
  { label: "Maler",              filters: [["craft", "painter"]] },
  { label: "Tischler",           filters: [["craft", "carpenter"]] },
];

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
// Overpass-Server mit CORS-Unterstützung zuerst (nur die funktionieren im Browser).
// overpass-api.de hat CORS wenn gesund; maps.mail.ru ist ein zuverlässiger CORS-Fallback.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/* ---------- Ketten- und Adress-Filter ----------
   Konzerne und Ketten lesen Cold Mails nie beim Entscheider.
   Wird im Finder UND vor dem n8n-Versand geprüft (auch für alte Leads). */
const CHAIN_DOMAINS = [
  "marriott", "hilton", "ihg.com", "crowneplaza", "holidayinn", "accor", "ibis", "novotel",
  "mercure", "steigenberger", "hrewards", "hotelbb", "hotel-bb", "novum-hotels", "dormero",
  "h-hotels", "atlantic-hotels", "motel-one", "motelone", "nh-hotels", "nh-collection",
  "radissonhotels", "radisson", "bestwestern", "leonardo-hotels", "ringhotels", "ghotel",
  "prizeotel", "premierinn", "a-o.com", "aohostels", "meininger", "maritim", "dorint",
  "lindnerhotels", "achat-hotels", "intercityhotel", "arcotel", "wyndham", "hyatt", "sheraton",
  "westin", "kempinski", "fourseasons", "sofitel", "pullman", "tibits",
  "mcdonalds", "burgerking", "starbucks", "vapiano", "subway", "kfc", "nordsee.com",
  "fielmann", "apollo.de", "rossmann", "dm.de", "medbase", "aok", "gothaer", "barmenia",
  "wuestenrot", "allianz", "ergo.de", "huk", "debeka", "sparkasse", "volksbank",
];
const BAD_LOCALPARTS = [
  "privacy", "datenschutz", "dataprotection", "dpo", "jobs", "job", "karriere", "career",
  "bewerbung", "hr", "personal", "presse", "press", "noreply", "no-reply", "donotreply",
  "newsletter", "abuse", "postmaster", "webmaster", "rechnung", "invoice", "buchhaltung",
];
function domainOf(s) {
  s = String(s || "").toLowerCase().trim();
  if (s.includes("@")) s = s.split("@").pop();
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];
  return s;
}
/** Grund, warum ein Lead eine Kette/Konzern-Adresse ist – oder "" wenn sauber. */
function chainReason(lead) {
  if (lead.chain) return "Kette (" + lead.chain + ")";
  const doms = [domainOf(lead.email), domainOf(lead.website)].filter(Boolean);
  const hit = CHAIN_DOMAINS.find((c) => doms.some((d) => d.includes(c)));
  if (hit) return "Konzern/Kette (" + hit + ")";
  const local = String(lead.email || "").toLowerCase().split("@")[0];
  if (local && BAD_LOCALPARTS.includes(local)) return "ungeeignete Adresse (" + local + "@)";
  return "";
}
window.chainReason = chainReason;

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

/* ---------- Finder-Konfig (gespeicherte Suchen + Auto) ---------- */
function readFinder() {
  try { return JSON.parse(localStorage.getItem(FINDER_KEY)) || { queue: [], auto: false, interval: 10, log: [] }; }
  catch { return { queue: [], auto: false, interval: 10, log: [] }; }
}
function writeFinder(cfg) { localStorage.setItem(FINDER_KEY, JSON.stringify(cfg)); }

const finder = { lastResults: [], timer: null, running: false };

/* ---------- Geocoding: Ort → Bounding-Box ---------- */
async function geocode(stadt) {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(stadt)}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Ort-Suche fehlgeschlagen");
  const data = await res.json();
  if (!data.length) throw new Error(`Ort „${stadt}" nicht gefunden`);
  const d = data[0];
  return {
    lat: Number(d.lat), lon: Number(d.lon),
    country: ((d.address && d.address.country_code) || "").toUpperCase(),
    displayName: d.display_name,
  };
}

/* ---------- Overpass-Abfrage bauen + ausführen ---------- */
/** Sucht im echten Umkreis (km) um den Ortsmittelpunkt – nicht mehr in der
 *  Bounding-Box. (Hamburg reichte per Box wegen Neuwerk bis Cuxhaven/Nordsee.) */
function buildOverpass(filters, center, radiusKm) {
  const around = `(around:${Math.round(radiusKm * 1000)},${center.lat},${center.lon})`;
  const lines = filters.map(([k, v]) =>
    `  node["${k}"="${v}"]${around};\n  way["${k}"="${v}"]${around};`
  ).join("\n");
  return `[out:json][timeout:25];\n(\n${lines}\n);\nout center tags 200;`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query) {
  const body = "data=" + encodeURIComponent(query);
  let lastErr;
  // 2 Runden: bei kurzzeitiger Überlastung (429/504) nochmal probieren.
  for (let round = 0; round < 2; round++) {
    for (const url of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        if (!res.ok) { lastErr = new Error("Server " + res.status); continue; }
        const data = await res.json();
        return data.elements || [];
      } catch (e) { lastErr = e; }
    }
    if (round === 0) await sleep(2500); // kurz warten, dann zweite Runde
  }
  throw new Error("Daten-Server gerade überlastet – bitte 1–2 Minuten warten und erneut suchen");
}

/** OSM-Element → Lead. */
function elementToLead(el, stadt, country) {
  const t = el.tags || {};
  const name = t.name;
  if (!name) return null;
  const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
  const city = t["addr:city"] || stadt;
  return {
    name,
    company: name,
    phone: t.phone || t["contact:phone"] || t["contact:mobile"] || "",
    email: t.email || t["contact:email"] || "",
    website: t.website || t["contact:website"] || "",
    location: [street, city].filter(Boolean).join(", "),
    city,
    country: (t["addr:country"] || country || "").toUpperCase(),
    chain: t.brand || (t["brand:wikidata"] ? "Marke" : "") || "",
    source: "OSM",
    temperature: "kalt",
    status: "offen",
  };
}

/** Komplette Suche für eine Branche+Stadt-Kombi im Umkreis. Ketten fliegen raus. */
async function runSearch(brancheLabel, stadt, radiusKm = 10) {
  const branche = BRANCHEN.find((b) => b.label === brancheLabel) || BRANCHEN[0];
  const center = await geocode(stadt);
  const elements = await overpass(buildOverpass(branche.filters, center, radiusKm));
  const seen = new Set();
  const leads = [];
  let chains = 0;
  elements.forEach((el) => {
    const lead = elementToLead(el, stadt, center.country);
    if (!lead) return;
    if (chainReason(lead)) { chains++; return; }
    delete lead.chain;
    const key = lead.name + "|" + lead.phone;
    if (seen.has(key)) return;
    seen.add(key);
    leads.push(lead);
  });
  leads.chainsRemoved = chains;
  leads.country = center.country;
  return leads;
}

/* ============================================================
   UI: manuelle Suche
   ============================================================ */
function fdInitDropdown() {
  $("#fd-branche").innerHTML = BRANCHEN.map((b) => `<option value="${esc(b.label)}">${esc(b.label)}</option>`).join("");
  if ($("#fd-radius")) $("#fd-radius").innerHTML = RADIUS_OPTIONS.map((r) => `<option value="${r}" ${r === 10 ? "selected" : ""}>${r} km</option>`).join("");
}

async function fdSearch() {
  const branche = $("#fd-branche").value;
  const stadt = $("#fd-stadt").value.trim();
  const radius = Number($("#fd-radius").value) || 10;
  if (!stadt) { toast("Bitte einen Ort eingeben"); return; }
  const btn = $("#fd-search");
  btn.disabled = true;
  fdStatus("⏳ Suche läuft … (Ort wird lokalisiert)");
  try {
    const leads = await runSearch(branche, stadt, radius);
    finder.lastResults = leads;
    const ketten = leads.chainsRemoved ? ` · ${leads.chainsRemoved} Ketten aussortiert` : "";
    fdStatus(`${leads.length} Firmen im Umkreis von ${radius} km${ketten}${leads.length ? "" : " – andere Branche/Ort probieren"}`);
    fdRenderResults(leads, branche, `${stadt} ${radius}km`);
  } catch (e) {
    fdStatus("⚠️ " + e.message);
    $("#fd-results").innerHTML = "";
  } finally {
    btn.disabled = false;
  }
}

function fdStatus(txt) { $("#fd-status").textContent = txt; }

function fdRenderResults(leads, branche, stadt) {
  const c = $("#fd-results");
  if (!leads.length) { c.innerHTML = ""; return; }
  const withPhone = leads.filter((l) => l.phone).length;
  c.innerHTML = `
    <div class="fd-results-head">
      <b>${leads.length} Treffer</b> · ${withPhone} mit Telefon
      <button class="btn btn-sm btn-primary" id="fd-import-all" style="margin-left:auto">Alle übernehmen</button>
    </div>
    <div class="fd-list">
      ${leads.map((l, i) => `
        <label class="fd-item">
          <input type="checkbox" data-i="${i}" ${l.phone ? "checked" : ""} />
          <div class="fd-item-main">
            <div class="fd-item-name">${esc(l.name)}</div>
            <div class="fd-item-sub">${l.phone ? "📞 " + esc(l.phone) + " · " : ""}${l.website ? "🌐 " + esc(l.website.replace(/^https?:\/\//, "")) : ""}${!l.phone && !l.website ? esc(l.location || "—") : ""}</div>
          </div>
        </label>`).join("")}
    </div>`;
  $("#fd-import-all").onclick = () => {
    const picks = $$("#fd-results input[type=checkbox]").filter((c) => c.checked).map((c) => leads[Number(c.dataset.i)]);
    fdImport(picks, `${branche} · ${stadt}`);
  };
}

function fdImport(leads, sourceLabel) {
  if (!leads.length) { toast("Nichts ausgewählt"); return; }
  const tagged = leads.map((l) => ({ ...l, source: "Finder: " + sourceLabel }));
  const res = Store.importLeads(tagged);
  toast(`${res.added} neue Leads übernommen${res.skipped ? `, ${res.skipped} Duplikate` : ""} ✅`);
  renderAll();
  // Kein Auto-Versand mehr: Leads gehen nur über die Vorschau in der Arbeitsliste raus.
  return res;
}

/* ============================================================
   Auto-Modus
   ============================================================ */
function fdAddQueue() {
  const branche = $("#fd-branche").value, stadt = $("#fd-stadt").value.trim();
  const radius = Number($("#fd-radius").value) || 10;
  if (!stadt) { toast("Bitte erst einen Ort eingeben"); return; }
  const cfg = readFinder();
  if (cfg.queue.some((q) => q.branche === branche && q.stadt.toLowerCase() === stadt.toLowerCase() && (q.radius || 10) === radius)) {
    toast("Diese Suche ist schon gespeichert"); return;
  }
  cfg.queue.push({ branche, stadt, radius });
  writeFinder(cfg);
  fdRenderQueue();
  toast("Zur Auto-Suche hinzugefügt");
}

function fdRenderQueue() {
  const cfg = readFinder();
  const c = $("#fd-queue-list");
  if (!cfg.queue.length) { c.innerHTML = `<div class="muted small">Noch keine Suchen gespeichert. Branche + Stadt wählen und „＋ Zur Auto-Suche" klicken.</div>`; return; }
  c.innerHTML = cfg.queue.map((q, i) => `
    <div class="fd-queue-item">
      <span>🔎 ${esc(q.branche)} · <b>${esc(q.stadt)}</b> · ${q.radius || 10} km</span>
      <button class="icon-btn" data-del="${i}" title="Entfernen">✕</button>
    </div>`).join("");
  $$("#fd-queue-list [data-del]").forEach((b) => b.addEventListener("click", () => {
    const cfg2 = readFinder(); cfg2.queue.splice(Number(b.dataset.del), 1); writeFinder(cfg2); fdRenderQueue();
  }));
}

function fdLog(msg) {
  const cfg = readFinder();
  cfg.log = cfg.log || [];
  cfg.log.unshift({ at: Date.now(), msg });
  cfg.log = cfg.log.slice(0, 30);
  writeFinder(cfg);
  fdRenderLog();
}
function fdRenderLog() {
  const cfg = readFinder();
  const c = $("#fd-log");
  if (!cfg.log || !cfg.log.length) { c.innerHTML = `<div class="muted small">Noch keine Läufe.</div>`; return; }
  c.innerHTML = cfg.log.map((e) => `<div class="fd-log-row"><span class="muted small">${new Date(e.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span> ${esc(e.msg)}</div>`).join("");
}

let autoIndex = 0;
async function autoTick() {
  if (finder.running) return;
  const cfg = readFinder();
  if (!cfg.auto || !cfg.queue.length) return;
  finder.running = true;
  const q = cfg.queue[autoIndex % cfg.queue.length];
  autoIndex++;
  try {
    const leads = await runSearch(q.branche, q.stadt, q.radius || 10);
    const res = Store.importLeads(leads.map((l) => ({ ...l, source: `Auto: ${q.branche} · ${q.stadt}` })));
    fdLog(`${q.branche} · ${q.stadt}: ${res.added} neu${res.skipped ? `, ${res.skipped} bekannt` : ""}`);
    if (res.added) renderAll(); // nur importieren – gesendet wird nie automatisch
  } catch (e) {
    fdLog(`⚠️ ${q.branche} · ${q.stadt}: ${e.message}`);
  } finally {
    finder.running = false;
  }
}

function fdStartAuto() {
  fdStopAuto();
  const cfg = readFinder();
  const ms = Math.max(5, Number(cfg.interval) || 10) * 60000;
  finder.timer = setInterval(autoTick, ms);
  autoTick(); // sofort einmal loslegen
}
function fdStopAuto() { if (finder.timer) { clearInterval(finder.timer); finder.timer = null; } }

function fdSetAuto(on) {
  const cfg = readFinder();
  cfg.auto = on;
  writeFinder(cfg);
  if (on) { fdStartAuto(); toast("Auto-Modus aktiv 🤖"); }
  else { fdStopAuto(); toast("Auto-Modus gestoppt"); }
}

/* ============================================================
   Init / Wiring
   ============================================================ */
function fdInit() {
  fdInitDropdown();
  const cfg = readFinder();
  $("#fd-auto").checked = !!cfg.auto;
  $("#fd-interval").value = String(cfg.interval || 10);
  fdRenderQueue();
  fdRenderLog();

  $("#fd-search").onclick = fdSearch;
  $("#fd-stadt").addEventListener("keydown", (e) => { if (e.key === "Enter") fdSearch(); });
  $("#fd-queue").onclick = fdAddQueue;
  $("#fd-auto").addEventListener("change", (e) => fdSetAuto(e.target.checked));
  $("#fd-interval").addEventListener("change", (e) => {
    const c = readFinder(); c.interval = Number(e.target.value); writeFinder(c);
    if (c.auto) fdStartAuto();
  });

  // Auto-Modus nach Reload fortsetzen
  if (cfg.auto && cfg.queue.length) fdStartAuto();
}

fdInit();
