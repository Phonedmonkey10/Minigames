# Notizen zu den Arbeitsschritten

Projekt: **Neon Clash** (Schere, Stein, Papier im Browser)

## 1. Aufgabe klären

Zuerst die Anforderungen festgehalten:

- Spiel gegen den Computer
- auffällige Farben und Animationen
- Scoreboard für Spieler und Computer
- genau **10 Runden** pro Partie
- nach dem Ende **neu starten** können

Danach den leeren Projektordner geprüft. Es gab noch keine Dateien, also von Grund auf neu gebaut.

## 2. Oberfläche in HTML bauen (`index.html`)

Die Seite in klare Blöcke geteilt:

1. Titel / Intro
2. Scoreboard (Du, Runde, Computer)
3. Arena mit beiden Zügen
4. Status-Text
5. drei Buttons: Rock, Paper, Scissors
6. Overlay für das Endergebnis + Button **Play again**
7. Canvas für Konfetti

So bleibt die Struktur übersichtlich, und JavaScript kann später einzelne Elemente per `id` ansteuern.

## 3. Design und Animationen (`styles.css`)

- Neon-Look: dunkler Hintergrund, knalliges Grün, Magenta, Cyan, Gelb
- Scoreboard als drei Karten
- Buttons mit Hover (hochheben) und Druck-Effekt
- Animationen: schwebende Farbklekse, pulsierendes „VS“, Slam beim Aufdecken, Score-Pop
- Overlay für das Spielende
- kleine Anpassung für schmale Bildschirme (Rundenanzeige unter die Punkte)

## 4. Spiellogik (`game.js`)

Reihenfolge der Programmierung:

1. **Konstanten:** 10 Runden, Züge, Emojis, Wer wen schlägt
2. **Zustand:** Punkte Spieler, Punkte Computer, aktuelle Runde, `locked` (kein Doppelklick während einer Runde)
3. **Zug spielen:** eigene Wahl zeigen → Computer „denkt“ kurz → Zufallszug
4. **Gewinner der Runde:** vergleichen, Scoreboard aktualisieren, Text setzen
5. **Runde hochzählen** bis 10
6. **Spielende:** Overlay, Gewinnertext, bei Sieg Konfetti
7. **Restart:** Punkte und Runde auf 0 / 1, Overlay zu, Buttons wieder aktiv

Regeln im Code:

- Stein schlägt Schere
- Schere schlägt Papier
- Papier schlägt Stein
- Gleiche Wahl = Unentschieden (keine Punkte, Runde zählt)

## 5. Prüfen

- Win/Lose/Unentschieden mit Beispielzügen durchgedacht
- HTML, CSS und JS per lokalem Server geladen (`python3 -m http.server`)
- Spiel im Browser geöffnet

Im Editor konnte nicht jede Klickfolge automatisch durchgeklickt werden. Manuell testen:

- [ ] eine Runde gewinnen / verlieren / unentschieden
- [ ] Scoreboard zählt mit
- [ ] nach 10 Runden erscheint das Overlay
- [ ] **Play again** setzt alles zurück

## 6. Dokumentation

- `README.md`: Start, Regeln, Dateiübersicht
- diese Datei: Ablauf der Arbeitsschritte

## Kurz: Reihenfolge

Idee → HTML-Gerüst → CSS/Animation → JavaScript (Runden, Punkte, Restart) → Testen → Markdown-Notizen
