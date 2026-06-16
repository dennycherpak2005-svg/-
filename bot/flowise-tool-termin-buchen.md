# 🛠️ Custom Tool: `termin_buchen` (alles in Flowise)

Die komplette Terminbuchung läuft **im Flowise-Chat** – ohne Website, ohne
externen Link. Der Bot fragt die 6 Angaben im Gespräch ab und übergibt sie
diesem Tool. Das Tool verarbeitet sie (optional an dein Backend) und gibt dem
Kunden eine Bestätigung zurück.

## So legst du es in Flowise an
1. Sidebar → **Tools** → **Create New Tool**.
2. **Tool Name:** `termin_buchen`
3. **Tool Description:**
   ```
   Bucht bzw. erfasst einen Beratungstermin oder Rückruf. Rufe dieses Tool auf,
   sobald du Name, Wunschdatum, Anliegen, Telefon und E-Mail des Kunden im Chat
   gesammelt hast. Erfinde keine Werte – frage fehlende Angaben vorher nach.
   ```
4. **Input Schema** – diese 6 Felder anlegen:

   | Property | Type | Required | Description |
   |----------|------|----------|-------------|
   | `name` | string | ✅ | Vollständiger Name des Kunden |
   | `datum` | string | ✅ | Wunschdatum, Format JJJJ-MM-TT |
   | `uhrzeit` | string | ❌ | Wunschuhrzeit, z. B. 14:00 |
   | `anliegen` | string | ✅ | Art des Anliegens, z. B. Dachreparatur |
   | `telefon` | string | ✅ | Telefonnummer des Kunden |
   | `email` | string | ✅ | E-Mail-Adresse des Kunden |

5. **JavaScript Function:** den Code unten einfügen.
6. Im Chatflow den **Custom Tool**-Node auf dieses Tool stellen.
   (Hier KEIN „Return Direct" – die KI soll nach dem Tool-Aufruf noch
   bestätigen können.)

## JavaScript Function (kompletter Code)

```javascript
/* ============================================================
   Custom Tool: termin_buchen
   Nimmt die 6 im Chat gesammelten Angaben entgegen, verarbeitet
   sie und gibt dem Kunden eine Bestätigung zurück.
   ============================================================ */

// Optional: deine n8n/Make/Zapier-URL eintragen, dann wird der
// Termin automatisch an dein Backend (Kalender/E-Mail) geschickt.
// Leer lassen = es wird nur eine Bestätigung im Chat ausgegeben.
const WEBHOOK_URL = "";

// 1) Angaben aus dem Chat einsammeln
const termin = {
  name:     name,
  datum:    datum,
  uhrzeit:  uhrzeit || "—",
  anliegen: anliegen,
  telefon:  telefon,
  email:    email,
  erstellt: new Date().toISOString()
};

// 2) Optional an dein Backend übermitteln (nur wenn URL gesetzt)
if (WEBHOOK_URL) {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(termin)
    });
  } catch (e) {
    return "Die Terminanfrage konnte gerade nicht übermittelt werden. "
      + "Bitte versuchen Sie es in einem Moment erneut oder rufen Sie uns direkt an.";
  }
}

// 3) Freundliche Bestätigung an den Kunden zurückgeben
return "Vielen Dank, " + name + "! Ihre Terminanfrage ist bei uns eingegangen:\n"
  + "• Datum: " + datum + (uhrzeit ? " um " + uhrzeit + " Uhr" : "") + "\n"
  + "• Anliegen: " + anliegen + "\n"
  + "• Kontakt: " + telefon + " / " + email + "\n\n"
  + "Wir melden uns zeitnah zur Bestätigung bei Ihnen. "
  + "(Öffnungszeiten: Mo–Fr, 7:00–18:00 Uhr)";
```

## Was im Hintergrund passiert
1. Kunde: „Ich brauche einen Termin.“
2. Bot fragt im Chat nach Name, Datum, (Uhrzeit), Anliegen, Telefon, E-Mail.
3. Sobald alles da ist, ruft die KI `termin_buchen` mit diesen Werten auf.
4. Das Tool verarbeitet die Daten (optional Webhook) und gibt die Bestätigung
   zurück, die der Bot dem Kunden anzeigt.

> Hinweis: `fetch` steht in Flowise (Node 18+) bereit. Falls deine Flowise-Version
> beim `fetch` meckert, trage in den **Tool-Dependencies** `node-fetch` nach.
