# Schattenstunde – Produktions-Anleitung für Claude Code

Diese Datei beschreibt, wie die Horror-Shorts gebaut werden (Stimme, Look, Animation, Ton, Export).
Referenz-Video: `video/Skunk_Ape_Wildkamera.mp4`. Referenz-Code: `video/tools/`.

---

## 1. Format

- **9:16**, 1080×1920, 30 fps, H.264 (`-crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart`), AAC 192k
- Länge 45–65 s. Hook in den ersten 3 s.
- Ton: **-14 LUFS integriert**, True Peak ≤ -1 dBFS

## 2. Stimme (ElevenLabs)

- **Voice:** „Vincent Crowe – Dark & Haunting Tales“, `voice_id = 18X2yBovneA0q06wd8E9`
- **Modell:** `eleven_v4`, 2 Takes generieren, den kürzeren/besseren nehmen
- **Regie-Tags auf Deutsch** in eckigen Klammern im Text:
  `[leise, eindringlich]`, `[ruhig erzählend]`, `[langsam]`, `[flüsternd]`, `[angespannt, schneller]`, `[Pause]`, `[lange Pause]`
- Zahlen ausschreiben („zweihundertsieben“), in den Untertiteln aber als Ziffern zeigen („Bild 207.“)
- Beim Schnitt Stimme mit `atempo=1.06` leicht beschleunigen (klingt nicht höher), Start-Offset 0,8 s
- **Wort-Timings:** TTS-Take in denselben Flow pinnen (`creative_add_flow_asset_node`) → `creative_transcribe_audio` (eleven_scribe_v1) → `words.json` mit Start/Ende pro Wort. Zeit im Video = `0.8 + t / 1.06`

## 3. Story-Regeln

- Kreatur **nie beim Namen nennen** (nur in Hashtags) → Diskussion in den Kommentaren
- Kulturell korrekt: Skinwalker = Navajo/Südwesten, nicht Appalachen. Appalachen: Bigfoot, Raven Mocker. Florida: Skunk Ape
- Aufbau: Hook-Satz → Ort + Jahr → normales Problem → „Erklärung“ (Waschbär/Bär) wird widerlegt → Beweis (Kamera/Spuren) → Reveal → Twist → letzter unheimlicher Satz
- Hinweis immer im Bild: „FIKTION, INSPIRIERT VON …“

## 4. Visueller Stil („Lantern-Stil“)

**KEINE Foto-Slideshows, KEINE Pixel-Art, KEINE KI-Videoclips** (zu teuer: ~1.500–14.000 Credits pro 5 s).
Alles wird mit **Code animiert** (Python + pycairo, Vektor mit Antialiasing).

### Farben
| Element | Wert |
|---|---|
| Hintergrund | fast schwarz `#09090A` + Radial-Verlauf zur Mitte `rgb(28,26,26)` |
| Silhouetten | `rgb(5–12, 5–10, 5–10)` (fast schwarz) |
| Warmes Licht (Laterne/Lampe) | `rgb(255,200,130)` als weicher Radial-Glow |
| Rot (Hook-Keyword) | `rgb(199,61,51)` |
| Text | `rgb(230,225,215)` mit weichem Schatten (2–4 px, schwarz, 50 %) |
| Augen | Kern `rgb(255,248,230)` + Glow `rgb(255,220,140)` |
| Vignette | Radial, außen 75 % schwarz |

### Typo (Mac-Fonts)
- **Hook/Endkarte:** Georgia Bold (Fallback: Caladea Bold), 86–90 px, GROSSBUCHSTABEN, zentriert, ab y≈470, Zeilenabstand 96 px; **ein** Wort oder eine Phrase in Rot
- **Untertitel:** Georgia Regular, **68 px**, zentriert, max. 900 px breit, ab y≈1370, Zeilenabstand 82 px, ganze Phrase auf einmal (Fade 0,18 s)
- **Top-Label:** Inter/Helvetica Neue 25 px, grau `rgb(115,115,115)`, Buchstabenabstand 1,2 px, y=300: `FIKTION, INSPIRIERT VON …`
- **Kamera-/UI-Text:** Menlo oder JetBrains Mono 24–28 px, Zeitstempel orange `rgb(255,190,75)`

### Layout
- Illustrations-Panel: x 110–970, y 430–1250 (Hook-Szene darf frei ohne Panel sein)
- Untertitel darunter, Label darüber; untere ~20 % frei lassen (TikTok-UI)

### Animation (pro Szene immer echte Bewegung)
- Figuren als Silhouetten: Kreatur (gebückt, zottelig, lange Arme, leuchtende Augen), Mensch (Kopf + Locken, Mantel, Laufzyklus mit Bob), Tiere
- Typische Bewegungen: Laufen, Umkippen/Rotieren mit Ease, Bogenflug (Parabel + Rotation), Augen öffnen/blinzeln, Atmen (leichtes Skalieren), Blätter/Palmen wiegen (Sinus), Licht flackert, Glühwürmchen, Gestanks-Linien steigen auf, Blitz (weißer Flash 0,35 s Fade), Handabdruck rutscht an Glas
- Übergänge: harte Schnitte oder kurze Schwarzblenden; am Ende 0,3 s Schock-Frame (Augen groß + Stinger), dann Endkarte
- Easing: smoothstep `x*x*(3-2x)`

## 5. Ton

**Wichtigste Regel: Stimme immer klar vor den Geräuschen.**

1. **Jede Spur einzeln messen** (`ffmpeg -af ebur128`) und per Gain angleichen. Die ElevenLabs-SFX sind sehr unterschiedlich laut (Drone -9 LUFS, Stimme -21 LUFS!)
2. Zielpegel vor dem Mix: Stimme ≈ -16 LUFS; Atmo/Drone ≈ -32 LUFS; einzelne Hits (Stinger, Knurren) ≈ -20 bis -24 LUFS
3. Stimme: `acompressor=threshold=0.125:ratio=2.5:attack=8:release=200:makeup=1.6`
4. **Sidechain-Ducking:** alle Geräusche → `sidechaincompress=threshold=0.02:ratio=8:attack=15:release=450` mit der Stimme als Steuersignal
5. Am Ende nur statische Verstärkung + `alimiter` → -14 LUFS. **Kein dynamisches `loudnorm`** am Ende (zieht Atmo in Sprechpausen hoch)
6. ⚠️ Falle: `aecho=0.9:0.4:…` senkt die Stimme um 8 dB (out_gain 0.4). Wenn Hall, dann `aecho=1:1:50:0.06`

SFX-Prompts (eleven_text_to_sound_v2), die gut funktioniert haben:
- Drone: „Dark cinematic horror drone, deep low sub bass rumble with slowly swelling dissonant strings, tense and ominous, no melody“ (22 s, loop)
- Atmo Wald/Sumpf: „Humid Florida swamp at night: dense chorus of crickets and tree frogs…“ (20 s, loop)
- Stinger: „Subtle creeping horror reveal: low reversed whoosh swelling into a deep muffled sub bass boom with a faint dissonant string scrape, then ringing silence“ (4 s)
- Knurren: „Very close, deep wet guttural breathing of a huge animal, slow snorting exhale, then a low rumbling growl“ (5 s)
- Kamera-Auslöser, Mülltonne, Fliegen, Laptop-Klicks: jeweils 2–10 s

## 6. Pipeline (Schritt für Schritt)

1. Skript schreiben (siehe Story-Regeln), Regie-Tags setzen
2. ElevenLabs-Flow anlegen → TTS (Voice oben) + SFX-Nodes → generieren
3. Take pinnen → transkribieren → `words.json`
4. Szenen-Timeline aus den Wort-Timings bauen (Szenenwechsel auf Satzanfänge)
5. `render_*.py` anpassen (Szenen-Funktionen), Vorschau rendern:
   `python3 render.py <ordner> preview.png 2.0 10 20 …` (erzeugt ein Kontaktblatt)
6. Voll rendern: `python3 render.py <ordner> base.mp4`
7. Ton mischen: `video/tools/mix_skunkape.sh` als Vorlage (Zeiten anpassen)
8. Muxen: `ffmpeg -i base.mp4 -i mix.wav -map 0:v -map 1:a -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart final.mp4`
9. Kontrolle: Frames extrahieren + `ebur128` (≈ -14 LUFS, LRA < 6)

## 7. Setup auf dem Mac

```bash
brew install ffmpeg cairo pkg-config
pip3 install pycairo numpy pillow
```
In `render_skunkape.py` die Fonts tauschen: `SERIF="Georgia"`, `SANS="Helvetica Neue"`, `MONO="Menlo"`.
Das Skript erwartet `<ordner>/audio/words.json` (Beispiel: `video/tools/skunkape_words.json`).

## 8. Kosten (ElevenLabs Starter, 40.000 Credits/Monat)

| Posten | Credits |
|---|---|
| Voiceover 60 s, 2 Takes | ~2.000 |
| SFX gesamt | ~250 |
| Transkription | 0 |
| Bild (gpt-image, 1K) | ~190 pro Bild, ~430 mit Referenzbild |
| KI-Video 5 s | 1.500 (Wan 2.6, 480p) bis 14.000 (Seedance 2.5) → **vermeiden** |

Im Lantern-Stil braucht man **keine Bilder** → ein Video kostet nur ~2.300 Credits.

## 9. Titel & Hashtags (Muster)

- Titel = Neugier-Satz, ohne Kreaturnamen: „Sie stellte eine Wildkamera auf. Bild 207 hätte sie nie öffnen sollen.“
- Shorts: `#Shorts #Horrorgeschichte #Gruselgeschichte` + 2 themenspezifische
- TikTok: 5–8 gezielte Tags, z. B. `#gruselgeschichte #horrortok #creepy #kryptid #fyp`
- Angepinnter Kommentar mit Frage („Waschbär, Bär oder etwas anderes? 👀“)
