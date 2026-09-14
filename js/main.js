import { createGame } from "./game.js";
import { DIFFICULTIES, DIFFICULTY_ORDER } from "./bot.js";

const menu = document.getElementById("start-menu");
const grid = document.getElementById("difficulty-buttons");

const game = createGame(document.getElementById("table"), {
  playerWins: document.getElementById("player-wins"),
  botWins: document.getElementById("bot-wins"),
  turn: document.getElementById("turn"),
  groups: document.getElementById("groups"),
  lastShot: document.getElementById("last-shot"),
  status: document.getElementById("status"),
  playerGroupLabel: document.getElementById("player-group-label"),
  botGroupLabel: document.getElementById("bot-group-label"),
  playerBalls: document.getElementById("player-balls"),
  botBalls: document.getElementById("bot-balls"),
  newRack: document.getElementById("new-rack"),
  resetMatch: document.getElementById("reset-match"),
  difficulty: document.getElementById("difficulty-label"),
  menu,
});

for (const id of DIFFICULTY_ORDER) {
  const cfg = DIFFICULTIES[id];
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `diff-btn diff-${id}`;
  btn.innerHTML = `<span class="diff-name">${cfg.label}</span><span class="diff-blurb">${cfg.blurb}</span>`;
  btn.addEventListener("click", () => game.startMatch(id));
  grid.appendChild(btn);
}
