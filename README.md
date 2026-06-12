# 🤖 Lead Dashboard – Chatbot-Automatisierung

Ein Dashboard, um Leads für dein **KI-/Chatbot-Automatisierungs-Business** (n8n,
Flowise) zu sammeln, **automatisch zu qualifizieren** und abzuarbeiten.

Die Kernidee: **Firmen ohne Chatbot + mit schlechter Erreichbarkeit = deine heißesten Leads.**
Genau das erkennt und scored das Dashboard automatisch.

## Was es kann

- **Leads aus mehreren Quellen** – Google Maps, Instagram, LinkedIn (via n8n) + manuell.
- **Automatische Qualifizierung** – analysiert die Website eines Leads und erkennt:
  - ob bereits ein **Chatbot / Live-Chat** läuft (Intercom, Drift, Crisp, Tawk.to,
    HubSpot, Tidio, ManyChat, Landbot, Botpress, Voiceflow u.v.m.)
  - die **Erreichbarkeit** (E-Mail, Telefon, WhatsApp, Live-Chat, Kontaktformular)
- **Lead-Scoring (0–100)** mit nachvollziehbaren Gründen und Tier (🔥 Heiß / 🌤 Warm / ❄️ Kalt).
- **Filtern & Suchen** nach Quelle, Status, Tier, „nur ohne Chatbot", Volltext.
- **Pipeline-Status** pro Lead: Neu → Kontaktiert → Geantwortet → Gewonnen / Verloren.
- **Deduplizierung** beim Import (per Website/E-Mail/Social/Name).

## Schnellstart

```bash
npm install
npm run dev      # http://localhost:3000
```

Im Dashboard auf **„Demo-Leads laden"** klicken, um direkt loszulegen, oder über
**„🔌 n8n verbinden"** die Webhook-URL holen.

Produktion:

```bash
npm run build && npm run start
```

## n8n / Flowise anbinden

Dein n8n-Workflow scraped die Leads und schickt sie per **HTTP POST** an den
Ingest-Webhook. Das Dashboard dedupliziert, qualifiziert und scored automatisch.

```
POST /api/ingest
Content-Type: application/json

[
  {
    "name": "Trattoria Bella Napoli",
    "source": "google_maps",       // google_maps | instagram | linkedin
    "industry": "Restaurant",
    "city": "München",
    "website": "bella-napoli.de",
    "email": "info@bella-napoli.de",
    "phone": "+49 89 1234567"
  }
]
```

Nur `name` ist Pflicht. Body kann ein einzelnes Objekt oder ein Array sein.

**Absichern (optional):** ENV `INGEST_TOKEN` setzen und als Header
`x-ingest-token` (oder Query `?token=`) mitsenden.

> ⚖️ Hinweis: LinkedIn & Instagram haben Nutzungsbedingungen zum Scraping.
> Nutze offizielle APIs bzw. zulässige Datenquellen.

## API-Überblick

| Endpoint | Methode | Zweck |
|---|---|---|
| `/api/leads` | GET | Alle Leads (nach Score sortiert) |
| `/api/leads` | POST | Lead(s) anlegen |
| `/api/leads/[id]` | PATCH | Lead bearbeiten / Status setzen |
| `/api/leads/[id]` | DELETE | Lead löschen |
| `/api/leads/[id]/enrich` | POST | Website analysieren (Chatbot + Erreichbarkeit) |
| `/api/ingest` | POST | Webhook für n8n/Flowise |
| `/api/seed` | POST | Demo-Daten laden |

## Scoring-Logik (Kurzfassung)

| Signal | Punkte |
|---|---|
| Kein Chatbot/Live-Chat | +45 |
| Hat bereits Chatbot | −30 |
| Sehr schlechte Erreichbarkeit (≤1 Kanal) | +25 |
| Kein WhatsApp & kein Live-Chat | +8 |
| E-Mail / Telefon vorhanden | +7 / +5 |
| Hat Website | +8 |
| Passende Zielbranche | +10 |

→ **≥70 = 🔥 Heiß, ≥40 = 🌤 Warm, sonst ❄️ Kalt** (geclamped auf 0–100).
Zielbranchen sind in `lib/scoring.ts` anpassbar.

## Tech-Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · JSON-Datastore
(`data/leads.json`, gitignored – bei Bedarf leicht gegen SQLite/Postgres tauschbar).

## Projektstruktur

```
app/
  page.tsx                 # Dashboard-Seite
  api/                     # REST-Endpunkte (leads, ingest, enrich, seed)
components/                # Dashboard-UI (Tabelle, Filter, Modals, Badges)
lib/
  types.ts                 # Datenmodell
  db.ts                    # JSON-Datastore (serialisierte Schreibzugriffe)
  service.ts               # Lead-Logik (anlegen, dedupe, update, enrich)
  scoring.ts               # Lead-Scoring
  enrich.ts                # Website-Analyse (Chatbot- & Erreichbarkeits-Erkennung)
  seed.ts                  # Demo-Daten
```
