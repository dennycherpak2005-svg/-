# 🤖 Lead Dashboard – Chatbot-Automatisierung

Dein **privates** Dashboard, um Leads für die **Kaltakquise** zu finden, automatisch
zu qualifizieren und abzuarbeiten. Gebaut für KI-/Chatbot-Automatisierungs-Business.

**Kernidee:** Firmen *ohne Chatbot* + mit *schlechter Erreichbarkeit* = deine heißesten Leads.

## Was es kann

- **🔍 Leads finden (Google Maps):** Branche + Stadt eingeben → das Dashboard holt
  über die Google Places API lokale Unternehmen (Name, Website, Telefon, Adresse).
  Ohne API-Key läuft alles im **Demo-Modus** mit Beispiel-Leads.
- **Automatische Qualifizierung:** analysiert jede Website und erkennt
  - ob bereits ein **Chatbot / Live-Chat** läuft (Intercom, Drift, Crisp, Tawk.to,
    HubSpot, Tidio, ManyChat, Landbot, Botpress, Voiceflow … 19 Anbieter)
  - die **Erreichbarkeit** (E-Mail, Telefon, WhatsApp, Live-Chat, Kontaktformular)
- **Lead-Scoring (0–100)** mit Gründen und Tier (🔥 Heiß / 🌤 Warm / ❄️ Kalt).
- **Kaltakquise-Pipeline:** Status pro Lead (Neu → Kontaktiert → Geantwortet → Gewonnen / Verloren).
- **Filtern & Suchen** nach Quelle, Status, Tier, „nur ohne Chatbot", Volltext.
- **🔒 Passwort-Login:** nur du kommst rein.

## Schnellstart (lokal am Mac)

```bash
npm install
npm run dev      # http://localhost:3000
```

Im Dashboard auf **„🔍 Leads finden"** → Branche + Stadt → Suchen. Ohne API-Key
kommen Demo-Leads; danach **„🔎 Alle anreichern"** für die Chatbot-/Erreichbarkeits-Prüfung.

## Konfiguration (`.env` anlegen, siehe `.env.example`)

| Variable | Zweck |
|---|---|
| `APP_PASSWORD` | Passwort-Schutz. Gesetzt = nur du kommst rein. Leer = offen (nur lokal sinnvoll). |
| `GOOGLE_MAPS_API_KEY` | Echte Google-Maps-Leads. Ohne Key → Demo-Modus. |
| `DATA_DIR` | (optional) Speicherort des JSON-Datastores. |
| `INGEST_TOKEN` | (optional) Token für den `/api/ingest` Webhook. |

**Google API-Key holen:** [console.cloud.google.com](https://console.cloud.google.com)
→ Projekt anlegen → **Places API (New)** aktivieren → API-Key erstellen → in `.env` eintragen.

## Online stellen (aufs Handy, nur du)

1. Auf **[vercel.com](https://vercel.com)** mit GitHub einloggen.
2. Repo `dennycherpak2005-svg/-` importieren.
3. Unter **Environment Variables** setzen: `APP_PASSWORD` (dein Passwort) und
   optional `GOOGLE_MAPS_API_KEY`.
4. **Deploy** → du bekommst eine URL wie `dein-dashboard.vercel.app`.
5. Im Handy-Browser öffnen → Passwort eingeben → fertig. Über „Zum Home-Bildschirm"
   liegt es wie eine echte App auf dem Handy.

> ℹ️ Auf Vercel liegt der einfache JSON-Speicher in `/tmp` (temporär – ideal zum
> Testen). Für dauerhaftes Speichern später eine echte DB anbinden (siehe `lib/db.ts`).

## API-Überblick

| Endpoint | Methode | Zweck |
|---|---|---|
| `/api/scrape` | POST | Google-Maps-Suche (`{ industry, city }`) |
| `/api/leads` | GET / POST | Leads lesen / anlegen |
| `/api/leads/[id]` | PATCH / DELETE | Lead bearbeiten / löschen |
| `/api/leads/[id]/enrich` | POST | Website analysieren (Chatbot + Erreichbarkeit) |
| `/api/seed` | POST | Demo-Daten laden |
| `/api/auth/login` · `/logout` | POST | An-/Abmelden |
| `/api/ingest` | POST | (optional) Webhook für externe Quellen |

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

→ **≥70 = 🔥 Heiß, ≥40 = 🌤 Warm, sonst ❄️ Kalt.** Zielbranchen in `lib/scoring.ts` anpassbar.

## Hinweis zum Scraping

Google Maps wird über die **offizielle Places API** abgefragt (sauber & legal).
Instagram/LinkedIn sind bewusst **nicht** integriert – direktes Scrapen verstößt
gegen deren Nutzungsbedingungen.

## Tech-Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · JSON-Datastore.
