# n8n-Workflow: CRM Cold Mail (Webhook)

Schlanker Workflow, der die Leads aus dem Akquise-Cockpit per **Webhook** empfängt
und über **Gmail** eine Cold-Mail verschickt. Ergebnis wird in dein bestehendes
Google Sheet „Auto Mail" geloggt.

## Ablauf
```
Webhook (Lead vom CRM)
  → Lead normalisieren (Felder mappen)
  → Website vorhanden?
        ja → Website scrapen → E-Mail von der Website holen
        nein → ohne Website weiter
  → E-Mail vorhanden?
        ja → Gmail senden → Log: SENT
        nein → Log: KEINE EMAIL
```

## Import in n8n
1. n8n öffnen → **Workflows → Import from File** → `crm-cold-mail.json` wählen.
2. Beim **Gmail-** und **Google-Sheets-Node** die Credentials neu auswählen
   (sie sind auf deine bestehenden Accounts vorgemappt, müssen ggf. einmal bestätigt werden).
3. Workflow **aktivieren** (Toggle oben rechts auf „Active").
4. Den **Webhook-Node** öffnen → die **Production-URL** kopieren
   (z. B. `https://DEIN-N8N/webhook/crm-cold-mail`).
5. Im Akquise-Cockpit unter **🔗 n8n Versand** diese URL einfügen → **Speichern → 🧪 Test senden**.

## Feld-Mapping (CRM → Workflow)
| CRM-Feld     | Workflow / Sheet   |
|--------------|--------------------|
| `company`    | Firma              |
| `name`       | Ansprechpartner    |
| `email`      | Email              |
| `website`    | Website            |
| `source`     | Branche            |
| `location`   | Ort                |

## Ehrliche Hinweise
- **E-Mail:** Gescrapte Leads (OpenStreetMap) haben oft keine E-Mail. Der Workflow
  versucht sie von der Firmen-Website zu holen. Klappt das nicht → Zeile „KEINE EMAIL"
  im Sheet (kein Versand).
- **Chef-Name:** Ist selten zuverlässig verfügbar. Fehlt er, grüßt die Mail mit
  „Guten Tag" statt mit Namen.
- ⚖️ **Recht:** Kalte Werbe-E-Mails an Firmen ohne Einwilligung sind in DE
  grundsätzlich unzulässig (UWG §7). Nutzung auf eigene Verantwortung.
