const TOTAL_ROUNDS = 10;
const MOVES = ["rock", "paper", "scissors"];
const ICONS = { rock: "✊", paper: "✋", scissors: "✌️" };
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

const playerScoreEl = document.getElementById("player-score");
const cpuScoreEl = document.getElementById("cpu-score");
const roundLabelEl = document.getElementById("round-label");
const statusEl = document.getElementById("status");
const playerMoveEl = document.getElementById("player-move");
const cpuMoveEl = document.getElementById("cpu-move");
const overlayEl = document.getElementById("overlay");
const finalTitleEl = document.getElementById("final-title");
const finalScoreEl = document.getElementById("final-score");
const finalKickerEl = document.getElementById("final-kicker");
const restartBtn = document.getElementById("restart-btn");
const choiceButtons = [...document.querySelectorAll(".choice")];
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");

let playerScore = 0;
let cpuScore = 0;
let round = 1;
let locked = false;
let confettiBits = [];
let confettiTimer = 0;

function resetBoardLooks() {
  [playerMoveEl, cpuMoveEl].forEach((el) => {
    el.className = "move-orb idle";
    el.dataset.move = "";
    el.textContent = "?";
  });
  statusEl.className = "status";
}

function setButtonsDisabled(disabled) {
  choiceButtons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

function startGame() {
  playerScore = 0;
  cpuScore = 0;
  round = 1;
  locked = false;
  overlayEl.classList.add("hidden");
  playerScoreEl.textContent = "0";
  cpuScoreEl.textContent = "0";
  roundLabelEl.textContent = `1 / ${TOTAL_ROUNDS}`;
  statusEl.textContent = "Pick your move to start round 1";
  resetBoardLooks();
  setButtonsDisabled(false);
  confettiBits = [];
}

function randomCpuMove() {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}

function outcome(player, cpu) {
  if (player === cpu) return "draw";
  return BEATS[player] === cpu ? "win" : "lose";
}

function popScore(el) {
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}

function showMove(el, move, extraClass) {
  el.className = `move-orb reveal ${extraClass}`;
  el.dataset.move = move;
  el.textContent = ICONS[move];
}

function messages(result, player, cpu) {
  if (result === "draw") {
    return { text: `Tie! You both chose ${player}.`, cls: "draw" };
  }
  if (result === "win") {
    return { text: `${player} beats ${cpu}. You take the round!`, cls: "win" };
  }
  return { text: `${cpu} beats ${player}. Computer scores!`, cls: "lose" };
}

function finishGame() {
  locked = true;
  setButtonsDisabled(true);

  let title = "It's a draw!";
  let kicker = "10 rounds complete";
  if (playerScore > cpuScore) {
    title = "You win!";
    kicker = "Champion of Neon Clash";
    burstConfetti();
  } else if (cpuScore > playerScore) {
    title = "Computer wins";
    kicker = "The CPU got lucky";
  }

  finalKickerEl.textContent = kicker;
  finalTitleEl.textContent = title;
  finalScoreEl.textContent = `${playerScore} – ${cpuScore}`;
  overlayEl.classList.remove("hidden");
}

function playRound(playerMove) {
  if (locked) return;
  locked = true;
  setButtonsDisabled(true);

  playerMoveEl.className = "move-orb reveal";
  playerMoveEl.textContent = ICONS[playerMove];
  cpuMoveEl.className = "move-orb thinking";
  cpuMoveEl.textContent = "🤖";
  statusEl.className = "status";
  statusEl.textContent = "Computer is thinking...";

  window.setTimeout(() => {
    const cpuMove = randomCpuMove();
    const result = outcome(playerMove, cpuMove);

    if (result === "win") {
      playerScore += 1;
      playerScoreEl.textContent = String(playerScore);
      popScore(playerScoreEl);
    } else if (result === "lose") {
      cpuScore += 1;
      cpuScoreEl.textContent = String(cpuScore);
      popScore(cpuScoreEl);
    }

    showMove(playerMoveEl, playerMove, result === "win" ? "win" : result === "lose" ? "lose" : "draw");
    showMove(cpuMoveEl, cpuMove, result === "lose" ? "win" : result === "win" ? "lose" : "draw");

    const msg = messages(result, playerMove, cpuMove);
    statusEl.textContent = msg.text;
    statusEl.className = `status ${msg.cls}`;

    if (round >= TOTAL_ROUNDS) {
      roundLabelEl.textContent = `${TOTAL_ROUNDS} / ${TOTAL_ROUNDS}`;
      window.setTimeout(finishGame, 700);
      return;
    }

    round += 1;
    roundLabelEl.textContent = `${round} / ${TOTAL_ROUNDS}`;
    locked = false;
    setButtonsDisabled(false);
  }, 700);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function burstConfetti() {
  resizeCanvas();
  const colors = ["#39ff88", "#3cf0ff", "#ff4fd8", "#ffe566", "#ff8a3c"];
  confettiBits = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    r: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
    s: 2 + Math.random() * 5,
    a: Math.random() * Math.PI,
  }));
  confettiTimer = 180;
}

function tickConfetti() {
  if (confettiTimer <= 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(tickConfetti);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiBits.forEach((bit) => {
    bit.y += bit.s;
    bit.x += Math.sin(bit.a);
    bit.a += 0.08;
    ctx.fillStyle = bit.c;
    ctx.fillRect(bit.x, bit.y, bit.r, bit.r * 1.4);
  });
  confettiTimer -= 1;
  requestAnimationFrame(tickConfetti);
}

choiceButtons.forEach((btn) => {
  btn.addEventListener("click", () => playRound(btn.dataset.choice));
});

restartBtn.addEventListener("click", startGame);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
tickConfetti();
startGame();
