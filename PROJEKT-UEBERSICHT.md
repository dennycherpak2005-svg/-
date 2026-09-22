# Akquise-CRM – Projekt-Übersicht

Kurzbeschreibung: Ein **rein clientseitiges** Lead-/Akquise-CRM (Vanilla HTML/CSS/JS,
kein Framework, kein Build-Schritt). Leads werden im Browser gespeichert, optional per
Firebase in die Cloud gespiegelt. Lead-Gewinnung über OpenStreetMap, Mailversand über
externe n8n-Webhooks. Deployed als statische Seite auf Netlify
(`velvety-sunburst-8b5d16`).

---

## 1. Ordnerstruktur

| Datei/Ordner | Zweck |
|---|---|
| `index.html` | Haupt-App (Single-Page). Enthält alle Ansichten: Cockpit, Arbeitsliste, Pipeline (Kanban), Lead-Finder, n8n-Versand, Import, Mail-Vorlagen. Lädt Firebase-SDK + die JS-Dateien. |
| `formular.html` | Öffentliches Inbound-Formular für warme Leads (eigenständige Seite). |
| `css/styles.css` | Komplettes Styling inkl. Dark Mode und Handy-/iPhone-Layout (Off-Canvas-Menü, responsive Grids). |
| `js/store.js` | **Datenschicht** (localStorage). Lead-Modell, CRUD, Dedupe, Mail-Vorlagen, Demo-Seed. |
| `js/dashboard.js` | **UI-Logik**: Rendering aller Ansichten, Statistik, Tagesziel, Lead-Detail, **n8n-Versand**, Backup/Restore, Tastatur-Kürzel. |
| `js/finder.js` | **Lead-Finder** über OpenStreetMap (Nominatim + Overpass), inkl. Auto-Modus. |
| `js/cloud.js` | **Firebase Cloud-Sync + Login** (E-Mail/Passwort). Additiv/optional – ohne Login läuft alles lokal weiter. |
| `n8n/crm-cold-mail.json` | n8n-Workflow-Vorlage: Erstmail (Webhook → Website/Impressum scrapen → Gmail senden). |
| `n8n/crm-followup.json` | n8n-Workflow-Vorlage: Follow-up-Mail. |
| `n8n/README.md` | Doku zu den n8n-Workflows. |
| `start.command` | Mac-Starter: `git`-Update + lokaler `python3 -m http.server 8000`. |
| `README.md` | Projekt-Readme. |

> Hinweis: Es gibt **keinen** `node_modules`-, `dist`-, `build`- oder `.netlify`-Ordner –
> das Projekt hat keine Abhängigkeiten und keinen Build.

---

## 2. Wo & wie werden Leads gespeichert?

**Primär: Browser-`localStorage`** (kein Supabase, keine SQL-Datenbank, keine Server-Datei).

localStorage-Schlüssel:

| Key | Inhalt |
|---|---|
| `leadcrm.v2` | **Hauptspeicher**: `{ leads: [...], templates: [...] }` |
| `leadcrm.finder` | Gespeicherte Finder-Suchen, Auto-Modus, Intervall, Log |
| `leadcrm.n8n` | n8n-Webhook-URLs (Erstmail + Follow-up), Auto-Flag, Log |
| `leadcrm.goal` | Tagesziel (Zahl) |
| `leadcrm.theme` | `light`/`dark` |
| `leadcrm.cloud.chunks` | interne Zählung der Firestore-Chunks (Sync) |
| `leadcrm.fu_migrated`, `leadcrm.dedupe1`, … | einmalige Migrations-Flags |

**Optional: Firebase Firestore** (Cloud-Spiegel, siehe `js/cloud.js`).
- localStorage bleibt der Arbeitsspeicher; Firestore ist ein Spiegel für die Geräte-Sync (Mac ↔ Handy).
- Firestore-Pfad: `users/{uid}/store/meta` (Vorlagen, n8n, goal, finder, Chunk-Anzahl) + `users/{uid}/store/chunk_0..N` (Leads in 150er-Blöcken wegen 1-MB-Dokumentlimit).
- Sync: lokale Änderung (`leadcrm:changed`) → entprellter Push; fremde Änderung → `onSnapshot` → Pull. Echo-Schutz über eine zufällige `writer`-ID.

**Lead-Datenmodell** (`store.js` → `normalizeLead`):
```
id, name, email, phone, company, position, website, location,
source, temperature ("kalt"|"warm"|"heiss"), status,
activities: [{ id, type, text, outcome, at }],
lastContact, nextFollowUp, createdAt, updatedAt
```

---

## 3. Lead-Finder – wie er funktioniert

Quelle: **OpenStreetMap**, komplett kostenlos und **ohne API-Key** (CORS-fähig, läuft im Browser).

1. **Branche → OSM-Tags** (feste Liste `BRANCHEN` in `finder.js`), z. B.
   Restaurant → `amenity=restaurant`, Friseur → `shop=hairdresser`, Fitnessstudio → `leisure=fitness_centre`.
2. **Ort → Bounding-Box** über **Nominatim** (`https://nominatim.openstreetmap.org/search`):
   Freitext-Stadt wird geocodiert → `boundingbox [south, north, west, east]`.
3. **Firmensuche → Overpass API**: Query sucht `node` + `way` mit dem Branchen-Tag **innerhalb der Bounding-Box**:
   ```
   [out:json][timeout:25];
   ( node["<k>"="<v>"](south,west,north,east);
     way ["<k>"="<v>"](south,west,north,east); );
   out center tags 120;
   ```
   Endpoints mit Fallback: `overpass-api.de`, `maps.mail.ru`, `overpass.kumi.systems` (2 Runden bei Überlast).

**Übergabe von Suchbegriff, Ort, Umkreis:**
- **Suchbegriff** = gewählte Branche (Dropdown) → OSM-Tag-Filter.
- **Ort** = Freitext-Feld → Nominatim → Bounding-Box.
- **Umkreis**: es gibt **keinen km-Radius**. Abgefragt wird die **gesamte Bounding-Box des Orts** laut Nominatim. „Umkreis" = geografische Ausdehnung der Stadt/des Orts, kein einstellbarer Radius. Trefferzahl ist durch `out ... 120` begrenzt.

**Auto-Modus**: gespeicherte Branche+Stadt-Kombis werden per `setInterval` (Intervall 5–60 Min) der Reihe nach abgefragt; neue Leads werden importiert (dedupliziert) und – falls in n8n aktiviert – automatisch versendet. Läuft nur, solange der Tab offen ist.

---

## 4. Woher kommen die Felder (Firma, Ansprechpartner, Email, Website, Ort, Branche)?

**Aus dem Finder** (`finder.js` → `elementToLead`, aus OSM-Tags):
| Feld | Quelle (OSM-Tag) |
|---|---|
| **Firma** (`company`/`name`) | `name` |
| **Email** | `email` / `contact:email` (bei OSM oft leer) |
| **Website** | `website` / `contact:website` |
| **Ort** (`location`) | `addr:street` + `addr:housenumber` + `addr:city` (sonst eingegebene Stadt) |
| **Telefon** | `phone` / `contact:phone` / `contact:mobile` |
| **Branche** | steckt im `source`-Feld, Format `"Finder: <Branche> · <Stadt>"` bzw. `"Auto: <Branche> · <Stadt>"` |
| **Ansprechpartner** | **liefert der Finder nicht** – `company == name`. Ein echter Personenname/Anrede entsteht erst im **n8n-Workflow** (Impressum-Scraping + Geschäftsführer-Erkennung), nicht in der App. |

**Andere Quellen**: manuell angelegte Leads (`source="Manuell"`), CSV/Text-Import (`source="Import"`), Inbound-Formular (`formular.html`). Feldbelegung identisch über `normalizeLead`.

> **Datenqualitäts-Hinweis:** Bei OSM-Daten können `company` und `website`/`email` auseinanderlaufen
> (Firmenname passt nicht zur hinterlegten Adresse). Das ist ein bekanntes Scraping-Problem der Quelle,
> kein Bug der App.

---

## 5. Button „An n8n" – Datenfluss

- **Zwei Auslöser**: Bulk-Button `#btn-n8n-bulk` (Arbeitsliste) und Einzel-Button `🚀 n8n` im Lead-Detail. Zusätzlich optionaler Auto-Versand neuer Finder-Leads.
- **Einzeln, nicht als Liste**: `pushToN8n` iteriert über die Leads und schickt **pro Lead einen eigenen POST** (`for`-Schleife, je ein `fetch`).
- **Payload** (`leadPayload`, JSON):
  ```json
  { "id","name","email","phone","company","position",
    "website","location","source","temperature","status" }
  ```
- **Ziel-Webhook**: `cfg.url` (Erstmail) bzw. `cfg.followupUrl` (Follow-up) aus `localStorage["leadcrm.n8n"]`.
  Die **konkreten URLs stehen NICHT im Code**, sondern nur im localStorage des Nutzers
  (produktiv: eine `…n8n.cloud/webhook/crm-cold-mail`- bzw. `/crm-followup`-URL).
- **Aktive Filter / Schutz vor dem Senden** (`pushToN8n`):
  1. nur Leads mit **E-Mail ODER Website**,
  2. **Opt-out**: Status `abgelehnt` („Kein Interesse") und `kunde` werden **nie** gesendet,
  3. **Doppelversand-Schutz**: Erstmail nur, wenn noch keine „Cold-Mail an n8n"-Aktivität existiert; Follow-up nur, wenn noch kein Follow-up gesendet wurde,
  4. Bulk fragt eine **Menge** ab (z. B. 20) und nimmt die ersten N der aktuell **gefilterten, noch nicht angeschriebenen** Leads.
- **Nach Erfolg**: Aktivität wird protokolliert, Status `offen → kontaktiert`, `nextFollowUp = +3 Tage` (bei Erstmail; beim Follow-up `null`).
- **Transport** (`postN8n`): zuerst normales JSON-`fetch`; bei CORS-Fehler Fallback auf `no-cors` „fire-and-forget" (Daten kommen an, ohne Bestätigung).

---

## 6. Wie wird der Kontaktstatus gespeichert?

Im Lead-Objekt selbst, Feld **`status`** (in `localStorage["leadcrm.v2"]`, gespiegelt in Firestore):

`offen` → `kontaktiert` → `geantwortet` → `termin` → `kunde` (oder `abgelehnt` = „Kein Interesse").

Zusätzlich `temperature` (`kalt`/`warm`/`heiss`). Geändert wird über `Store.updateLead` bzw.
`Store.logActivity`. Jede Aktion (Mail/Anruf/Notiz) wird in `activities[]` mit Zeitstempel abgelegt;
`lastContact` und ggf. `nextFollowUp` werden mitgesetzt. In der Pipeline-Ansicht ändert Drag & Drop
den Status direkt.

---

## 7. Umgebungsvariablen / API-Keys (nur Namen, keine Werte)

Es gibt **kein Backend** und **keine Server-Env-Vars** – die App ist rein clientseitig.

- **Firebase Web-Config** (`js/cloud.js`), Feldnamen: `apiKey`, `authDomain`, `projectId`,
  `storageBucket`, `messagingSenderId`, `appId`.
  → Firebase-Web-API-Keys sind **öffentlich/clientseitig by design**; der Schutz läuft über
  **Firestore-Security-Rules + Login**, nicht über Geheimhaltung des Keys.
  **Im Export sind diese Werte durch Platzhalter ersetzt.**
- **n8n-Webhook-URLs**: stehen **nicht im Code**, sondern im `localStorage["leadcrm.n8n"]`.
- **OpenStreetMap** (Nominatim/Overpass): **kein Key** nötig.
- **n8n-Workflow-JSON**: referenziert eine Gmail-OAuth-Credential nur über eine **interne n8n-ID**
  (kein Token/Secret im Code; im Export ebenfalls anonymisiert).

Keine `.env`-Datei, keine `sk-…`/Bearer-Tokens, keine Passwörter im Repo.

---

## 8. Deployment & Build

- **Build-Befehl: keiner.** Statische Dateien (Vanilla HTML/CSS/JS), kein Bundler, keine Abhängigkeiten.
- **Hosting: Netlify** (Projekt `velvety-sunburst-8b5d16`).
  Deploy-Weg: **Drag & Drop / ZIP-Upload** (Netlify Drop bzw. Projekt → *Deploys* → ZIP hineinziehen).
  **Kein Netlify-CLI**, **keine** aktive Git-Auto-Deploy-Integration.
- **Publish-Verzeichnis**: Projektwurzel (`index.html` liegt im Root der hochgeladenen ZIP).
- **Lokal (Mac)**: `start.command` → `git`-Update + `python3 -m http.server 8000`, Aufruf über `http://localhost:8000`.
- **Versionierung**: Git (GitHub), Arbeitsbranch `claude/lead-dashboard-crm-n2bgnb`.

---

*Erstellt für eine Code-Analyse. Enthält keine echten Schlüssel/Tokens/Passwörter.*
