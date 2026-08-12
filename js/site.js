/* ============================================================
   DC Marketing & Automation – Site Interaktionen
   ============================================================ */

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Mobile Navigation ---------- */
const burger = $("#nav-burger");
const navLinks = $("#nav-links");
burger.addEventListener("click", () => navLinks.classList.toggle("open"));
$$("#nav-links a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

/* ---------- Reveal on Scroll ---------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        e.target.style.transitionDelay = `${(i % 4) * 70}ms`;
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 }
);
$$(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- Zähler-Animation ---------- */
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const dur = 1400;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  },
  { threshold: 0.6 }
);
$$("[data-count]").forEach((el) => counterObserver.observe(el));

/* ============================================================
   Hero-Chat: automatisch ablaufende Konversation (Loop)
   ============================================================ */
const heroBody = $("#hero-chat-body");

const heroScript = [
  { who: "user", text: "Guten Abend! Haben Sie am Samstag noch einen Termin frei?", time: "22:41" },
  { who: "bot", text: "Guten Abend 👋 Ja! Am Samstag sind noch <b>10:30</b> und <b>13:00 Uhr</b> frei. Soll ich Ihnen einen Termin reservieren?", time: "22:41" },
  { who: "user", text: "10:30 wäre perfekt 👍", time: "22:42" },
  { who: "bot", text: "Erledigt ✅ Ihr Termin am <b>Samstag um 10:30 Uhr</b> ist gebucht. Die Bestätigung ist bereits auf dem Weg in Ihr Postfach!", time: "22:42" },
];

function chatMsg(root, who, html, time) {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  const avatar =
    who === "bot"
      ? `<span class="msg-avatar"><img src="assets/img/dc-bot-icon.png" alt="" /></span>`
      : "";
  div.innerHTML = `${avatar}<p>${html}${time ? `<span class="time">${time}</span>` : ""}</p>`;
  root.appendChild(div);
  root.scrollTop = root.scrollHeight;
  return div;
}

function typingBubble(root) {
  const div = document.createElement("div");
  div.className = "msg bot";
  div.innerHTML = `<span class="msg-avatar"><img src="assets/img/dc-bot-icon.png" alt="" /></span><p class="typing"><i></i><i></i><i></i></p>`;
  root.appendChild(div);
  root.scrollTop = root.scrollHeight;
  return div;
}

async function heroLoop() {
  for (;;) {
    heroBody.innerHTML = "";
    await wait(700);
    for (const m of heroScript) {
      if (m.who === "bot") {
        const t = typingBubble(heroBody);
        await wait(1300);
        t.remove();
      } else {
        await wait(900);
      }
      chatMsg(heroBody, m.who, m.text, m.time);
      await wait(1500);
    }
    await wait(5200);
  }
}
heroLoop();

/* ============================================================
   Lead-Journey Animation
   ============================================================ */
const journey = $("#journey");
const journeyBar = $("#journey-bar");
const journeyFinal = $("#journey-final");
const journeyBtn = $("#journey-play");
const jsteps = $$(".jstep");
let journeyRunning = false;
let journeyPlayed = false;

async function playJourney() {
  if (journeyRunning) return;
  journeyRunning = true;
  journeyPlayed = true;
  journeyBtn.textContent = "⟳  Läuft …";
  jsteps.forEach((s) => s.classList.remove("on"));
  journeyFinal.classList.remove("on");
  journeyBar.style.width = "0%";
  await wait(500);
  for (let i = 0; i < jsteps.length; i++) {
    jsteps[i].classList.add("on");
    journeyBar.style.width = `${((i + 1) / jsteps.length) * 100}%`;
    await wait(1400);
  }
  journeyFinal.classList.add("on");
  journeyBtn.textContent = "↺  Nochmal abspielen";
  journeyRunning = false;
}

journeyBtn.addEventListener("click", playJourney);

const journeyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !journeyPlayed) {
        playJourney();
        journeyObserver.unobserve(journey);
      }
    });
  },
  { threshold: 0.35 }
);
journeyObserver.observe(journey);

/* ============================================================
   Chat-Widget: echtes, bedienbares Demo
   ============================================================ */
const widget = $("#widget");
const widgetBody = $("#widget-body");
const widgetChips = $("#widget-chips");
const widgetForm = $("#widget-form");
const widgetInput = $("#widget-input");
const launcher = $("#launcher");
const launcherBadge = $("#launcher-badge");

const FLOWS = {
  start: {
    text:
      "Willkommen 👋 Ich bin der <b>DC&nbsp;Assistent</b> – ein Chatbot, wie ihn auch Ihr Unternehmen haben könnte. Was möchten Sie wissen?",
    chips: ["Was kann ein Chatbot?", "Was ist Automatisierung?", "Was kostet das?", "Termin vereinbaren"],
  },
  "Was kann ein Chatbot?": {
    text:
      "Ein Chatbot beantwortet Kundenfragen <b>sofort – rund um die Uhr</b>. 🤖<br /><br />Er kennt Ihre Leistungen, Preise und Öffnungszeiten, sammelt Kontaktdaten, qualifiziert Interessenten und bucht sogar Termine. Genau wie ich – nur mit <b>Ihrem Logo, Ihren Farben und Ihren Inhalten</b>.",
    chips: ["Was ist Automatisierung?", "Was kostet das?", "Termin vereinbaren"],
  },
  "Was ist Automatisierung?": {
    text:
      "Automatisierung heißt: <b>Wiederkehrende Arbeit erledigt sich von selbst.</b> ⚙️<br /><br />Beispiel: Eine Anfrage kommt rein → sie landet automatisch im CRM → der Kunde bekommt sofort eine Bestätigung → ein Terminvorschlag geht raus. <b>0 Handgriffe für Sie.</b><br /><br />Scrollen Sie zur „Lead-Journey“ auf dieser Seite – dort sehen Sie das live! 👀",
    chips: ["Was kann ein Chatbot?", "Was kostet das?", "Termin vereinbaren"],
  },
  "Was kostet das?": {
    text:
      "Jedes Projekt wird <b>maßgeschneidert</b> – deshalb gibt es bei uns keine Preise von der Stange. 💶<br /><br />Im <b>kostenlosen Erstgespräch</b> analysieren wir Ihren Bedarf, und Sie erhalten ein klares, faires Angebot. Keine versteckten Kosten, versprochen.",
    chips: ["Termin vereinbaren", "Was kann ein Chatbot?", "Was ist Automatisierung?"],
  },
  "Termin vereinbaren": {
    text:
      "Sehr gern! 🎉 Schreiben Sie uns eine kurze E-Mail an <b>dennycherpak2005@gmail.com</b> – wir melden uns <b>innerhalb von 24 Stunden</b> mit Terminvorschlägen für Ihr kostenloses Erstgespräch.",
    chips: ["📩 E-Mail schreiben", "Was kann ein Chatbot?", "Was ist Automatisierung?"],
  },
  "📩 E-Mail schreiben": {
    action: () => {
      window.location.href =
        "mailto:dennycherpak2005@gmail.com?subject=Kostenloses%20Erstgespr%C3%A4ch%20%E2%80%93%20DC%20Marketing%20%26%20Automation";
    },
    text: "Ihr E-Mail-Programm öffnet sich gerade. 📮 Wir freuen uns auf Ihre Nachricht!",
    chips: ["Was kann ein Chatbot?", "Was ist Automatisierung?", "Was kostet das?"],
  },
  fallback: {
    text:
      "Gute Frage! 😊 In der <b>Vollversion</b> beantworte ich so etwas individuell mit KI – hier in der Demo zeige ich Ihnen die Highlights. Wählen Sie einfach eine Option:",
    chips: ["Was kann ein Chatbot?", "Was ist Automatisierung?", "Was kostet das?", "Termin vereinbaren"],
  },
};

let widgetStarted = false;
let widgetBusy = false;

function renderChips(chips) {
  widgetChips.innerHTML = "";
  chips.forEach((label, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.animationDelay = `${i * 90}ms`;
    b.addEventListener("click", () => handleUser(label));
    widgetChips.appendChild(b);
  });
}

async function botReply(flowKey) {
  const flow = FLOWS[flowKey] || FLOWS.fallback;
  widgetBusy = true;
  renderChips([]);
  const t = typingBubble(widgetBody);
  await wait(900 + Math.random() * 500);
  t.remove();
  chatMsg(widgetBody, "bot", flow.text);
  if (flow.action) flow.action();
  renderChips(flow.chips);
  widgetBusy = false;
}

function handleUser(text) {
  if (widgetBusy) return;
  chatMsg(widgetBody, "user", text.replace(/</g, "&lt;"));
  botReply(FLOWS[text] ? text : "fallback");
}

function openWidget() {
  widget.hidden = false;
  launcherBadge.style.display = "none";
  if (!widgetStarted) {
    widgetStarted = true;
    botReply("start");
  }
  widgetInput.focus();
}

function closeWidget() {
  widget.hidden = true;
}

launcher.addEventListener("click", () => (widget.hidden ? openWidget() : closeWidget()));
$("#widget-close").addEventListener("click", closeWidget);
$$("[data-open-chat]").forEach((btn) => btn.addEventListener("click", openWidget));

widgetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = widgetInput.value.trim();
  if (!text || widgetBusy) return;
  widgetInput.value = "";
  handleUser(text);
});

/* ---------- Footer Jahr ---------- */
$("#year").textContent = new Date().getFullYear();
