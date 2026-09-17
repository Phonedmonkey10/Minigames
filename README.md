# Minigames

A small GitHub Pages arcade with more than one browser game.

**Live:** [https://phonedmonkey10.github.io/Minigames/](https://phonedmonkey10.github.io/Minigames/)

## Games

| Game | Folder | Play |
| --- | --- | --- |
| Neon Clash (rock paper scissors) | `neon-clash/` | [Open](https://phonedmonkey10.github.io/Minigames/neon-clash/) |
| Mini 8-Ball | `mini-8-ball/` | [Open](https://phonedmonkey10.github.io/Minigames/mini-8-ball/) |

The home page lists each game as a card, with a preview image and an English / German language toggle.

## Run locally

```bash
python3 -m http.server 8765
```

Then open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

## Layout

```
index.html          Hub with game cards
css/hub.css
js/hub.js
assets/previews/    Card screenshots
neon-clash/         Rock paper scissors
mini-8-ball/        8-ball vs a bot
```
