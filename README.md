# 📈 Lead CRM – Dashboard

Ein leichtgewichtiges Lead-Management-/CRM-System in **reinem HTML, CSS & JavaScript**.
Kein Build, keine Abhängigkeiten, kein Server nötig – einfach im Browser öffnen.

## ✨ Funktionen

- **Demo-Landingpage** (`landing.html`) – Beispiel-Website mit integriertem **KI-Chatbot (Flowise)** zum Vorzeigen in Cold-Mails. Zeigt Vorteile, Chatbot-Showcase, Ablauf, FAQ, Impressum & Datenschutz. CTA führt direkt aufs Formular. Ehrlich als „Live-Demo" gekennzeichnet (keine erfundenen Kundenstimmen).
- **Öffentliches Lead-Formular** (`formular.html`) – neue Anfragen landen automatisch im CRM
- **Dashboard** mit Live-Statistiken (Leads gesamt, neu, offen, gewonnen, Conversion-Rate)
- **Pipeline-Board** mit 6 Stufen und **Drag & Drop** (Neu → Kontaktiert → Qualifiziert → Angebot → Gewonnen/Verloren)
- **Lead-Tabelle** mit Suche und Status-Filter
- **Detailansicht** je Lead: bearbeiten, Status ändern, **Notizen & Verlauf**, löschen
- **Manuelles Anlegen** von Leads im Dashboard
- **CSV-Export** aller Leads
- **Speicherung lokal im Browser** (`localStorage`) – beim ersten Start mit Beispieldaten befüllt
- Live-Synchronisation zwischen offenen Tabs

## 🚀 Loslegen

Einfach die Dateien öffnen:

```
landing.html    → Demo-Landingpage mit KI-Chatbot (für Cold-Mail-Links)
index.html      → das CRM-Dashboard
formular.html   → das öffentliche Lead-Formular
```

> 💡 **Tipp für Cold Mail:** Verlinke in deinen Mails auf `landing.html`. Empfänger
> sehen dann ein lebendiges Beispiel inkl. funktionierendem KI-Chatbot – „so könnte
> eure Seite aussehen". Ersetze vorher alle Platzhalter in eckigen Klammern `[…]`
> durch deine echten Daten.

### 🤖 Flowise-Chatbot einbinden

Der Chatbot ist in `landing.html` bereits vorbereitet (unten im `<script type="module">`):

1. In **Flowise** deinen Chatflow öffnen → **Embed / „</> Share Chatbot"**.
2. Von dort **`chatflowid`** und **`apiHost`** kopieren und in `landing.html`
   die Platzhalter `DEINE-CHATFLOW-ID` und `https://DEINEN-FLOWISE-HOST` ersetzen.
3. Speichern – der Chat erscheint automatisch unten rechts. Farben & Begrüßung
   sind schon passend zur Seite eingestellt.

Doppelklick auf `index.html` genügt. Optional lokal mit einem kleinen Webserver:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## 🗂 Projektstruktur

```
index.html        Dashboard (Stats, Pipeline, Lead-Tabelle, Detail-Modal)
formular.html     Öffentliches Lead-Eingangsformular
css/styles.css    Styling
js/store.js       Datenschicht (localStorage) – von beiden Seiten genutzt
js/dashboard.js   UI-Logik des Dashboards
```

## 💡 Hinweis zur Speicherung

Die Daten liegen im `localStorage` deines Browsers. Damit das Formular und das
Dashboard dieselben Leads sehen, müssen beide über **denselben Origin** geöffnet
werden (z. B. beide über `http://localhost:8000`). Möchtest du Leads geräte­übergreifend
empfangen, lässt sich `js/store.js` später leicht gegen ein echtes Backend tauschen.
