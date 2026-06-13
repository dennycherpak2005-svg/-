# 🎵 n8n-Workflow – Schreibkraft Datenerfassung (Vinyl & CD)

Automatisierter Workflow für den Beruf **„Schreibkraft (m/w/d) Datenerfassung"**
(z. B. Stelle bei *Vinyl-diamonds*, Sasbach). Er bildet die Kernaufgabe nach:
**Schallplatten- & CD-Artikel erfassen, prüfen und in die Produktliste / den
Webshop einpflegen** – nur eben automatisiert.

## 📂 Dateien
- `schreibkraft-datenerfassung.json` → Basis-Workflow (Regel-basiert, ohne KI).
- `schreibkraft-datenerfassung-ki-agent.json` → **KI-Agent-Version** (Claude Opus 4.8 + Discogs), erfasst Artikel **und schreibt die Werbeanzeige** – genau die Aufgabe aus der Indeed-Anzeige.

---

## 🤖 KI-Agent-Version (empfohlen für die Demo)

Datei: `schreibkraft-datenerfassung-ki-agent.json`

Die Anzeige verlangt *„Erstellung und Einbinden von Schallplatten- und CD-[Artikeln] und Werbeanzeigen"*. Diese Version bildet beides ab:

1. 📥 **Eingang** – EAN/Barcode **oder** freier Text per POST.
2. 🤖 **KI-Agent (Claude Opus 4.8)** – ermittelt einen sauberen Datensatz, verifiziert ihn über das **Discogs-Tool**, schreibt eine **Produktbeschreibung + kurze Werbeanzeige** und gibt strukturiertes JSON zurück. Unsichere Felder werden mit `pruefen_noetig = JA` markiert (Schutz vor Halluzinationen → kurzer Mensch-Check).
3. 🗂️ **Google Sheet** – speichert inkl. Spalten `Werbeanzeige` und `Prüfen?`.

**Einrichtung:** Import → Credentials für **Anthropic**, **Google Sheets** verbinden, **Discogs-Token** und **Sheet-ID** eintragen.

**Test:**
```bash
curl -X POST https://DEINE-N8N-URL/webhook/datenerfassung-ki \
  -H "Content-Type: application/json" \
  -d '{ "eingabe": "EAN 5099749197121, Zustand vg+, Preis ca. 25€" }'
```

---

## 🧱 Basis-Workflow (ohne KI)
`schreibkraft-datenerfassung.json` → in n8n importierbar.

## 🔄 Was der Workflow macht

| Schritt | Node | Aufgabe |
|--------:|------|---------|
| 1 | 📥 **Datenerfassung – Eingang** | Nimmt Artikeldaten per Formular/HTTP-POST entgegen (Webhook) |
| 2 | 🧹 **Felder normalisieren** | Trimmt Texte, vereinheitlicht Format & Zustand, wandelt Preis in Zahl, prüft EAN, erzeugt eine eindeutige **SKU** |
| 3 | ✅ **Pflichtfelder vorhanden?** | Prüft, ob Künstler, Titel & Preis ausgefüllt sind |
| 4a | 🗂️ **In Produktliste speichern** | Hängt eine Zeile an ein Google Sheet an |
| 4b | 📧 **Bestätigung an Team** | Schickt eine Übersicht des neuen Artikels per E-Mail |
| 4c | ✔️ **Antwort: Erfolg** | Gibt `201` + SKU zurück |
| 5 | ✖️ **Antwort: Fehler** | Gibt bei fehlenden Pflichtfeldern `400` + Liste zurück |

## ⚙️ Einrichtung (einmalig)

1. In n8n: **Workflows → Import from File** → `schreibkraft-datenerfassung.json` wählen.
2. **Google Sheets** Credential verbinden und im Node *„In Produktliste speichern"*
   die `HIER_GOOGLE_SHEET_ID_EINTRAGEN` durch deine Sheet-ID ersetzen.
   Tabellenblatt heißt `Produktliste` mit den Spalten:
   `SKU | Künstler | Titel | Format | Zustand | Label | Jahr | EAN | Preis (€) | Bestand | Beschreibung | Erfasst von | Erfasst am`
3. **Gmail** Credential verbinden und im Node *„Bestätigung an Team"* die
   Empfänger-Adresse anpassen.
4. Workflow **aktivieren**.

## 🧪 Test (Beispiel-Request)

```bash
curl -X POST https://DEINE-N8N-URL/webhook/datenerfassung \
  -H "Content-Type: application/json" \
  -d '{
    "kuenstler": "miles davis",
    "titel": "Kind of Blue",
    "format": "LP",
    "zustand": "vg+",
    "label": "Columbia",
    "jahr": "1959",
    "ean": "5099749197121",
    "preis": "24,90",
    "bestand": 3,
    "beschreibung": "Reissue 180g, top Zustand",
    "erfasst_von": "Anna"
  }'
```

Antwort bei Erfolg:
```json
{ "status": "ok", "message": "Artikel erfasst", "sku": "VC-VIN-2026-AB12C" }
```

## 💡 Erweiterungsideen
- Statt Google Sheets an **Airtable**, **Notion** oder eine **MySQL/Postgres**-DB anbinden.
- Direktes Anlegen im Webshop (**Shopify / WooCommerce / Discogs**) per HTTP-Node.
- **Dubletten-Prüfung** über die EAN vor dem Speichern.
- Anbindung an das vorhandene Lead-/CRM-Formular dieses Repos über denselben Webhook.
