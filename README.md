# DC Marketing & Automation – Website

Moderne Unternehmens-Website für **DC Marketing & Automation**: maßgeschneiderte
Chatbots und Automatisierungen für kleine und mittlere Unternehmen.

## Seiten

| Datei | Beschreibung |
|---|---|
| `index.html` | Haupt-Website: Leistungen, Live-Chatbot-Demo, Kunden-Vorschauen, animierte Lead-Journey, Kontakt |
| `crm-demo.html` | Interaktive Lead-CRM-Demo (Dashboard, Pipeline, Lead-Liste) |
| `formular.html` | Öffentliches Demo-Lead-Formular – Einträge erscheinen automatisch im CRM |

## Highlights der Website

- **Live-Chatbot-Widget** unten rechts – Besucher können den DC-Assistenten direkt ausprobieren
- **Automatisch ablaufende Chat-Konversation** im Hero-Bereich
- **Kunden-Vorschauen**: originalgetreue Chatbot-Mockups (Immobilienmakler & Handwerksbetrieb)
- **Animierte Lead-Journey**: von der Anfrage um 22:47 Uhr bis zum bestätigten Termin – 0 Handgriffe
- **CRM + Formular als anfassbare Automatisierungs-Demo** (localStorage, kein Backend nötig)
- Responsive, dunkles Design mit Animationen – ohne Framework, nur HTML/CSS/JS

## Struktur

```
index.html          Haupt-Website
crm-demo.html       CRM-Demo
formular.html       Lead-Formular-Demo
css/site.css        Styles der Haupt-Website
css/styles.css      Styles der CRM-Demo
js/site.js          Interaktionen der Haupt-Website (Chatbot, Animationen)
js/store.js         Gemeinsame Datenschicht (localStorage) für CRM + Formular
js/dashboard.js     CRM-Dashboard-Logik
assets/img/         Logos & Chatbot-Avatare
```

## Lokal ansehen

Einfach `index.html` im Browser öffnen – oder einen kleinen Server starten:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Offene Punkte

- Impressum & Datenschutzerklärung ergänzen (Pflicht vor Veröffentlichung in DE)
- Eigene Domain & Hosting (z. B. GitHub Pages) einrichten
