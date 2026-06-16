/* ============================================================
   chatbot.js – Eigenes Chat-Widget mit In-Chat-Terminformular
   ------------------------------------------------------------
   • Funktioniert SOFORT im Demo-Modus (ohne Flowise) zum Vorzeigen.
   • Sobald du unten chatflowid + apiHost einträgst, nutzt er deine
     echte Flowise-KI (Dachdecker-Bot).
   • Wenn der Bot Interesse erkennt, erscheint ein Formular mit 6
     Feldern DIREKT im Chat (Name, Datum, Uhrzeit, Anliegen,
     Telefon, E-Mail). Die Anfrage wird ins CRM gespeichert.
   ============================================================ */
(function () {
  "use strict";

  /* ====== 1) HIER DEINE FLOWISE-DATEN EINTRAGEN ============== */
  const FLOWISE = {
    apiHost:    "https://DEINEN-FLOWISE-HOST",  // z. B. https://meinname.flowiseai.app
    chatflowid: "DEINE-CHATFLOW-ID"             // aus Flowise → "</> Embed"
  };
  // Solange die Platzhalter drinstehen, läuft der Bot im DEMO-MODUS.
  const LIVE = !FLOWISE.apiHost.includes("DEINEN-FLOWISE-HOST") &&
               !FLOWISE.chatflowid.includes("DEINE-CHATFLOW-ID");

  /* ====== 2) Texte / Konfiguration =========================== */
  const CFG = {
    title: "Ihr KI-Assistent",
    subtitle: "Dachdeckerbetrieb · meist in wenigen Minuten",
    welcome: "Hallo und herzlich willkommen! Ich bin der digitale Assistent. Wie kann ich Ihnen weiterhelfen?",
    quickReplies: ["Termin anfragen", "Ihre Leistungen", "Öffnungszeiten"],
    // Marker, den der Bot ausgeben kann, um das Formular einzublenden:
    formMarker: "[[TERMIN]]"
  };

  /* ====== 3) Styles =========================================== */
  const css = `
  #dccb, #dccb * { box-sizing: border-box; }
  #dccb { position: fixed; right: 20px; bottom: 20px; z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  #dccb-btn { width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
    background: linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; font-size: 26px;
    box-shadow: 0 12px 30px -8px rgba(79,70,229,.6); transition: transform .15s; }
  #dccb-btn:hover { transform: scale(1.06); }
  #dccb-win { position: absolute; right: 0; bottom: 76px; width: 380px; max-width: calc(100vw - 32px);
    height: 600px; max-height: calc(100vh - 110px); background:#fff; border-radius: 18px; overflow: hidden;
    box-shadow: 0 30px 70px -20px rgba(15,23,42,.5); display: none; flex-direction: column;
    animation: dccb-in .2s ease; }
  #dccb-win.open { display: flex; }
  @keyframes dccb-in { from{opacity:0; transform: translateY(10px);} to{opacity:1; transform:none;} }
  .dccb-head { background: linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; padding: 16px 18px;
    display: flex; align-items: center; gap: 12px; }
  .dccb-head .av { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,.22);
    display: grid; place-items: center; font-size: 20px; }
  .dccb-head .t { font-weight: 700; font-size: 15px; line-height: 1.2; }
  .dccb-head .s { font-size: 12px; opacity: .9; display:flex; align-items:center; gap:6px; }
  .dccb-head .s::before { content:""; width:7px; height:7px; border-radius:50%; background:#4ade80; }
  .dccb-head .tb { margin-left:auto; background:rgba(255,255,255,.22); border:none; color:#fff; font-size:12.5px; font-weight:700; cursor:pointer; border-radius:20px; padding:7px 12px; white-space:nowrap; }
  .dccb-head .tb:hover { background:rgba(255,255,255,.34); }
  .dccb-head .x { background:none; border:none; color:#fff; font-size:24px; cursor:pointer; line-height:1; opacity:.85; padding:0 2px; }
  .dccb-head .x:hover { opacity:1; }
  .dccb-body { flex:1; overflow-y:auto; padding: 16px; background:#f8fafc; display:flex; flex-direction:column; gap:10px; }
  .dccb-msg { max-width: 82%; padding: 10px 14px; border-radius: 16px; font-size: 14.5px; line-height:1.45; white-space: pre-wrap; word-wrap: break-word; }
  .dccb-msg.bot { background:#fff; border:1px solid #e2e8f0; border-bottom-left-radius:4px; align-self:flex-start; color:#0f172a; }
  .dccb-msg.user { background:#4f46e5; color:#fff; border-bottom-right-radius:4px; align-self:flex-end; }
  .dccb-msg.bot a { color:#4f46e5; font-weight:600; }
  .dccb-typing { align-self:flex-start; background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 16px; }
  .dccb-typing span { display:inline-block; width:7px; height:7px; margin:0 1px; background:#cbd5e1; border-radius:50%; animation: dccb-bounce 1.2s infinite; }
  .dccb-typing span:nth-child(2){ animation-delay:.2s; } .dccb-typing span:nth-child(3){ animation-delay:.4s; }
  @keyframes dccb-bounce { 0%,60%,100%{ transform:translateY(0); opacity:.5; } 30%{ transform:translateY(-5px); opacity:1; } }
  .dccb-quick { display:flex; flex-wrap:wrap; gap:8px; padding: 0 16px 12px; background:#f8fafc; }
  .dccb-quick button { border:1px solid #c7d2fe; background:#eef2ff; color:#4338ca; border-radius:20px;
    padding:7px 13px; font-size:13px; font-weight:600; cursor:pointer; }
  .dccb-quick button:hover { background:#e0e7ff; }
  .dccb-input { display:flex; gap:8px; padding:12px; border-top:1px solid #e2e8f0; background:#fff; }
  .dccb-input input { flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:11px 14px; font-size:14px; font-family:inherit; }
  .dccb-input input:focus { outline:none; border-color:#4f46e5; box-shadow:0 0 0 3px #eef2ff; }
  .dccb-input button { width:44px; height:44px; border:none; border-radius:12px; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; font-size:17px; cursor:pointer; }
  /* In-Chat Formular */
  .dccb-form { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:14px; align-self:stretch; }
  .dccb-form h4 { font-size:14px; font-weight:800; margin:0 0 4px; color:#0f172a; }
  .dccb-form .hint { font-size:12px; color:#64748b; margin-bottom:10px; }
  .dccb-form label { display:block; font-size:12px; font-weight:600; margin:8px 0 4px; color:#0f172a; }
  .dccb-form label .r { color:#db2777; }
  .dccb-form input, .dccb-form select, .dccb-form textarea { width:100%; border:1px solid #e2e8f0; border-radius:10px; padding:9px 11px; font-size:13.5px; font-family:inherit; }
  .dccb-form input:focus, .dccb-form select:focus, .dccb-form textarea:focus { outline:none; border-color:#4f46e5; box-shadow:0 0 0 3px #eef2ff; }
  .dccb-form textarea { resize:vertical; min-height:54px; }
  .dccb-form .two { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .dccb-form .send { width:100%; margin-top:12px; border:none; border-radius:10px; padding:11px; font-size:14px; font-weight:700; color:#fff; background:linear-gradient(135deg,#4f46e5,#7c3aed); cursor:pointer; }
  .dccb-form .priv { font-size:11px; color:#94a3b8; text-align:center; margin-top:8px; }
  @media (max-width:480px){ #dccb-win{ height: calc(100vh - 100px); } }
  `;

  /* ====== 4) DOM aufbauen ===================================== */
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "dccb";
  root.innerHTML = `
    <button id="dccb-btn" aria-label="Chat öffnen">💬</button>
    <div id="dccb-win" role="dialog" aria-label="Chat">
      <div class="dccb-head">
        <div class="av">🤖</div>
        <div>
          <div class="t">${CFG.title}</div>
          <div class="s">${CFG.subtitle}</div>
        </div>
        <button class="tb" id="dccb-termin-btn" title="Termin anfragen" aria-label="Termin anfragen">📅 Termin</button>
        <button class="x" id="dccb-close" aria-label="Schließen">×</button>
      </div>
      <div class="dccb-body" id="dccb-body"></div>
      <div class="dccb-quick" id="dccb-quick"></div>
      <form class="dccb-input" id="dccb-inputbar" autocomplete="off">
        <input id="dccb-text" placeholder="Schreiben Sie Ihre Frage…" />
        <button type="submit" aria-label="Senden">➤</button>
      </form>
    </div>`;
  document.body.appendChild(root);

  const win   = root.querySelector("#dccb-win");
  const body  = root.querySelector("#dccb-body");
  const quick = root.querySelector("#dccb-quick");
  const input = root.querySelector("#dccb-text");
  let started = false;
  let formOpen = false; // verhindert doppelte Formulare
  let sessionId = "web-" + Math.random().toString(36).slice(2);

  // Termin-Absicht erkennt das Widget SELBST – unabhängig von der KI.
  const INTEREST_RE = /(termin|beratung|rückruf|ruckruf|zurückrufen|reparatur|sanierung|schaden|undicht|sturm|wasser|angebot|kostenvoranschlag|interesse|eindeck|besichtig|vorbeikomm|anfrage)/i;

  /* ====== 5) Hilfsfunktionen ================================= */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  // einfache Markdown-Links [text](url) → <a>
  const linkify = (s) => esc(s).replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  const scroll = () => { body.scrollTop = body.scrollHeight; };

  function addMsg(text, who) {
    const d = document.createElement("div");
    d.className = "dccb-msg " + who;
    d.innerHTML = who === "bot" ? linkify(text) : esc(text);
    body.appendChild(d); scroll();
  }
  function showTyping() {
    const t = document.createElement("div");
    t.className = "dccb-typing"; t.id = "dccb-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(t); scroll(); return t;
  }
  function hideTyping() { const t = document.getElementById("dccb-typing"); if (t) t.remove(); }
  function setQuick(list) {
    quick.innerHTML = "";
    (list || []).forEach((q) => {
      const b = document.createElement("button");
      b.textContent = q;
      b.onclick = () => handleUser(q);
      quick.appendChild(b);
    });
  }

  /* ====== 6) Gesprächslogik ================================== */
  function start() {
    if (started) return; started = true;
    setTimeout(() => { addMsg(CFG.welcome, "bot"); setQuick(CFG.quickReplies); }, 250);
  }

  // Öffnet das Formular garantiert (egal ob KI oder nicht) – nur einmal.
  function openForm(intro) {
    if (formOpen) return;
    if (intro) addMsg(intro, "bot");
    renderForm();
  }

  function handleUser(text) {
    text = (text || "").trim(); if (!text) return;

    // Direkter Wunsch übers Formular (Button/Quick-Reply): nicht an die KI schicken.
    if (/^📅?\s*termin\s*anfragen$/i.test(text)) {
      addMsg(text, "user"); setQuick([]);
      openForm("Sehr gern! Bitte tragen Sie hier kurz Ihre Daten ein, dann melden wir uns zeitnah bei Ihnen.");
      return;
    }

    addMsg(text, "user");
    setQuick([]);
    const wantsForm = INTEREST_RE.test(text); // Widget erkennt Absicht selbst
    const typing = showTyping();
    botRespond(text).then((reply) => {
      hideTyping();
      let showForm = wantsForm;
      if (reply && reply.includes(CFG.formMarker)) {
        showForm = true;
        reply = reply.replace(CFG.formMarker, "").trim();
      }
      if (reply) addMsg(reply, "bot");
      if (showForm) openForm();
      else setQuick(["📅 Termin anfragen"]); // immer mit einem Klick erreichbar
    });
  }

  // Holt eine Antwort – live von Flowise oder im Demo-Modus.
  function botRespond(text) {
    if (LIVE) {
      return fetch(`${FLOWISE.apiHost}/api/v1/prediction/${FLOWISE.chatflowid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, overrideConfig: { sessionId } })
      })
        .then((r) => r.json())
        .then((d) => d.text || d.answer || "Entschuldigung, da ist etwas schiefgelaufen.")
        .catch(() => "Verbindung zur KI fehlgeschlagen. Bitte später erneut versuchen.");
    }
    // ---- DEMO-MODUS (ohne Flowise) ----
    return new Promise((resolve) => {
      const t = text.toLowerCase();
      const interest = /(termin|beratung|rückruf|reparatur|sanierung|schaden|undicht|sturm|wasser|angebot|interesse|dach|eindeck)/.test(t);
      let r;
      if (/öffnung|geöffnet|uhrzeit|wann.*(auf|da)/.test(t)) {
        r = "Unsere Öffnungszeiten sind:\n- Montag bis Freitag\n- 7:00 bis 18:00 Uhr\n\nMöchten Sie einen Beratungstermin anfragen?";
        setTimeout(() => setQuick(["Termin anfragen"]), 600);
      } else if (/leistung|service|angebot|machen|bieten/.test(t) && !interest) {
        r = "Wir bieten unter anderem Dachreparatur, Dachsanierung, Neueindeckung, Wartung und einen Notdienst an. Soll ich Ihnen einen Beratungstermin anbieten?";
        setTimeout(() => setQuick(["Termin anfragen"]), 600);
      } else if (interest) {
        r = "Sehr gern! Dafür wäre eine kurze persönliche Beratung sinnvoll. Bitte tragen Sie Ihre Daten ein, dann melden wir uns zeitnah bei Ihnen:" + " " + CFG.formMarker;
      } else {
        r = "Dazu liegen mir aktuell keine Detailinformationen vor. Gerne klären wir das persönlich mit Ihnen – möchten Sie einen Beratungstermin anfragen?";
        setTimeout(() => setQuick(["Termin anfragen"]), 600);
      }
      setTimeout(() => resolve(r), 700);
    });
  }

  /* ====== 7) In-Chat Formular ================================ */
  function renderForm() {
    formOpen = true;
    setQuick([]);
    const wrap = document.createElement("div");
    wrap.className = "dccb-form";
    const today = new Date().toISOString().split("T")[0];
    wrap.innerHTML = `
      <h4>📅 Beratungstermin anfragen</h4>
      <div class="hint">Öffnungszeiten: Mo–Fr, 7:00–18:00 Uhr</div>
      <form id="dccb-termin">
        <label>Name <span class="r">*</span></label>
        <input name="name" required placeholder="Max Mustermann" />
        <div class="two">
          <div>
            <label>Wunschdatum <span class="r">*</span></label>
            <input name="datum" type="date" min="${today}" required />
          </div>
          <div>
            <label>Uhrzeit</label>
            <input name="uhrzeit" type="time" min="07:00" max="18:00" step="900" />
          </div>
        </div>
        <label>Anliegen <span class="r">*</span></label>
        <select name="anliegen" required>
          <option value="" disabled selected>Bitte auswählen…</option>
          <option>Dachreparatur</option>
          <option>Dachsanierung</option>
          <option>Neueindeckung</option>
          <option>Wartung / Dachcheck</option>
          <option>Notfall / Sturm- oder Wasserschaden</option>
          <option>Allgemeine Beratung</option>
          <option>Sonstiges</option>
        </select>
        <div class="two">
          <div>
            <label>Telefon <span class="r">*</span></label>
            <input name="phone" required placeholder="+49 …" />
          </div>
          <div>
            <label>E-Mail <span class="r">*</span></label>
            <input name="email" type="email" required placeholder="max@mail.de" />
          </div>
        </div>
        <label>Nachricht (optional)</label>
        <textarea name="nachricht" placeholder="Kurz Ihr Anliegen…"></textarea>
        <button class="send" type="submit">Termin anfragen →</button>
        <div class="priv">🔒 Ihre Angaben werden vertraulich behandelt.</div>
      </form>`;
    body.appendChild(wrap); scroll();

    wrap.querySelector("#dccb-termin").addEventListener("submit", (e) => {
      e.preventDefault();
      formOpen = false; // weitere Anfragen wieder möglich
      const v = Object.fromEntries(new FormData(e.target).entries());

      // Ins CRM speichern (falls store.js eingebunden ist)
      const details =
        `Anliegen: ${v.anliegen}\n` +
        `Wunschtermin: ${v.datum}${v.uhrzeit ? " um " + v.uhrzeit + " Uhr" : ""}` +
        (v.nachricht ? `\nNachricht: ${v.nachricht}` : "");
      try {
        if (window.Store && Store.addLead) {
          Store.addLead({ name: v.name, email: v.email, phone: v.phone,
            message: details, source: "Chatbot – Terminanfrage", stage: "neu" });
        }
      } catch (_) {}

      // Formular durch Zusammenfassung ersetzen
      wrap.innerHTML =
        `<h4>✅ Anfrage gesendet</h4>` +
        `<div class="hint" style="margin-top:6px">` +
        `<b>${esc(v.name)}</b><br>${esc(v.anliegen)}<br>` +
        `${esc(v.datum)}${v.uhrzeit ? " um " + esc(v.uhrzeit) + " Uhr" : ""}<br>` +
        `${esc(v.phone)} · ${esc(v.email)}</div>`;
      scroll();

      // In LIVE-Modus die Daten an den Bot/Backend übergeben (für n8n etc.)
      if (LIVE) {
        const summary = `Terminanfrage über Formular: Name=${v.name}; Datum=${v.datum}; Uhrzeit=${v.uhrzeit || "-"}; Anliegen=${v.anliegen}; Telefon=${v.phone}; E-Mail=${v.email}; Nachricht=${v.nachricht || "-"}`;
        const typing = showTyping();
        botRespond(summary).then((reply) => { hideTyping(); if (reply) addMsg(reply.replace(CFG.formMarker, "").trim(), "bot"); });
      } else {
        setTimeout(() => addMsg("Vielen Dank für Ihre Anfrage! Bitte prüfen Sie Ihre E-Mails – dort erhalten Sie zeitnah eine Terminbestätigung oder eine Rückmeldung.", "bot"), 600);
      }
    });
  }

  /* ====== 8) Events ========================================== */
  root.querySelector("#dccb-btn").onclick = () => { win.classList.toggle("open"); start(); if (win.classList.contains("open")) input.focus(); };
  root.querySelector("#dccb-close").onclick = () => win.classList.remove("open");
  // Fester Termin-Button im Header → Formular immer mit einem Klick
  root.querySelector("#dccb-termin-btn").onclick = () => {
    start();
    openForm("Sehr gern! Bitte tragen Sie hier kurz Ihre Daten ein, dann melden wir uns zeitnah bei Ihnen.");
  };
  root.querySelector("#dccb-inputbar").addEventListener("submit", (e) => {
    e.preventDefault(); const t = input.value; input.value = ""; handleUser(t);
  });
})();
