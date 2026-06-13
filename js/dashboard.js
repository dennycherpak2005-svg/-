/* ============================================================
   dashboard.js – UI-Logik des CRM-Dashboards
   ============================================================ */

Store.seedIfEmpty();

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const state = {
  view: "dashboard",
  search: "",
  stageFilter: "alle",
  openLeadId: null,
};

/* ---------- Helpers ---------- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function initials(name) {
  return (name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function avatarColor(str) {
  const colors = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0d9488"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function relTime(ts) {
  const diff = Date.now() - ts, m = 60000, h = 3600000, d = 86400000;
  if (diff < m) return "gerade eben";
  if (diff < h) return Math.floor(diff / m) + " Min.";
  if (diff < d) return Math.floor(diff / h) + " Std.";
  if (diff < d * 7) return Math.floor(diff / d) + " Tg.";
  return new Date(ts).toLocaleDateString("de-DE");
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

function filteredLeads() {
  let leads = Store.getLeads();
  if (state.stageFilter !== "alle") leads = leads.filter((l) => l.stage === state.stageFilter);
  if (state.search) {
    const q = state.search.toLowerCase();
    leads = leads.filter((l) =>
      [l.name, l.email, l.company, l.phone, l.source].join(" ").toLowerCase().includes(q)
    );
  }
  return leads;
}

/* ---------- Status-Pill / Avatar ---------- */
function stagePill(stageId) {
  const s = Store.stageById(stageId);
  return `<span class="status-pill" style="background:${s.color}1a;color:${s.color}">
    <span class="dot" style="background:${s.color}"></span>${s.label}</span>`;
}
function avatar(name) {
  return `<span class="avatar" style="background:${avatarColor(name)}">${initials(name)}</span>`;
}

/* ============================================================
   RENDER: Statistik-Karten
   ============================================================ */
function renderStats() {
  const leads = Store.getLeads();
  const total = leads.length;
  const day = 86400000;
  const newWeek = leads.filter((l) => Date.now() - l.createdAt < day * 7).length;
  const won = leads.filter((l) => l.stage === "gewonnen").length;
  const open = leads.filter((l) => !["gewonnen", "verloren"].includes(l.stage)).length;
  const closed = leads.filter((l) => ["gewonnen", "verloren"].includes(l.stage)).length;
  const rate = closed ? Math.round((won / closed) * 100) : 0;

  const cards = [
    { label: "Leads gesamt", value: total, sub: "in der Datenbank", ico: "👥", bg: "var(--primary-soft)", fg: "var(--primary)" },
    { label: "Neu (7 Tage)", value: newWeek, sub: "frische Anfragen", ico: "✨", bg: "var(--info-soft)", fg: "var(--info)" },
    { label: "Offen", value: open, sub: "in Bearbeitung", ico: "🔥", bg: "var(--warning-soft)", fg: "var(--warning)" },
    { label: "Gewonnen", value: won, sub: "abgeschlossen", ico: "🏆", bg: "var(--success-soft)", fg: "var(--success)" },
    { label: "Conversion", value: rate + "%", sub: "Gewinnquote", ico: "📈", bg: "var(--primary-soft)", fg: "var(--primary)" },
  ];

  $("#stat-cards").innerHTML = cards.map((c) => `
    <div class="stat">
      <div class="label">
        <span class="badge-ico" style="background:${c.bg};color:${c.fg}">${c.ico}</span>${c.label}
      </div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join("");
}

/* ============================================================
   RENDER: Tabelle (wiederverwendbar)
   ============================================================ */
function tableHTML(leads) {
  if (!leads.length) {
    return `<div class="empty-state">
      <div class="big">🗒️</div>
      <h3>Noch keine Leads</h3>
      <p>Neue Anfragen über das öffentliche Formular landen hier automatisch.</p>
    </div>`;
  }
  const rows = leads.map((l) => `
    <tr data-id="${l.id}">
      <td>
        <div class="cell-flex">
          ${avatar(l.name)}
          <div>
            <div class="lead-name">${esc(l.name || "Ohne Namen")}</div>
            <div class="lead-sub">${esc(l.email || "—")}</div>
          </div>
        </div>
      </td>
      <td>${esc(l.company || "—")}</td>
      <td><span class="src" style="font-size:11px;padding:2px 8px;border-radius:20px;background:var(--surface-2);color:var(--text-soft);font-weight:600">${esc(l.source)}</span></td>
      <td>${stagePill(l.stage)}</td>
      <td class="lead-sub">${relTime(l.createdAt)}</td>
    </tr>`).join("");
  return `<table>
    <thead><tr><th>Lead</th><th>Firma</th><th>Quelle</th><th>Status</th><th>Erstellt</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function bindTableRows(container) {
  $$("tr[data-id]", container).forEach((tr) =>
    tr.addEventListener("click", () => openLead(tr.dataset.id))
  );
}

function renderRecent() {
  const leads = Store.getLeads().slice(0, 6);
  const c = $("#recent-table");
  c.innerHTML = tableHTML(leads);
  bindTableRows(c);
}

function renderLeadsTable() {
  const c = $("#leads-table");
  c.innerHTML = tableHTML(filteredLeads());
  bindTableRows(c);
}

function renderStageFilter() {
  const leads = Store.getLeads();
  const chips = [{ id: "alle", label: "Alle", count: leads.length }].concat(
    Store.STAGES.map((s) => ({ id: s.id, label: s.label, count: leads.filter((l) => l.stage === s.id).length }))
  );
  $("#stage-filter").innerHTML = chips.map((c) =>
    `<button class="chip ${state.stageFilter === c.id ? "active" : ""}" data-stage="${c.id}">${c.label} · ${c.count}</button>`
  ).join("");
  $$("#stage-filter .chip").forEach((ch) =>
    ch.addEventListener("click", () => { state.stageFilter = ch.dataset.stage; renderLeadsTable(); renderStageFilter(); })
  );
}

/* ============================================================
   RENDER: Pipeline-Board (Drag & Drop)
   ============================================================ */
function renderPipeline() {
  const leads = filteredLeads();
  const board = $("#pipeline-board");
  board.innerHTML = Store.STAGES.map((s) => {
    const items = leads.filter((l) => l.stage === s.id);
    const cards = items.length
      ? items.map((l) => `
        <div class="card" draggable="true" data-id="${l.id}">
          <div class="name">${esc(l.name || "Ohne Namen")}</div>
          <div class="company">${esc(l.company || l.email || "—")}</div>
          <div class="meta">
            <span class="src">${esc(l.source)}</span>
            <span class="date">${relTime(l.createdAt)}</span>
          </div>
        </div>`).join("")
      : `<div class="empty-col">leer</div>`;
    return `<div class="column" data-stage="${s.id}">
      <h3><span class="dot" style="background:${s.color}"></span>${s.label}<span class="count">${items.length}</span></h3>
      ${cards}
    </div>`;
  }).join("");

  // Klick öffnet Detail
  $$(".card", board).forEach((card) => {
    card.addEventListener("click", () => openLead(card.dataset.id));
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", card.dataset.id);
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  $$(".column", board).forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      const lead = Store.getLead(id);
      if (lead && lead.stage !== col.dataset.stage) {
        Store.setStage(id, col.dataset.stage);
        toast(`„${lead.name}" → ${Store.stageById(col.dataset.stage).label}`);
        renderAll();
      }
    });
  });
}

/* ============================================================
   Lead Detail / Edit Modal
   ============================================================ */
function openLead(id) {
  const lead = Store.getLead(id);
  if (!lead) return;
  state.openLeadId = id;
  const s = Store.stageById(lead.stage);
  const notes = (lead.notes || []).slice().reverse();

  $("#modal").innerHTML = `
    <div class="modal-head">
      ${avatar(lead.name)}
      <div>
        <div style="font-size:18px;font-weight:700">${esc(lead.name || "Ohne Namen")}</div>
        <div style="color:var(--text-soft);font-size:13px">${esc(lead.company || "—")}</div>
      </div>
      <button class="x" id="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Status in der Pipeline</label>
        <select id="d-stage">
          ${Store.STAGES.map((st) => `<option value="${st.id}" ${st.id === lead.stage ? "selected" : ""}>${st.label}</option>`).join("")}
        </select>
      </div>

      <div class="detail-grid">
        <div class="detail-item"><div class="k">📧 E-Mail</div><div class="v">${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : "—"}</div></div>
        <div class="detail-item"><div class="k">📞 Telefon</div><div class="v">${lead.phone ? `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>` : "—"}</div></div>
        <div class="detail-item"><div class="k">🏢 Firma</div><div class="v">${esc(lead.company || "—")}</div></div>
        <div class="detail-item"><div class="k">💰 Budget</div><div class="v">${esc(lead.budget || "—")}</div></div>
        <div class="detail-item"><div class="k">🌐 Quelle</div><div class="v">${esc(lead.source)}</div></div>
        <div class="detail-item"><div class="k">📅 Erstellt</div><div class="v">${fmtDate(lead.createdAt)}</div></div>
      </div>

      <div class="notes">
        <h4>📝 Notizen & Verlauf</h4>
        <div id="notes-list">
          ${notes.length ? notes.map((n) => `
            <div class="note">
              ${n.kind === "anfrage" ? "💬 <b>Anfrage:</b> " : ""}${esc(n.text)}
              <div class="when">${fmtDate(n.at)} · ${relTime(n.at)}</div>
            </div>`).join("") : `<div style="color:var(--text-soft);font-size:13px">Noch keine Notizen.</div>`}
        </div>
        <div class="note-add">
          <input id="note-input" type="text" placeholder="Notiz hinzufügen und Enter drücken…" />
          <button class="btn btn-sm" id="note-add-btn">Hinzufügen</button>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="d-edit">✏️ Bearbeiten</button>
      <button class="btn btn-danger" id="d-delete" style="margin-left:auto">🗑 Löschen</button>
    </div>`;

  $("#overlay").classList.add("open");

  $("#modal-close").onclick = closeModal;
  $("#d-stage").onchange = (e) => { Store.setStage(id, e.target.value); toast("Status aktualisiert"); renderAll(); };
  $("#d-edit").onclick = () => editLead(id);
  $("#d-delete").onclick = () => {
    if (confirm(`„${lead.name}" wirklich löschen?`)) { Store.deleteLead(id); closeModal(); toast("Lead gelöscht"); renderAll(); }
  };
  const addNote = () => {
    const v = $("#note-input").value.trim();
    if (!v) return;
    Store.addNote(id, v);
    openLead(id); // neu rendern
    toast("Notiz gespeichert");
  };
  $("#note-add-btn").onclick = addNote;
  $("#note-input").addEventListener("keydown", (e) => { if (e.key === "Enter") addNote(); });
}

function closeModal() {
  $("#overlay").classList.remove("open");
  state.openLeadId = null;
}

/* ---------- Lead-Formular (neu / bearbeiten) ---------- */
function leadForm(lead) {
  const v = (k) => esc(lead?.[k] || "");
  return `
    <div class="modal-head">
      <div style="font-size:18px;font-weight:700">${lead ? "✏️ Lead bearbeiten" : "＋ Neuer Lead"}</div>
      <button class="x" id="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="row2">
        <div class="field"><label>Name *</label><input id="f-name" value="${v("name")}" placeholder="Max Mustermann" /></div>
        <div class="field"><label>Firma</label><input id="f-company" value="${v("company")}" placeholder="Muster GmbH" /></div>
      </div>
      <div class="row2">
        <div class="field"><label>E-Mail</label><input id="f-email" value="${v("email")}" placeholder="max@firma.de" /></div>
        <div class="field"><label>Telefon</label><input id="f-phone" value="${v("phone")}" placeholder="+49 …" /></div>
      </div>
      <div class="row2">
        <div class="field"><label>Quelle</label><input id="f-source" value="${esc(lead?.source || "Manuell")}" placeholder="z. B. Webformular" /></div>
        <div class="field"><label>Budget</label><input id="f-budget" value="${v("budget")}" placeholder="z. B. 5.000 €" /></div>
      </div>
      <div class="field"><label>Status</label>
        <select id="f-stage">
          ${Store.STAGES.map((st) => `<option value="${st.id}" ${st.id === (lead?.stage || "neu") ? "selected" : ""}>${st.label}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Nachricht / Notiz</label><textarea id="f-message" placeholder="Worum geht es?">${v("message")}</textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="f-cancel">Abbrechen</button>
      <button class="btn btn-primary" id="f-save" style="margin-left:auto">${lead ? "Speichern" : "Lead anlegen"}</button>
    </div>`;
}

function newLead() {
  $("#modal").innerHTML = leadForm(null);
  $("#overlay").classList.add("open");
  wireForm(null);
}
function editLead(id) {
  const lead = Store.getLead(id);
  $("#modal").innerHTML = leadForm(lead);
  $("#overlay").classList.add("open");
  wireForm(id);
}
function wireForm(id) {
  $("#modal-close").onclick = closeModal;
  $("#f-cancel").onclick = closeModal;
  $("#f-save").onclick = () => {
    const data = {
      name: $("#f-name").value, company: $("#f-company").value,
      email: $("#f-email").value, phone: $("#f-phone").value,
      source: $("#f-source").value || "Manuell", budget: $("#f-budget").value,
      stage: $("#f-stage").value, message: $("#f-message").value,
    };
    if (!data.name.trim()) { toast("Bitte einen Namen eingeben"); return; }
    if (id) { Store.updateLead(id, data); toast("Lead gespeichert"); }
    else { Store.addLead(data); toast("Neuer Lead angelegt ✨"); }
    closeModal();
    renderAll();
  };
}

/* ============================================================
   CSV-Export
   ============================================================ */
function exportCSV() {
  const leads = Store.getLeads();
  if (!leads.length) { toast("Keine Leads zum Exportieren"); return; }
  const cols = ["name", "company", "email", "phone", "source", "stage", "budget", "createdAt"];
  const head = ["Name", "Firma", "E-Mail", "Telefon", "Quelle", "Status", "Budget", "Erstellt"];
  const escCsv = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map((l) =>
    cols.map((c) => escCsv(c === "createdAt" ? fmtDate(l.createdAt) : c === "stage" ? Store.stageById(l.stage).label : l[c])).join(",")
  );
  const csv = "﻿" + [head.map(escCsv).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  toast("CSV exportiert ⬇︎");
}

/* ============================================================
   Navigation & Render-Orchestrierung
   ============================================================ */
const TITLES = { dashboard: "Dashboard", pipeline: "Pipeline", leads: "Alle Leads" };

function switchView(view) {
  state.view = view;
  $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  $("#view-title").textContent = TITLES[view];
  renderAll();
}

function renderAll() {
  renderStats();
  renderRecent();
  renderStageFilter();
  renderLeadsTable();
  renderPipeline();
}

/* ---------- Event-Wiring ---------- */
$$(".nav-item").forEach((n) => n.addEventListener("click", () => switchView(n.dataset.view)));
$("#btn-new-lead").onclick = newLead;
$("#btn-export").onclick = exportCSV;
$("#btn-export-2").onclick = exportCSV;
$("#overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

$("#global-search").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderLeadsTable();
  renderPipeline();
  if (state.search && state.view === "dashboard") switchView("leads");
});

// Live-Update, wenn das öffentliche Formular in einem anderen Tab einen Lead anlegt
window.addEventListener("storage", (e) => { if (e.key === STORE_KEY) renderAll(); });
// Live-Update innerhalb desselben Tabs: Store feuert "leadcrm:changed" nach jeder Änderung
window.addEventListener("leadcrm:changed", () => renderAll());

// los geht's
renderAll();
