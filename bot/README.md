# 🤖 Dachdecker-Chatbot (Flowise) – Übersicht

Notizen zum Chatflow, den DC Marketing & Automation als Demo nutzt.

## Was der Bot ist
Ein **digitaler Erstberater für einen Dachdeckerbetrieb** – freundlich, seriös,
keine Emojis, kurze Antworten (max. 5–7 Sätze).

## Was er tut
- Beantwortet Fragen zu **Leistungen, Ablauf, Region, Erreichbarkeit** (über eine Wissensdatenbank)
- Erkennt **Interesse / Leads** (Dachreparatur, Sanierung, Schaden, Notfall) und bietet aktiv eine Beratung an
- **Terminanbahnung**: fragt nach Name, Wunschdatum, Uhrzeit, Anliegen, Telefon & E-Mail
- **Notfall-Logik** bei Wasserschaden/Sturm → schnelle Kontaktaufnahme
- Bestätigt Termine **nicht** im Chat, sondern verweist auf E-Mail-Rückmeldung

## Was er bewusst NICHT tut
- Keine Preise / Kostenschätzungen
- Keine verbindlichen Zusagen oder Garantien
- Keine technischen Bauanleitungen
- Keine rechtlichen Aussagen
- Erfindet nichts außerhalb der Wissensbasis

## Eckdaten
- **Öffnungszeiten:** Mo–Fr, 7:00–18:00 Uhr
- **Modell:** OpenAI gpt-4o-mini
- **Bausteine:** Tool Agent, Wissensdatenbank (Document Store), Buffer Memory,
  Custom Tools (Termin/Lead anlegen), CurrentDateTime, OpenAI Moderation

## Zum Einbinden auf der Website fehlen noch (aus Flowise → „</> Embed / Share Chatbot")
- `chatflowid`
- `apiHost` (Adresse des Flowise-Servers)

Diese beiden Werte kommen in `landing.html` unten in den `Chatbot.init({...})`-Block.
