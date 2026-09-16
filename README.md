# Neon Clash – Schere, Stein, Papier

Kleines Browser-Spiel: du spielst **Schere, Stein, Papier** gegen den Computer.

**Live:** [https://phonedmonkey10.github.io/Rock-paper-scissors-Game/](https://phonedmonkey10.github.io/Rock-paper-scissors-Game/)

## So startest du

Öffne `index.html` im Browser (Doppelklick oder per Live-Server).

Optional lokal per Server:

```bash
python3 -m http.server 8765
```

Dann im Browser: [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

## Spielregeln

- Eine Partie geht über **10 Runden**.
- Du wählst **Rock** (Stein), **Paper** (Papier) oder **Scissors** (Schere).
- Der Computer wählt zufällig.
- Stein schlägt Schere, Schere schlägt Papier, Papier schlägt Stein.
- Unentschieden: keine Punkte, die Runde zählt trotzdem.
- Nach 10 Runden siehst du das Ergebnis und kannst mit **Play again** neu starten.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Struktur und Oberfläche |
| `styles.css` | Farben, Layout, Animationen |
| `game.js` | Spielablauf, Punkte, Runden, Restart |
| `NOTIZEN.md` | Arbeitsschritte und Aufbau |
