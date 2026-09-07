/* ============================================================
   cloud.js – Firebase Cloud-Sync + Login  (additiv & optional)
   ------------------------------------------------------------
   - Hält die Leads geräteübergreifend synchron (Mac <-> Handy)
   - localStorage bleibt der lokale Arbeitsspeicher; die Cloud
     ist ein Spiegel. Ohne Login läuft alles ganz normal lokal.
   ============================================================ */
(function () {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyDdyqype8skOZH0gkmHRyv-GlmUe41ff-8",
    authDomain: "crm-akuise.firebaseapp.com",
    projectId: "crm-akuise",
    storageBucket: "crm-akuise.firebasestorage.app",
    messagingSenderId: "905765993309",
    appId: "1:905765993309:web:b34f30ecb52425778346b4",
  };

  // localStorage-Schlüssel, die synchronisiert werden
  const KEY_MAIN = "leadcrm.v2";      // Leads + Vorlagen
  const KEY_N8N = "leadcrm.n8n";      // Webhook-URLs
  const KEY_GOAL = "leadcrm.goal";    // Tagesziel
  const KEY_FINDER = "leadcrm.finder";// gespeicherte Suchen
  const CHUNK_COUNT_KEY = "leadcrm.cloud.chunks"; // zuletzt hochgeladene Chunk-Anzahl
  const CHUNK_SIZE = 150;             // Leads pro Firestore-Dokument (1MB-Limit)

  const myWriter = Math.random().toString(36).slice(2) + Date.now().toString(36);
  let auth = null, db = null, uid = null;
  let unsub = null, pushTimer = null;
  let applyingRemote = false; // true, während wir Cloud-Daten lokal einspielen

  /* ---------- Firebase starten ---------- */
  if (typeof firebase === "undefined" || !firebase.initializeApp) {
    console.warn("[cloud] Firebase-SDK nicht geladen – App läuft nur lokal.");
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
  } catch (e) {
    console.error("[cloud] Init fehlgeschlagen:", e);
    return;
  }

  /* ---------- kleine Helfer ---------- */
  const safeParse = (s) => { try { return s ? JSON.parse(s) : null; } catch (_) { return null; } };
  function setChip(text, cls) {
    const c = document.getElementById("cloud-chip");
    if (c) { c.textContent = text; c.className = "cloud-chip " + (cls || ""); }
  }

  /* ---------- UI (wird injiziert) ---------- */
  function injectUI() {
    const style = document.createElement("style");
    style.textContent = `
      .cloud-chip{font-size:12px;font-weight:600;padding:7px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;white-space:nowrap}
      .cloud-chip.ok{color:var(--success);border-color:var(--success)}
      .cloud-chip.off{color:var(--text-soft)}
      .cloud-chip.busy{color:var(--primary);border-color:var(--primary)}
      .cloud-auth{position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:1000;display:none;align-items:center;justify-content:center;padding:20px}
      .cloud-auth.show{display:flex}
      .cloud-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-lg);padding:28px 26px;width:100%;max-width:380px}
      .cloud-logo{font-size:22px;font-weight:800;margin-bottom:6px}
      .cloud-sub{font-size:14px;color:var(--text-soft);margin-bottom:20px}
      .cloud-card input{width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:10px;font-size:15px;margin-bottom:10px;background:var(--surface-2);color:var(--text)}
      .cloud-card .btn{width:100%;justify-content:center;margin-top:4px}
      .cloud-err{color:var(--danger);font-size:13px;min-height:18px;margin:2px 0 8px}
      .cloud-skip{display:block;text-align:center;margin-top:16px;font-size:13px;color:var(--text-soft);cursor:pointer;text-decoration:underline}
      .cloud-tabs{display:flex;gap:8px;margin-bottom:16px}
      .cloud-tab{flex:1;text-align:center;padding:9px;border-radius:10px;border:1px solid var(--border);cursor:pointer;font-size:14px;font-weight:600;background:var(--surface-2)}
      .cloud-tab.active{background:var(--primary);color:#fff;border-color:var(--primary)}
    `;
    document.head.appendChild(style);

    // Status-Chip in die Topbar (vor den Theme-Umschalter)
    const topbar = document.querySelector(".topbar");
    const themeBtn = document.getElementById("theme-toggle");
    if (topbar) {
      const chip = document.createElement("button");
      chip.id = "cloud-chip";
      chip.className = "cloud-chip off";
      chip.textContent = "☁️ …";
      chip.title = "Cloud-Sync – zum An-/Abmelden klicken";
      chip.onclick = onChipClick;
      topbar.insertBefore(chip, themeBtn || null);
    }

    // Login-Overlay
    const wrap = document.createElement("div");
    wrap.id = "cloud-auth";
    wrap.className = "cloud-auth";
    wrap.innerHTML = `
      <div class="cloud-card">
        <div class="cloud-logo">☁️ Akquise-Cockpit</div>
        <div class="cloud-sub">Melde dich an, damit deine Leads auf <b>Mac und Handy</b> synchron sind.</div>
        <div class="cloud-tabs">
          <div class="cloud-tab active" id="cloud-tab-login">Anmelden</div>
          <div class="cloud-tab" id="cloud-tab-register">Neu registrieren</div>
        </div>
        <input id="cloud-email" type="email" autocomplete="username" placeholder="E-Mail" />
        <input id="cloud-pw" type="password" autocomplete="current-password" placeholder="Passwort (mind. 6 Zeichen)" />
        <div class="cloud-err" id="cloud-err"></div>
        <button class="btn btn-primary" id="cloud-submit">Anmelden</button>
        <a class="cloud-skip" id="cloud-skip">Ohne Cloud offline weiterarbeiten</a>
      </div>`;
    document.body.appendChild(wrap);

    let mode = "login";
    const setMode = (m) => {
      mode = m;
      document.getElementById("cloud-tab-login").classList.toggle("active", m === "login");
      document.getElementById("cloud-tab-register").classList.toggle("active", m === "register");
      document.getElementById("cloud-submit").textContent = m === "login" ? "Anmelden" : "Konto erstellen";
      document.getElementById("cloud-err").textContent = "";
    };
    document.getElementById("cloud-tab-login").onclick = () => setMode("login");
    document.getElementById("cloud-tab-register").onclick = () => setMode("register");
    document.getElementById("cloud-skip").onclick = () => showAuth(false);
    document.getElementById("cloud-submit").onclick = () => submitAuth(mode);
    document.getElementById("cloud-pw").addEventListener("keydown", (e) => { if (e.key === "Enter") submitAuth(mode); });
  }

  function showAuth(show) {
    const el = document.getElementById("cloud-auth");
    if (el) el.classList.toggle("show", !!show);
  }

  function errText(code) {
    const map = {
      "auth/invalid-email": "Ungültige E-Mail-Adresse.",
      "auth/missing-password": "Bitte ein Passwort eingeben.",
      "auth/weak-password": "Passwort zu kurz (mind. 6 Zeichen).",
      "auth/email-already-in-use": "Diese E-Mail ist schon registriert – bitte auf „Anmelden“ wechseln.",
      "auth/invalid-credential": "E-Mail oder Passwort falsch.",
      "auth/wrong-password": "Passwort falsch.",
      "auth/user-not-found": "Kein Konto mit dieser E-Mail – bitte „Neu registrieren“.",
      "auth/operation-not-allowed": "E-Mail/Passwort ist in Firebase noch nicht aktiviert (Authentication → Sign-in).",
      "auth/network-request-failed": "Keine Verbindung – Internet prüfen.",
      "auth/too-many-requests": "Zu viele Versuche – kurz warten.",
    };
    return map[code] || ("Fehler: " + code);
  }

  async function submitAuth(mode) {
    const email = (document.getElementById("cloud-email").value || "").trim();
    const pw = document.getElementById("cloud-pw").value || "";
    const err = document.getElementById("cloud-err");
    err.textContent = "";
    if (!email || !pw) { err.textContent = "Bitte E-Mail und Passwort eingeben."; return; }
    document.getElementById("cloud-submit").disabled = true;
    try {
      if (mode === "register") await auth.createUserWithEmailAndPassword(email, pw);
      else await auth.signInWithEmailAndPassword(email, pw);
      // onAuthStateChanged übernimmt den Rest
    } catch (e) {
      err.textContent = errText(e.code || e.message);
    } finally {
      document.getElementById("cloud-submit").disabled = false;
    }
  }

  function onChipClick() {
    if (uid) {
      if (confirm("Von der Cloud abmelden?\n\n(Deine Leads bleiben lokal auf diesem Gerät gespeichert.)")) auth.signOut();
    } else {
      showAuth(true);
    }
  }

  /* ---------- Firestore-Referenzen ---------- */
  const metaRef = () => db.doc(`users/${uid}/store/meta`);
  const chunkRef = (i) => db.doc(`users/${uid}/store/chunk_${i}`);

  /* ---------- Sync: hochladen ---------- */
  async function pushNow() {
    if (!uid || applyingRemote) return;
    try {
      setChip("☁️ speichert…", "busy");
      const main = safeParse(localStorage.getItem(KEY_MAIN)) || { leads: [], templates: [] };
      const leads = Array.isArray(main.leads) ? main.leads : [];
      const chunks = [];
      for (let i = 0; i < leads.length; i += CHUNK_SIZE) chunks.push(leads.slice(i, i + CHUNK_SIZE));
      const newCount = chunks.length;

      const batch = db.batch();
      chunks.forEach((c, i) => batch.set(chunkRef(i), { leads: c }));
      batch.set(metaRef(), {
        templates: main.templates || [],
        n8n: safeParse(localStorage.getItem(KEY_N8N)),
        goal: localStorage.getItem(KEY_GOAL) || null,
        finder: safeParse(localStorage.getItem(KEY_FINDER)),
        chunkCount: newCount,
        leadCount: leads.length,
        writer: myWriter,
        at: Date.now(),
      });
      // veraltete Chunks löschen (falls Leads gelöscht wurden)
      const prev = parseInt(localStorage.getItem(CHUNK_COUNT_KEY) || "0", 10) || 0;
      for (let i = newCount; i < prev; i++) batch.delete(chunkRef(i));

      await batch.commit();
      localStorage.setItem(CHUNK_COUNT_KEY, String(newCount));
      setChip("☁️ synchron", "ok");
    } catch (e) {
      console.error("[cloud] push:", e);
      setChip("☁️ Fehler", "off");
    }
  }

  /* ---------- Sync: herunterladen ---------- */
  async function pullNow(meta) {
    try {
      applyingRemote = true;
      setChip("☁️ lädt…", "busy");
      const count = meta.chunkCount || 0;
      let leads = [];
      for (let i = 0; i < count; i++) {
        const snap = await chunkRef(i).get();
        if (snap.exists && Array.isArray(snap.data().leads)) leads = leads.concat(snap.data().leads);
      }
      localStorage.setItem(KEY_MAIN, JSON.stringify({ leads, templates: meta.templates || [] }));
      if (meta.n8n != null) localStorage.setItem(KEY_N8N, JSON.stringify(meta.n8n));
      if (meta.goal != null) localStorage.setItem(KEY_GOAL, String(meta.goal));
      if (meta.finder != null) localStorage.setItem(KEY_FINDER, JSON.stringify(meta.finder));
      localStorage.setItem(CHUNK_COUNT_KEY, String(count));
      if (typeof window.renderAll === "function") window.renderAll();
      setChip("☁️ synchron", "ok");
    } catch (e) {
      console.error("[cloud] pull:", e);
      setChip("☁️ Fehler", "off");
    } finally {
      applyingRemote = false;
    }
  }

  /* ---------- Sync starten/stoppen ---------- */
  function startSync() {
    if (unsub) return;
    unsub = metaRef().onSnapshot((snap) => {
      if (applyingRemote) return;
      if (!snap.exists) { pushNow(); return; }          // Cloud leer -> lokale Daten hochladen
      const meta = snap.data();
      if (meta.writer === myWriter) return;             // eigenes Echo ignorieren
      pullNow(meta);                                    // fremde Änderung -> herunterladen
    }, (e) => { console.error("[cloud] snapshot:", e); setChip("☁️ offline", "off"); });
  }
  function stopSync() { if (unsub) { unsub(); unsub = null; } }

  // Lokale Änderung -> entprellt hochladen
  function schedulePush() {
    if (!uid || applyingRemote) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 1200);
  }
  window.addEventListener("leadcrm:changed", schedulePush);
  // Sicherheitsnetz: beim Verlassen/Tab-Wechsel noch offene Änderungen sichern
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") pushNow(); });

  /* ---------- Auth-Zustand ---------- */
  auth.onAuthStateChanged((user) => {
    if (user) {
      uid = user.uid;
      showAuth(false);
      setChip("☁️ verbinde…", "busy");
      startSync();
    } else {
      uid = null;
      stopSync();
      setChip("☁️ anmelden", "off");
      showAuth(true);
    }
  });

  /* ---------- Los ---------- */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectUI);
  else injectUI();
})();
