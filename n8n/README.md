# 🎵 n8n-Workflow – Schreibkraft Datenerfassung (Vinyl & CD)

Automatisierter Workflow für den Beruf **„Schreibkraft (m/w/d) Datenerfassung"**
(z. B. Stelle bei *Vinyl-diamonds*, Sasbach). Er bildet die Kernaufgabe nach:
**Schallplatten- & CD-Artikel erfassen, prüfen und in die Produktliste / den
Webshop einpflegen** – nur eben automatisiert.

## 📂 Datei
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
