# 🎯 Akquise-Cockpit

Ein leichtgewichtiges Outreach-/Akquise-Tool in **reinem HTML, CSS & JavaScript**.
Kein Build, keine Abhängigkeiten, kein Server – einfach im Browser öffnen und loslegen.

Gemacht zum täglichen Draufgehen: kalte/warme/heiße Leads sehen, per Klick eine
Akquise-Mail rausschicken oder anrufen, Ergebnisse protokollieren und Follow-ups verfolgen.

## ✨ Funktionen

- **🧊 Kalt / 🌤️ Warm / 🔥 Heiß** – Lead-Temperatur als Hauptachse, auf einen Blick
- **📊 Cockpit** – Kennzahlen (Temperatur-Verteilung, heute kontaktiert, fällige Follow-ups, Kunden) + Listen „Follow-ups fällig" & „Heiße Leads"
- **🎯 Arbeitsliste** – alle Leads zum Durchackern, Filter nach Temperatur & Status, Suche
- **📧 Akquise-Mail per Klick** – öffnet dein Mailprogramm mit vorausgefülltem Text (Vorlagen mit Platzhaltern), Kontakt wird automatisch protokolliert
- **📞 Klick-to-Call** – wählt direkt, danach Ergebnis loggen (erreicht / Termin / Mailbox / nicht erreicht / kein Interesse) inkl. automatischem Follow-up
- **📥 Lead-Import** – CSV-Datei oder einfach Liste reinkopieren; E-Mail & Telefon werden automatisch erkannt, Duplikate übersprungen
- **✉️ Mail-Vorlagen** – eigene Akquise-Texte verwalten, Platzhalter `{{vorname}}`, `{{firma}}`, …
- **🗒️ Verlauf je Lead** – jede Mail, jeder Anruf, jede Notiz mit Zeitstempel
- **⬇︎ CSV-Export** & **🌐 Eingangs-Formular** (`formular.html`) für warme Inbound-Leads
- **Speicherung lokal im Browser** (`localStorage`), beim ersten Start mit Demo-Daten

## 🚀 Loslegen

Am besten über einen kleinen lokalen Server, damit Formular & Cockpit dieselben Daten teilen:

```bash
python3 -m http.server 8000
# Cockpit:   http://localhost:8000
# Formular:  http://localhost:8000/formular.html
```

Alternativ genügt ein Doppelklick auf `index.html`.

## 🗂 Projektstruktur

```
index.html        Akquise-Cockpit (Cockpit, Arbeitsliste, Import, Vorlagen)
formular.html     Öffentliches Eingangs-Formular für warme Inbound-Leads
css/styles.css    Styling
js/store.js       Datenschicht (localStorage): Leads, Aktivitäten, Vorlagen
js/dashboard.js   UI-Logik des Cockpits
```

## 📥 Import-Format

Eine Zeile pro Lead, Spalten getrennt durch Komma, Semikolon oder Tab:

```
Anna Schmidt, anna@beispiel-gmbh.de, +49 151 11122233, Beispiel GmbH, Hamburg
Jonas Krüger; jonas@krueger-tech.de; +49 170 44455566; Krüger Tech; München
```

E-Mail und Telefonnummer werden automatisch erkannt – die Reihenfolge der übrigen
Spalten ist Name, Firma, Ort.

## 💡 Grenzen & Ausbau

- **Speicherung ist lokal** (pro Browser/Gerät). Für geräteübergreifende Nutzung
  lässt sich `js/store.js` später gegen ein echtes Backend tauschen.
- **Mails** gehen über dein Mailprogramm (`mailto:`) raus – kein automatischer
  Massenversand. Das ist gewollt (kein Server nötig, kein Spam-Risiko).
- **Echtes Web-Scraping** (Firmen automatisch aus dem Web ziehen) braucht einen
  Server + APIs und ist rechtlich heikel (ToS/DSGVO) – hier bewusst über Import gelöst.
