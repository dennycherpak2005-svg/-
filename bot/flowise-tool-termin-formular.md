# 🛠️ Custom Tool: `termin_formular_anzeigen`

Dieses kleine Tool löst das Terminformular im Chat aus. Die **Felder selbst**
zeichnet das Website-Widget (`js/chatbot.js`) – das Tool ist nur der **zuverlässige
Auslöser**, den die KI per Function-Calling aufruft.

## So legst du es in Flowise an
1. Links in der Sidebar → **Tools** → **Create New Tool** (oder „+“).
2. Felder ausfüllen (siehe unten).
3. Speichern.
4. Im Chatflow den Node **Custom Tool** auf dieses Tool stellen (Select Tool).
5. Im Custom-Tool-Node **„Return Direct“ → AN** schalten.

> Warum „Return Direct = an“? Dann wird die Rückgabe des Tools (mit dem Marker
> `[[TERMIN]]`) direkt an den Chat geschickt – garantiert, ohne dass die KI den
> Marker umformuliert oder vergisst.

---

## Tool-Konfiguration

**Name**
```
termin_formular_anzeigen
```

**Description** (wichtig – danach entscheidet die KI, wann sie es aufruft)
```
Zeigt dem Nutzer ein Formular im Chat an, um einen Beratungstermin oder Rückruf
anzufragen. Rufe dieses Tool auf, sobald der Nutzer einen Termin, eine Beratung,
eine Besichtigung oder einen Rückruf wünscht. Frage die Termindaten NICHT selbst
im Chat ab – das Formular übernimmt das.
```

**Input Schema**
```
(leer lassen – das Tool braucht keine Eingabeparameter)
```

**JavaScript Function**
```javascript
// Gibt einen freundlichen Hinweis + den Marker [[TERMIN]] zurück.
// Das Website-Widget erkennt [[TERMIN]] und blendet das Formular ein.
return "Sehr gern! Bitte tragen Sie hier kurz Ihre Daten ein, dann melden wir uns zeitnah bei Ihnen.\n\n[[TERMIN]]";
```

---

## Was im Hintergrund passiert
1. Kunde: „Ich brauche einen Termin.“
2. KI ruft `termin_formular_anzeigen` auf.
3. Tool gibt zurück: *„Sehr gern! Bitte tragen Sie hier kurz Ihre Daten ein … [[TERMIN]]“*
4. Website-Widget sieht `[[TERMIN]]`, entfernt es und zeigt das **Formular im Chat**
   (Name, Datum, Uhrzeit, Anliegen, Telefon, E-Mail).
5. Nach dem Absenden landet die Anfrage im CRM – und (im Live-Betrieb) werden die
   Daten als Zusammenfassung an die KI/das Backend (z. B. n8n) übergeben.
