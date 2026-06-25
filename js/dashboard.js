/* ============================================================
   dashboard.js – Akquise-Cockpit UI
   ============================================================ */

Store.seedIfEmpty();

const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const state = { view: "cockpit", search: "", temp: "alle", status: "alle" };

/* ---------- Helpers ---------- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function initials(n) { return (n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
function avatarColor(str) {
  const c = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0d9488"];
  let h = 0; for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}
function avatar(n) { return `<span class="avatar" style="background:${avatarColor(n)}">${initials(n)}</span>`; }
function relTime(ts) {
  if (!ts) return "—";
  const d = Date.now() - ts, m = 60000, h = 3600000, day = 86400000;
  const past = d >= 0; const a = Math.abs(d);
  let v;
  if (a < m) v = "gerade eben";
  else if (a < h) v = Math.floor(a / m) + " Min.";
  else if (a < day) v = Math.floor(a / h) + " Std.";
  else if (a < day * 30) v = Math.floor(a / day) + " Tg.";
  else v = new Date(ts).toLocaleDateString("de-DE");
  if (a < m) return v;
  return past ? "vor " + v : "in " + v;
}
function fmtDate(ts) { return ts ? new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2400);
}
function tempBadge(id) {
  const t = Store.tempById(id);
  return `<span class="temp-badge" style="background:${t.color}1a;color:${t.color}">${t.emoji} ${t.label}</span>`;
}
function statusBadge(id) {
  const s = Store.statusById(id);
  return `<span class="status-pill" style="background:${s.color}1a;color:${s.color}"><span class="dot" style="background:${s.color}"></span>${s.label}</span>`;
}
function followDue(lead) { return lead.nextFollowUp && lead.nextFollowUp <= Date.now() + 12 * 3600000; }

function filtered() {
  let leads = Store.getLeads();
  if (state.temp !== "alle") leads = leads.filter((l) => l.temperature === state.temp);
  if (state.status !== "alle") leads = leads.filter((l) => l.status === state.status);
  if (state.search) {
    const q = state.search.toLowerCase();
    leads = leads.filter((l) => [l.name, l.email, l.company, l.phone, l.source, l.position].join(" ").toLowerCase().includes(q));
  }
  return leads;
}

/* ============================================================
   Cockpit: Stat-Karten + Listen
   ============================================================ */
function renderStats() {
  const leads = Store.getLeads();
  const by = (t) => leads.filter((l) => l.temperature === t).length;
  const day = 86400000;
  const contactedToday = leads.filter((l) => l.lastContact && Date.now() - l.lastContact < day).length;
  const dueFollow = leads.filter(followDue).length;
  const kunden = leads.filter((l) => l.status === "kunde").length;

  const cards = [
    { label: "🧊 Kalt", value: by("kalt"), sub: "noch unbearbeitet", bg: "var(--info-soft)", fg: "var(--info)", ico: "🧊" },
    { label: "🌤️ Warm", value: by("warm"), sub: "im Gespräch", bg: "var(--warning-soft)", fg: "var(--warning)", ico: "🌤️" },
    { label: "🔥 Heiß", value: by("heiss"), sub: "kurz vorm Abschluss", bg: "var(--danger-soft)", fg: "var(--danger)", ico: "🔥" },
    { label: "Heute kontaktiert", value: contactedToday, sub: "Mails & Anrufe", bg: "var(--primary-soft)", fg: "var(--primary)", ico: "📨" },
    { label: "Follow-ups fällig", value: dueFollow, sub: "jetzt dran", bg: "var(--warning-soft)", fg: "var(--warning)", ico: "⏰" },
    { label: "Kunden", value: kunden, sub: "gewonnen", bg: "var(--success-soft)", fg: "var(--success)", ico: "🏆" },
  ];
  $("#stat-cards").innerHTML = cards.map((c) => `
    <div class="stat">
      <div class="label"><span class="badge-ico" style="background:${c.bg};color:${c.fg}">${c.ico}</span>${c.label}</div>
      <div class="value">${c.value}</div><div class="sub">${c.sub}</div>
    </div>`).join("");
}

function miniRow(l, extra = "") {
  return `<div class="mini-row" data-id="${l.id}">
    ${avatar(l.name)}
    <div class="mini-main">
      <div class="mini-name">${esc(l.name || "Ohne Namen")}</div>
      <div class="mini-sub">${esc(l.company || l.email || "—")}</div>
    </div>
    ${extra}
    <div class="mini-actions">
      <button class="icon-btn" data-act="mail" title="Akquise-Mail">📧</button>
      <button class="icon-btn" data-act="call" title="Anrufen">📞</button>
    </div>
  </div>`;
}
function bindMini(container) {
  $$(".mini-row", container).forEach((row) => {
    const id = row.dataset.id;
    row.addEventListener("click", (e) => { if (!e.target.closest("[data-act]")) openLead(id); });
    $$("[data-act]", row).forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      b.dataset.act === "mail" ? composeMail(id) : callLead(id);
    }));
  });
}

function renderFollowups() {
  const leads = Store.getLeads().filter((l) => l.nextFollowUp).sort((a, b) => a.nextFollowUp - b.nextFollowUp).slice(0, 6);
  const c = $("#followups");
  if (!leads.length) { c.innerHTML = emptyMini("Keine Follow-ups geplant", "🎉"); return; }
  c.innerHTML = leads.map((l) => miniRow(l, `<span class="due ${followDue(l) ? "overdue" : ""}">${relTime(l.nextFollowUp)}</span>`)).join("");
  bindMini(c);
}
function renderHotlist() {
  const leads = Store.getLeads().filter((l) => l.temperature === "heiss" && l.status !== "kunde").slice(0, 6);
  const c = $("#hotlist");
  if (!leads.length) { c.innerHTML = emptyMini("Noch keine heißen Leads", "🌱"); return; }
  c.innerHTML = leads.map((l) => miniRow(l, statusBadge(l.status))).join("");
  bindMini(c);
}
function emptyMini(txt, ico) { return `<div class="empty-mini"><span>${ico}</span>${txt}</div>`; }

/* ============================================================
   Arbeitsliste
   ============================================================ */
function renderFilters() {
  const leads = Store.getLeads();
  const tempChips = [{ id: "alle", label: "Alle", emoji: "📋" }].concat(Store.TEMPS).map((t) =>
    `<button class="chip ${state.temp === t.id ? "active" : ""}" data-temp="${t.id}">${t.emoji || ""} ${t.label}${t.id !== "alle" ? " · " + leads.filter((l) => l.temperature === t.id).length : ""}</button>`
  ).join("");
  $("#temp-filter").innerHTML = tempChips;
  $$("#temp-filter .chip").forEach((c) => c.addEventListener("click", () => { state.temp = c.dataset.temp; renderWorklist(); renderFilters(); }));

  const statusChips = [{ id: "alle", label: "Alle Status" }].concat(Store.STATUSES).map((s) =>
    `<button class="chip ${state.status === s.id ? "active" : ""}" data-status="${s.id}">${s.label}</button>`
  ).join("");
  $("#status-filter").innerHTML = statusChips;
  $$("#status-filter .chip").forEach((c) => c.addEventListener("click", () => { state.status = c.dataset.status; renderWorklist(); renderFilters(); }));
}

function renderWorklist() {
  const leads = filtered();
  const c = $("#worklist");
  if (!leads.length) {
    c.innerHTML = `<div class="empty-state"><div class="big">🗒️</div><h3>Keine Leads</h3><p>Importiere Leads oder lege manuell welche an.</p></div>`;
    return;
  }
  c.innerHTML = leads.map((l) => `
    <div class="work-row ${followDue(l) ? "due-row" : ""}" data-id="${l.id}">
      ${avatar(l.name)}
      <div class="work-main">
        <div class="work-name">${esc(l.name || "Ohne Namen")} ${l.position ? `<span class="work-pos">· ${esc(l.position)}</span>` : ""}</div>
        <div class="work-sub">${esc(l.company || "—")} · <span class="muted">${esc(l.source)}</span></div>
      </div>
      <div class="work-badges">${tempBadge(l.temperature)} ${statusBadge(l.status)}</div>
      <div class="work-contact">
        <div class="muted small">Letzter Kontakt</div>
        <div>${relTime(l.lastContact)}</div>
      </div>
      <div class="work-actions">
        <button class="btn btn-sm" data-act="mail" ${l.email ? "" : "disabled title='Keine E-Mail'"}>📧 Mail</button>
        <button class="btn btn-sm" data-act="call" ${l.phone ? "" : "disabled title='Keine Nummer'"}>📞 Call</button>
        <button class="btn btn-sm" data-act="open">›</button>
      </div>
    </div>`).join("");

  $$(".work-row", c).forEach((row) => {
    const id = row.dataset.id;
    row.addEventListener("click", (e) => { if (!e.target.closest("[data-act]")) openLead(id); });
    $$("[data-act]", row).forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (b.dataset.act === "mail") composeMail(id);
      else if (b.dataset.act === "call") callLead(id);
      else openLead(id);
    }));
  });
}

/* ============================================================
   Mail verfassen (mailto + Vorlage + Logging)
   ============================================================ */
function composeMail(id) {
  const lead = Store.getLead(id);
  if (!lead) return;
  if (!lead.email) { toast("Dieser Lead hat keine E-Mail-Adresse"); return; }
  const tpls = Store.getTemplates();
  const first = tpls[0];

  $("#modal").innerHTML = `
    <div class="modal-head">
      ${avatar(lead.name)}
      <div><div class="mh-title">📧 Akquise-Mail</div><div class="mh-sub">an ${esc(lead.email)}</div></div>
      <button class="x" id="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Vorlage</label>
        <select id="m-tpl">
          <option value="">— ohne Vorlage —</option>
          ${tpls.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Betreff</label><input id="m-subject" /></div>
      <div class="field"><label>Nachricht</label><textarea id="m-body" style="min-height:200px"></textarea></div>
      <p class="muted small">Beim Öffnen wird dein Mailprogramm mit diesem Text gestartet und der Kontakt automatisch als „kontaktiert" protokolliert.</p>
    </div>
    <div class="modal-foot">
      <button class="btn" id="m-cancel">Abbrechen</button>
      <button class="btn btn-primary" id="m-send" style="margin-left:auto">📧 In Mailprogramm öffnen</button>
    </div>`;
  openOverlay();

  const apply = (tpl) => {
    $("#m-subject").value = tpl ? fillTemplate(tpl.subject, lead) : "";
    $("#m-body").value = tpl ? fillTemplate(tpl.body, lead) : "";
  };
  apply(first);
  $("#m-tpl").value = first ? first.id : "";
  $("#m-tpl").onchange = (e) => apply(tpls.find((t) => t.id === e.target.value));
  $("#modal-close").onclick = $("#m-cancel").onclick = closeModal;
  $("#m-send").onclick = () => {
    const subject = $("#m-subject").value, body = $("#m-body").value;
    const url = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    Store.logActivity(id, { type: "mail", text: subject, status: lead.status === "offen" ? "kontaktiert" : lead.status });
    toast("Mail geöffnet & protokolliert 📧");
    closeModal(); renderAll();
  };
}

/* ============================================================
   Anrufen (tel: + Ergebnis loggen)
   ============================================================ */
function callLead(id) {
  const lead = Store.getLead(id);
  if (!lead) return;
  if (!lead.phone) { toast("Dieser Lead hat keine Nummer"); return; }

  const outcomes = [
    { key: "erreicht",   label: "✅ Erreicht",        status: "geantwortet", temp: "warm" },
    { key: "termin",     label: "📅 Termin vereinbart", status: "termin",      temp: "heiss" },
    { key: "mailbox",    label: "📭 Mailbox",          status: "kontaktiert", temp: null },
    { key: "nicht",      label: "📵 Nicht erreicht",   status: "kontaktiert", temp: null },
    { key: "kein",       label: "🚫 Kein Interesse",   status: "abgelehnt",   temp: "kalt" },
  ];

  $("#modal").innerHTML = `
    <div class="modal-head">
      ${avatar(lead.name)}
      <div><div class="mh-title">📞 Anruf</div><div class="mh-sub">${esc(lead.company || "")}</div></div>
      <button class="x" id="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <a class="call-number" href="tel:${esc(lead.phone.replace(/\s/g, ""))}">📞 ${esc(lead.phone)}</a>
      <p class="muted" style="text-align:center;margin:6px 0 18px">Tippen zum Wählen, danach Ergebnis festhalten:</p>
      <div class="outcome-grid">
        ${outcomes.map((o) => `<button class="btn outcome-btn" data-key="${o.key}">${o.label}</button>`).join("")}
      </div>
      <div class="field" style="margin-top:18px"><label>Notiz (optional)</label><input id="call-note" placeholder="z. B. Rückruf nächste Woche" /></div>
      <div class="field"><label>Nächstes Follow-up</label>
        <select id="call-follow">
          <option value="">— keins —</option>
          <option value="1">morgen</option>
          <option value="3">in 3 Tagen</option>
          <option value="7" selected>in 1 Woche</option>
          <option value="14">in 2 Wochen</option>
        </select>
      </div>
    </div>`;
  openOverlay();
  $("#modal-close").onclick = closeModal;
  $$(".outcome-btn").forEach((b) => b.addEventListener("click", () => {
    const o = outcomes.find((x) => x.key === b.dataset.key);
    const note = $("#call-note").value.trim();
    const days = $("#call-follow").value;
    Store.logActivity(id, {
      type: "call", outcome: o.label, text: note,
      status: o.status, temperature: o.temp || undefined,
      nextFollowUp: days ? Date.now() + Number(days) * 86400000 : undefined,
    });
    toast(`Anruf protokolliert: ${o.label}`);
    closeModal(); renderAll();
  }));
}

/* ============================================================
   Lead-Detail
   ============================================================ */
function openLead(id) {
  const lead = Store.getLead(id);
  if (!lead) return;
  const acts = (lead.activities || []).slice().reverse();
  const actIco = { mail: "📧", call: "📞", note: "📝", status: "🔄" };

  $("#modal").innerHTML = `
    <div class="modal-head">
      ${avatar(lead.name)}
      <div><div class="mh-title">${esc(lead.name || "Ohne Namen")}</div><div class="mh-sub">${esc(lead.company || "—")}${lead.position ? " · " + esc(lead.position) : ""}</div></div>
      <button class="x" id="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="quick-actions">
        <button class="btn btn-primary" id="d-mail" ${lead.email ? "" : "disabled"}>📧 Mail</button>
        <button class="btn btn-primary" id="d-call" ${lead.phone ? "" : "disabled"}>📞 Anrufen</button>
        <button class="btn" id="d-n8n" ${lead.email || lead.website ? "" : "disabled title='Keine E-Mail/Website'"}>🚀 n8n</button>
        <button class="btn" id="d-followup" ${lead.email || lead.website ? "" : "disabled title='Keine E-Mail/Website'"}>↩️ Follow-up</button>
      </div>
      <div class="row2">
        <div class="field"><label>Temperatur</label><select id="d-temp">${Store.TEMPS.map((t) => `<option value="${t.id}" ${t.id === lead.temperature ? "selected" : ""}>${t.emoji} ${t.label}</option>`).join("")}</select></div>
        <div class="field"><label>Status</label><select id="d-status">${Store.STATUSES.map((s) => `<option value="${s.id}" ${s.id === lead.status ? "selected" : ""}>${s.label}</option>`).join("")}</select></div>
      </div>
      <div class="detail-grid">
        <div class="detail-item"><div class="k">📧 E-Mail</div><div class="v">${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : "—"}</div></div>
        <div class="detail-item"><div class="k">📞 Telefon</div><div class="v">${lead.phone ? `<a href="tel:${esc(lead.phone.replace(/\s/g, ""))}">${esc(lead.phone)}</a>` : "—"}</div></div>
        <div class="detail-item"><div class="k">🌐 Quelle</div><div class="v">${esc(lead.source)}</div></div>
        <div class="detail-item"><div class="k">📍 Ort</div><div class="v">${esc(lead.location || "—")}</div></div>
        <div class="detail-item"><div class="k">⏰ Nächstes Follow-up</div><div class="v">${lead.nextFollowUp ? fmtDate(lead.nextFollowUp) + ` (${relTime(lead.nextFollowUp)})` : "—"}</div></div>
        <div class="detail-item"><div class="k">📨 Letzter Kontakt</div><div class="v">${relTime(lead.lastContact)}</div></div>
      </div>
      <div class="notes">
        <h4>🗒️ Verlauf</h4>
        <div>${acts.length ? acts.map((a) => `<div class="note"><b>${actIco[a.type] || "•"} ${a.outcome || ({mail:"Mail gesendet",call:"Anruf",note:"Notiz",status:"Status"}[a.type] || "")}</b>${a.text ? " – " + esc(a.text) : ""}<div class="when">${fmtDate(a.at)} · ${relTime(a.at)}</div></div>`).join("") : `<div class="muted small">Noch keine Aktivität.</div>`}</div>
        <div class="note-add"><input id="note-input" placeholder="Notiz hinzufügen + Enter…" /><button class="btn btn-sm" id="note-add-btn">+</button></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="d-edit">✏️ Bearbeiten</button>
      <button class="btn btn-danger" id="d-delete" style="margin-left:auto">🗑 Löschen</button>
    </div>`;
  openOverlay();

  $("#modal-close").onclick = closeModal;
  $("#d-mail").onclick = () => composeMail(id);
  $("#d-call").onclick = () => callLead(id);
  if (!$("#d-n8n").disabled) $("#d-n8n").onclick = () => pushToN8n([Store.getLead(id)], "first");
  if (!$("#d-followup").disabled) $("#d-followup").onclick = () => pushToN8n([Store.getLead(id)], "followup");
  $("#d-temp").onchange = (e) => { Store.setTemperature(id, e.target.value); toast("Temperatur aktualisiert"); renderBackground(); };
  $("#d-status").onchange = (e) => { Store.setStatus(id, e.target.value); toast("Status aktualisiert"); renderBackground(); };
  $("#d-edit").onclick = () => editLead(id);
  $("#d-delete").onclick = () => { if (confirm(`„${lead.name}" löschen?`)) { Store.deleteLead(id); closeModal(); toast("Gelöscht"); renderAll(); } };
  const addNote = () => { const v = $("#note-input").value.trim(); if (!v) return; Store.logActivity(id, { type: "note", text: v }); openLead(id); toast("Notiz gespeichert"); renderBackground(); };
  $("#note-add-btn").onclick = addNote;
  $("#note-input").addEventListener("keydown", (e) => { if (e.key === "Enter") addNote(); });
}

/* ---------- Lead Formular (neu/bearbeiten) ---------- */
function leadForm(lead) {
  const v = (k) => esc(lead?.[k] || "");
  return `
    <div class="modal-head"><div class="mh-title">${lead ? "✏️ Lead bearbeiten" : "＋ Neuer Lead"}</div><button class="x" id="modal-close">&times;</button></div>
    <div class="modal-body">
      <div class="row2">
        <div class="field"><label>Name *</label><input id="f-name" value="${v("name")}" placeholder="Max Mustermann" /></div>
        <div class="field"><label>Position</label><input id="f-position" value="${v("position")}" placeholder="Geschäftsführer" /></div>
      </div>
      <div class="row2">
        <div class="field"><label>Firma</label><input id="f-company" value="${v("company")}" placeholder="Muster GmbH" /></div>
        <div class="field"><label>Ort</label><input id="f-location" value="${v("location")}" placeholder="Berlin" /></div>
      </div>
      <div class="row2">
        <div class="field"><label>E-Mail</label><input id="f-email" value="${v("email")}" placeholder="max@firma.de" /></div>
        <div class="field"><label>Telefon</label><input id="f-phone" value="${v("phone")}" placeholder="+49 …" /></div>
      </div>
      <div class="row2">
        <div class="field"><label>Quelle</label><input id="f-source" value="${esc(lead?.source || "Manuell")}" /></div>
        <div class="field"><label>Temperatur</label><select id="f-temp">${Store.TEMPS.map((t) => `<option value="${t.id}" ${t.id === (lead?.temperature || "kalt") ? "selected" : ""}>${t.emoji} ${t.label}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label>Notiz</label><textarea id="f-message" placeholder="Infos zum Lead…">${lead ? "" : ""}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn" id="f-cancel">Abbrechen</button><button class="btn btn-primary" id="f-save" style="margin-left:auto">${lead ? "Speichern" : "Anlegen"}</button></div>`;
}
function newLead() { $("#modal").innerHTML = leadForm(null); openOverlay(); wireForm(null); }
function editLead(id) { $("#modal").innerHTML = leadForm(Store.getLead(id)); openOverlay(); wireForm(id); }
function wireForm(id) {
  $("#modal-close").onclick = $("#f-cancel").onclick = closeModal;
  $("#f-save").onclick = () => {
    const data = {
      name: $("#f-name").value, position: $("#f-position").value, company: $("#f-company").value,
      location: $("#f-location").value, email: $("#f-email").value, phone: $("#f-phone").value,
      source: $("#f-source").value || "Manuell", temperature: $("#f-temp").value,
    };
    if (!data.name.trim()) { toast("Bitte einen Namen eingeben"); return; }
    if (id) Store.updateLead(id, data);
    else { data.message = $("#f-message").value; Store.addLead(data); }
    toast(id ? "Gespeichert" : "Lead angelegt ✨");
    closeModal(); renderAll();
  };
}

/* ============================================================
   Import
   ============================================================ */
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s/().-]{6,}\d)/;

function parseImport(text) {
  const leads = [];
  text.split(/\r?\n/).forEach((line) => {
    line = line.trim();
    if (!line) return;
    const parts = line.split(/[,;\t]| {2,}/).map((p) => p.trim()).filter(Boolean);
    const lead = { name: "", email: "", phone: "", company: "" };
    const rest = [];
    parts.forEach((p) => {
      if (!lead.email && EMAIL_RE.test(p)) lead.email = p.match(EMAIL_RE)[0];
      else if (!lead.phone && PHONE_RE.test(p) && (p.match(/\d/g) || []).length >= 6) lead.phone = p;
      else rest.push(p);
    });
    lead.name = rest[0] || (lead.email ? lead.email.split("@")[0] : "Unbekannt");
    lead.company = rest[1] || "";
    if (rest[2]) lead.location = rest[2];
    if (lead.email || lead.phone || rest.length) leads.push(lead);
  });
  return leads;
}

function updateImportPreview() {
  const leads = parseImport($("#import-text").value);
  $("#import-preview").textContent = leads.length ? `${leads.length} Lead(s) erkannt` : "Noch nichts erkannt";
}
function doImport() {
  const temp = $("#import-temp").value;
  const leads = parseImport($("#import-text").value).map((l) => ({ ...l, temperature: temp, source: "Import" }));
  if (!leads.length) { toast("Keine Leads erkannt"); return; }
  const res = Store.importLeads(leads);
  toast(`${res.added} importiert${res.skipped ? `, ${res.skipped} Duplikate übersprungen` : ""} ✅`);
  $("#import-text").value = ""; updateImportPreview();
  renderAll(); switchView("worklist");
}

/* ============================================================
   Vorlagen
   ============================================================ */
function renderTemplates() {
  const tpls = Store.getTemplates();
  const c = $("#template-list");
  if (!tpls.length) { c.innerHTML = `<div class="empty-state"><div class="big">✉️</div><h3>Keine Vorlagen</h3></div>`; return; }
  c.innerHTML = tpls.map((t) => `
    <div class="tpl-card">
      <div class="tpl-main">
        <div class="tpl-name">${esc(t.name)}</div>
        <div class="tpl-subject">${esc(t.subject)}</div>
        <div class="tpl-body">${esc(t.body).slice(0, 160)}${t.body.length > 160 ? "…" : ""}</div>
      </div>
      <div class="tpl-actions">
        <button class="btn btn-sm" data-edit="${t.id}">✏️</button>
        <button class="btn btn-sm btn-danger" data-del="${t.id}">🗑</button>
      </div>
    </div>`).join("");
  $$("[data-edit]", c).forEach((b) => b.addEventListener("click", () => editTemplate(b.dataset.edit)));
  $$("[data-del]", c).forEach((b) => b.addEventListener("click", () => { if (confirm("Vorlage löschen?")) { Store.deleteTemplate(b.dataset.del); renderTemplates(); toast("Gelöscht"); } }));
}
function editTemplate(id) {
  const t = id ? Store.getTemplates().find((x) => x.id === id) : null;
  $("#modal").innerHTML = `
    <div class="modal-head"><div class="mh-title">${t ? "Vorlage bearbeiten" : "Neue Vorlage"}</div><button class="x" id="modal-close">&times;</button></div>
    <div class="modal-body">
      <div class="field"><label>Name</label><input id="t-name" value="${esc(t?.name || "")}" placeholder="z. B. Kalt-Akquise" /></div>
      <div class="field"><label>Betreff</label><input id="t-subject" value="${esc(t?.subject || "")}" placeholder="Kurze Frage zu {{firma}}" /></div>
      <div class="field"><label>Nachricht</label><textarea id="t-body" style="min-height:200px" placeholder="Hallo {{vorname}}, …">${esc(t?.body || "")}</textarea></div>
      <p class="muted small">Platzhalter: {{vorname}} {{name}} {{firma}} {{position}} {{ort}}</p>
    </div>
    <div class="modal-foot"><button class="btn" id="t-cancel">Abbrechen</button><button class="btn btn-primary" id="t-save" style="margin-left:auto">Speichern</button></div>`;
  openOverlay();
  $("#modal-close").onclick = $("#t-cancel").onclick = closeModal;
  $("#t-save").onclick = () => {
    const name = $("#t-name").value.trim();
    if (!name) { toast("Bitte einen Namen eingeben"); return; }
    Store.saveTemplate({ id: t?.id, name, subject: $("#t-subject").value, body: $("#t-body").value });
    toast("Vorlage gespeichert"); closeModal(); renderTemplates();
  };
}

/* ============================================================
   CSV-Export
   ============================================================ */
function exportCSV() {
  const leads = Store.getLeads();
  if (!leads.length) { toast("Keine Leads"); return; }
  const cols = ["name", "company", "position", "email", "phone", "source", "temperature", "status", "createdAt"];
  const head = ["Name", "Firma", "Position", "E-Mail", "Telefon", "Quelle", "Temperatur", "Status", "Erstellt"];
  const e = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map((l) => cols.map((c) =>
    e(c === "createdAt" ? fmtDate(l.createdAt) : c === "temperature" ? Store.tempById(l.temperature).label : c === "status" ? Store.statusById(l.status).label : l[c])
  ).join(","));
  const csv = "﻿" + [head.map(e).join(","), ...rows].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  toast("CSV exportiert ⬇︎");
}

/* ============================================================
   Modal / Navigation
   ============================================================ */
function openOverlay() { $("#overlay").classList.add("open"); }
function closeModal() { $("#overlay").classList.remove("open"); }

const TITLES = { cockpit: "Cockpit", worklist: "Arbeitsliste", finder: "Lead-Finder", n8n: "n8n Versand", import: "Leads importieren", templates: "Mail-Vorlagen" };
function switchView(view) {
  state.view = view;
  $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  $("#view-title").textContent = TITLES[view];
  renderAll();
}

/** Alles neu rendern (inkl. aktive Listen). */
function renderAll() {
  renderStats(); renderFollowups(); renderHotlist();
  renderFilters(); renderWorklist();
  renderTemplates();
}
/** Hintergrund-Render ohne offenes Modal zu schließen. */
function renderBackground() { renderStats(); renderFollowups(); renderHotlist(); renderFilters(); renderWorklist(); }

/* ============================================================
   n8n-Anbindung (Cold-Mail-Versand per Webhook)
   ============================================================ */
const N8N_KEY = "leadcrm.n8n";
function n8nConfig() {
  try { return JSON.parse(localStorage.getItem(N8N_KEY)) || { url: "", followupUrl: "", auto: false, log: [] }; }
  catch { return { url: "", followupUrl: "", auto: false, log: [] }; }
}
function n8nSave(cfg) { localStorage.setItem(N8N_KEY, JSON.stringify(cfg)); }
function n8nLog(msg) {
  const cfg = n8nConfig();
  cfg.log = cfg.log || [];
  cfg.log.unshift({ at: Date.now(), msg });
  cfg.log = cfg.log.slice(0, 40);
  n8nSave(cfg);
  renderN8nLog();
}
function updateN8nState() {
  const el = $("#n8n-state"); if (!el) return;
  const cfg = n8nConfig();
  if (cfg.url) {
    el.innerHTML = `✅ verbunden${cfg.followupUrl ? " · Follow-up ✅" : " · Follow-up fehlt"}${cfg.auto ? " · Auto 🤖" : ""}`;
    el.style.color = "var(--success)";
  } else {
    el.textContent = "⚠️ noch keine Webhook-URL eingetragen";
    el.style.color = "var(--warning)";
  }
}
function renderN8nLog() {
  const el = $("#n8n-log"); if (!el) return;
  const cfg = n8nConfig();
  el.innerHTML = (cfg.log && cfg.log.length)
    ? cfg.log.map((e) => `<div class="fd-log-row"><span class="muted small">${new Date(e.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span> ${esc(e.msg)}</div>`).join("")
    : `<div class="muted small">Noch nichts gesendet.</div>`;
}

function leadPayload(l) {
  return {
    id: l.id, name: l.name, email: l.email, phone: l.phone,
    company: l.company, position: l.position, website: l.website,
    location: l.location, source: l.source, temperature: l.temperature, status: l.status,
  };
}

/** POST an n8n. Versucht normales JSON (mit Bestätigung),
 *  fällt bei CORS auf „fire-and-forget" zurück (Daten kommen trotzdem an). */
async function postN8n(url, data) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return { ok: r.ok, status: r.status };
  } catch (_) {
    try {
      await fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(data) });
      return { ok: true, status: "gesendet (ohne Bestätigung)" };
    } catch (e2) { return { ok: false, status: e2.message }; }
  }
}

/** Leads an n8n schicken. mode: "first" (Erstmail) | "followup" (Nachfass). */
async function pushToN8n(leads, mode = "first", opts = {}) {
  const cfg = n8nConfig();
  const url = mode === "followup" ? cfg.followupUrl : cfg.url;
  const label = mode === "followup" ? "Follow-up" : "Cold-Mail";
  if (!url) { toast(`Erst die ${label}-Webhook-URL eintragen`); switchView("n8n"); return; }
  // E-Mail ODER Website reicht – n8n holt die E-Mail notfalls von der Website
  const list = leads.filter((l) => l && (l.email || l.website));
  if (!list.length) { if (!opts.silent) toast("Keine Leads mit E-Mail oder Website dabei"); return; }
  let ok = 0, fail = 0;
  for (const l of list) {
    const res = await postN8n(url, leadPayload(l));
    if (res.ok) {
      ok++;
      const patch = { type: "mail", outcome: `${label} an n8n gesendet`, status: l.status === "offen" ? "kontaktiert" : l.status };
      // Erstmail -> Follow-up in 3 Tagen einplanen; gesendetes Follow-up -> nächstes in 7 Tagen
      patch.nextFollowUp = Date.now() + (mode === "followup" ? 7 : 3) * 86400000;
      Store.logActivity(l.id, patch);
    } else fail++;
  }
  n8nLog(`${ok} ${label}(s) an n8n gesendet${fail ? `, ${fail} fehlgeschlagen` : ""}`);
  if (!opts.silent) toast(`${ok} ${label} gesendet${fail ? ` (${fail} Fehler)` : " ✅"}`);
  renderAll();
}

/** Wird vom Lead-Finder nach dem Import aufgerufen (Auto-Versand). */
window.autoSendNewLeads = function (addedLeads) {
  const cfg = n8nConfig();
  if (cfg.auto && cfg.url && addedLeads && addedLeads.length) {
    pushToN8n(addedLeads, "first", { silent: true });
  }
};

function initN8n() {
  const cfg = n8nConfig();
  if ($("#n8n-url")) $("#n8n-url").value = cfg.url || "";
  if ($("#n8n-followup-url")) $("#n8n-followup-url").value = cfg.followupUrl || "";
  if ($("#n8n-auto")) $("#n8n-auto").checked = !!cfg.auto;
  renderN8nLog();
  updateN8nState();

  $("#n8n-save").onclick = () => {
    const c = n8nConfig();
    c.url = $("#n8n-url").value.trim();
    c.followupUrl = $("#n8n-followup-url").value.trim();
    n8nSave(c);
    updateN8nState();
    toast("Gespeichert ✅");
  };
  $("#n8n-auto").addEventListener("change", (e) => { const c = n8nConfig(); c.auto = e.target.checked; n8nSave(c); updateN8nState(); toast(e.target.checked ? "Auto-Versand an 🤖" : "Auto-Versand aus"); });
  $("#n8n-test").onclick = async () => {
    const url = $("#n8n-url").value.trim();
    if (!url) { toast("Bitte erst die Webhook-URL eintragen"); return; }
    const c = n8nConfig(); c.url = url; n8nSave(c);
    const to = (prompt("Test-Mail an welche Adresse?\n\nLeer lassen = nur die Verbindung testen (es wird KEINE Mail verschickt).\nEigene E-Mail eintragen = echte Test-Mail an dich selbst.", "") || "").trim();
    const res = await postN8n(url, { test: true, name: "Test Lead", company: "Test GmbH", email: to, source: "CRM-Test" });
    n8nLog(res.ok ? `🧪 Test ${to ? "an " + to : "(nur Verbindung)"} ausgelöst (${res.status})` : `🧪 Test fehlgeschlagen: ${res.status}`);
    toast(res.ok ? (to ? "Test-Mail ausgelöst 🧪" : "Verbindung getestet ✅") : "Test fehlgeschlagen");
  };
  $("#btn-n8n-bulk").onclick = () => {
    const list = filtered().filter((l) => l.email || l.website);
    if (!list.length) { toast("Keine sendbaren Leads in der aktuellen Liste"); return; }
    if (confirm(`${list.length} Lead(s) an n8n senden (Erstmail)?`)) pushToN8n(list, "first");
  };
  if ($("#btn-followup-due")) $("#btn-followup-due").onclick = () => {
    const list = Store.getLeads().filter((l) => followDue(l) && (l.email || l.website));
    if (!list.length) { toast("Keine fälligen Follow-ups mit E-Mail/Website"); return; }
    if (confirm(`${list.length} fällige(n) Lead(s) ein Follow-up schicken?`)) pushToN8n(list, "followup");
  };
  if ($("#btn-followup-backfill")) $("#btn-followup-backfill").onclick = backfillFollowups;
}

/** Trägt allen schon kontaktierten Leads ohne Termin rückwirkend ein
 *  Follow-up-Datum nach (letzter Kontakt + 3 Tage -> oft sofort fällig). */
function backfillFollowups() {
  const candidates = Store.getLeads().filter((l) => !l.nextFollowUp && (l.lastContact || l.status !== "offen"));
  if (!candidates.length) { toast("Keine Leads zum Nachtragen gefunden"); return; }
  if (!confirm(`${candidates.length} kontaktierte(n) Lead(s) ohne Termin ein Follow-up-Datum geben?\n\n(letzter Kontakt + 3 Tage – ältere werden sofort fällig)`)) return;
  candidates.forEach((l) => {
    const base = l.lastContact || l.createdAt;
    Store.updateLead(l.id, { nextFollowUp: base + 3 * 86400000 });
  });
  toast(`${candidates.length} Follow-ups nachgetragen ✅`);
  renderAll();
}

/* ============================================================
   Komplett-Backup & Wiederherstellung (alles in einer Datei)
   ============================================================ */
function exportBackup() {
  const backup = {
    app: "akquise-cockpit",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: JSON.parse(localStorage.getItem(STORE_KEY) || "{}"),          // Leads, Notizen, Vorlagen
    finder: JSON.parse(localStorage.getItem("leadcrm.finder") || "null"), // gespeicherte Suchen + Auto
    n8n: JSON.parse(localStorage.getItem("leadcrm.n8n") || "null"),     // Webhook-URL + Auto-Versand
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  a.download = `akquise-backup_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  a.click();
  const n = (backup.data.leads || []).length;
  toast(`Backup gespeichert 💾 (${n} Leads)`);
}

function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let backup;
    try { backup = JSON.parse(reader.result); }
    catch { toast("⚠️ Datei ist kein gültiges Backup"); return; }
    if (!backup || backup.app !== "akquise-cockpit" || !backup.data) {
      toast("⚠️ Das ist keine Akquise-Backup-Datei"); return;
    }
    const n = (backup.data.leads || []).length;
    if (!confirm(`Backup mit ${n} Leads wiederherstellen?\n\nAchtung: Deine aktuellen Daten in diesem Browser werden dadurch ersetzt.`)) return;
    localStorage.setItem(STORE_KEY, JSON.stringify(backup.data));
    if (backup.finder) localStorage.setItem("leadcrm.finder", JSON.stringify(backup.finder));
    if (backup.n8n) localStorage.setItem("leadcrm.n8n", JSON.stringify(backup.n8n));
    toast(`Wiederhergestellt ✅ (${n} Leads)`);
    renderAll();
    initN8n();
    // Finder-Ansicht auffrischen, falls geladen
    if (typeof fdRenderQueue === "function") { fdRenderQueue(); fdRenderLog(); }
  };
  reader.readAsText(file);
}

/* ---------- Wiring ---------- */
$$(".nav-item").forEach((n) => n.addEventListener("click", () => switchView(n.dataset.view)));
$("#btn-backup").onclick = exportBackup;
$("#restore-file").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) restoreBackup(f); e.target.value = ""; });
$("#btn-new-lead").onclick = newLead;
$("#btn-export").onclick = exportCSV;
$("#btn-new-template").onclick = () => editTemplate(null);
$("#btn-import").onclick = doImport;
$("#import-text").addEventListener("input", updateImportPreview);
$("#btn-paste-example").onclick = () => {
  $("#import-text").value = "Anna Schmidt, anna.schmidt@beispiel-gmbh.de, +49 151 11122233, Beispiel GmbH, Hamburg\nJonas Krüger; jonas@krueger-tech.de; +49 170 44455566; Krüger Tech; München\nMaria Lopez\tmaria@lopez-studio.de\t+49 160 99988877\tLopez Studio\tKöln";
  updateImportPreview();
};
$("#csv-file").addEventListener("change", (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { $("#import-text").value = String(reader.result || "").replace(/^[^\n]*name[^\n]*email[^\n]*\n/i, ""); updateImportPreview(); switchView("import"); };
  reader.readAsText(file);
});
$("#overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
$("#global-search").addEventListener("input", (e) => {
  state.search = e.target.value; renderWorklist();
  if (state.search && state.view !== "worklist") switchView("worklist");
});
window.addEventListener("storage", (e) => { if (e.key === STORE_KEY) renderAll(); });

// Einmalige Auto-Nachtragung: alten kontaktierten Leads ohne Termin ein
// Follow-up-Datum geben, damit sie unter "Follow-ups fällig" auftauchen.
(function autoMigrateFollowups() {
  if (localStorage.getItem("leadcrm.fu_migrated")) return;
  const leads = Store.getLeads();
  let n = 0;
  leads.forEach((l) => {
    if (!l.nextFollowUp && (l.lastContact || (l.status && l.status !== "offen"))) {
      Store.updateLead(l.id, { nextFollowUp: (l.lastContact || l.createdAt) + 3 * 86400000 });
      n++;
    }
  });
  localStorage.setItem("leadcrm.fu_migrated", "1");
  if (n > 0) setTimeout(() => toast(`${n} alte Follow-ups automatisch nachgetragen ✅`), 700);
})();

initN8n();
renderAll();
