import { Reachability } from "./types";

/**
 * Bekannte Chatbot-/Live-Chat-Widget-Signaturen. Wir erkennen sie an den
 * Skript-/Domain-Schnipseln, die die Anbieter ins HTML einbinden.
 */
const CHATBOT_SIGNATURES: { vendor: string; patterns: string[] }[] = [
  { vendor: "Intercom", patterns: ["widget.intercom.io", "intercomcdn", "intercomSettings"] },
  { vendor: "Drift", patterns: ["js.driftt.com", "drift.com/include"] },
  { vendor: "Crisp", patterns: ["client.crisp.chat", "$crisp"] },
  { vendor: "Tawk.to", patterns: ["embed.tawk.to", "tawk.to"] },
  { vendor: "Zendesk Chat", patterns: ["static.zdassets.com", "zopim", "ze-snippet"] },
  { vendor: "HubSpot Chat", patterns: ["js.hs-scripts.com", "js.usemessages.com", "hs-chat"] },
  { vendor: "LiveChat", patterns: ["cdn.livechatinc.com", "__lc.license"] },
  { vendor: "Tidio", patterns: ["code.tidio.co", "tidiochat"] },
  { vendor: "ManyChat", patterns: ["mychatbots", "manychat", "widget.manychat.com"] },
  { vendor: "Freshchat", patterns: ["wchat.freshchat.com", "fcWidget"] },
  { vendor: "Chatwoot", patterns: ["chatwoot", "sdk.js"] },
  { vendor: "Landbot", patterns: ["landbot.io", "landbot3-embed"] },
  { vendor: "Botpress", patterns: ["cdn.botpress.cloud", "botpressWebChat"] },
  { vendor: "Smartsupp", patterns: ["smartsuppchat", "_smartsupp"] },
  { vendor: "Userlike", patterns: ["userlike.com", "userlikeWidget"] },
  { vendor: "Olark", patterns: ["static.olark.com", "olark"] },
  { vendor: "Gorgias Chat", patterns: ["config.gorgias.chat", "gorgias-chat"] },
  { vendor: "Voiceflow", patterns: ["cdn.voiceflow.com", "voiceflow"] },
  { vendor: "Chatbase", patterns: ["chatbase.co", "chatbase"] },
  { vendor: "Kommunicate", patterns: ["kommunicate.io", "kommunicate"] },
];

const WHATSAPP_PATTERNS = ["wa.me/", "api.whatsapp.com", "whatsapp://", "web.whatsapp.com"];

function detectChatbot(html: string): { has: boolean; vendor: string | null } {
  const lower = html.toLowerCase();
  for (const sig of CHATBOT_SIGNATURES) {
    if (sig.patterns.some((p) => lower.includes(p.toLowerCase()))) {
      return { has: true, vendor: sig.vendor };
    }
  }
  return { has: false, vendor: null };
}

function detectReachability(html: string): Reachability {
  const lower = html.toLowerCase();
  const email = /mailto:/.test(lower) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(lower);
  const phone = /tel:/.test(lower) || /(\+?\d[\d\s/().-]{7,}\d)/.test(html);
  const whatsapp = WHATSAPP_PATTERNS.some((p) => lower.includes(p));
  const liveChat = detectChatbot(html).has;
  const contactForm =
    /<form[\s\S]*?<\/form>/.test(lower) &&
    (lower.includes("kontakt") || lower.includes("contact") || lower.includes("name=\"email\""));

  const channels = [email, phone, whatsapp, liveChat, contactForm].filter(Boolean).length;
  return { email, phone, whatsapp, liveChat, contactForm, channels };
}

export interface EnrichResult {
  hasChatbot: boolean;
  chatbotVendor: string | null;
  reachability: Reachability;
}

/**
 * Lädt die öffentliche Startseite und analysiert HTML auf Chatbot-Widget
 * + Erreichbarkeits-Signale. Wirft bei Netzwerk-/HTTP-Fehlern.
 */
export async function enrichWebsite(rawUrl: string): Promise<EnrichResult> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LeadDashboardBot/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const { has, vendor } = detectChatbot(html);
    return {
      hasChatbot: has,
      chatbotVendor: vendor,
      reachability: detectReachability(html),
    };
  } finally {
    clearTimeout(timeout);
  }
}
