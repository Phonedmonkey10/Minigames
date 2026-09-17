import {
  TABLE,
  BALL_COLORS,
  canvasSize,
  playToCanvas,
  canvasToPlay,
  pockets,
  pocketRadius,
  makeRack,
  respotBall,
  canPlaceCue,
} from "./table.js";
import { stepWorld, allStopped, haltSlowBalls } from "./physics.js";
import { evaluateShot, eightIsOn } from "./rules.js";
import { pickBotShot, DIFFICULTIES } from "./bot.js";

const PLAYER = "player";
const BOT = "bot";

export function createGame(canvas, ui) {
  const ctx = canvas.getContext("2d");
  const size = canvasSize();
  canvas.width = size.w;
  canvas.height = size.h;

  const state = {
    balls: makeRack(),
    turn: PLAYER,
    groups: { player: null, bot: null },
    isBreak: true,
    phase: "menu",
    kitchenOnly: true,
    ballInHand: false,
    wins: { player: 0, bot: 0 },
    lastShot: "—",
    status: "Choose a bot difficulty to start.",
    rackOver: false,
    winner: null,
    aim: null,
    hover: null,
    shot: null,
    shotFrames: 0,
    botTimer: 0,
    lastResult: null,
    difficulty: "medium",
    started: false,
  };

  function thinkTime() {
    return (DIFFICULTIES[state.difficulty] || DIFFICULTIES.medium).thinkTime;
  }

  function showMenu() {
    state.started = false;
    state.phase = "menu";
    state.aim = null;
    state.wins.player = 0;
    state.wins.bot = 0;
    state.balls = makeRack();
    state.groups = { player: null, bot: null };
    state.isBreak = true;
    state.ballInHand = false;
    state.kitchenOnly = true;
    state.lastShot = "—";
    state.status = "Choose a bot difficulty to start.";
    state.rackOver = false;
    if (ui.menu) ui.menu.hidden = false;
    syncUi();
  }

  function startMatch(difficulty) {
    state.difficulty = DIFFICULTIES[difficulty] ? difficulty : "medium";
    state.started = true;
    if (ui.menu) ui.menu.hidden = true;
    resetRack(false);
  }

  function cueBall() {
    return state.balls.find((b) => b.n === 0);
  }

  function resetRack(keepScore) {
    state.balls = makeRack();
    state.turn = PLAYER;
    state.groups = { player: null, bot: null };
    state.isBreak = true;
    state.phase = "aiming";
    state.kitchenOnly = true;
    state.ballInHand = false;
    state.lastShot = "—";
    state.status = "Break: drag back from the cue ball to shoot.";
    state.rackOver = false;
    state.winner = null;
    state.aim = null;
    state.shot = null;
    state.botTimer = 0;
    if (!keepScore) {
      state.wins.player = 0;
      state.wins.bot = 0;
    }
    syncUi();
  }

  function pointerPlay(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = (evt.clientX - rect.left) * sx;
    const cy = (evt.clientY - rect.top) * sy;
    return canvasToPlay(cx, cy);
  }

  function startShot(vx, vy) {
    if (state.phase === "simulating" || state.phase === "resolving") return;
    const cue = cueBall();
    cue.pocketed = false;
    cue.vx = vx;
    cue.vy = vy;
    state.shot = {
      firstHit: null,
      railAfterContact: false,
      pocketed: [],
      cuePocketed: false,
    };
    state.shotFrames = 0;
    state.phase = "simulating";
    state.aim = null;
  }

  function finishShot() {
    if (state.phase !== "simulating") return;
    state.phase = "resolving";
    haltSlowBalls(state.balls);
    const shooter = state.turn;
    const opponent = shooter === PLAYER ? BOT : PLAYER;
    const eightOn = eightIsOn(shooter, state.groups, preShotBallsSnapshot(state.shot.pocketed));
    const result = evaluateShot({
      shooter,
      opponent,
      isBreak: state.isBreak,
      groups: state.groups,
      firstHit: state.shot.firstHit,
      pocketed: state.shot.pocketed,
      railAfterContact: state.shot.railAfterContact,
      cuePocketed: state.shot.cuePocketed,
      balls: state.balls,
      eightOn,
    });

    if (result.respotEight) {
      const eight = state.balls.find((b) => b.n === 8);
      respotBall(eight, state.balls);
    }

    state.lastResult = result;
    state.groups = result.groups;
    state.lastShot = result.foul
      ? `Foul (${result.foulReason})`
      : result.winner || result.loser
        ? result.message
        : "Legal";
    state.status = result.message;
    state.isBreak = false;
    state.kitchenOnly = Boolean(result.kitchenOnly && result.ballInHand);

    if (result.winner || result.loser) {
      const champ = result.winner || (result.loser === PLAYER ? BOT : PLAYER);
      state.wins[champ] += 1;
      state.rackOver = true;
      state.winner = champ;
      state.phase = "rackOver";
      syncUi();
      return;
    }

    if (result.ballInHand) {
      const cue = cueBall();
      cue.pocketed = true;
      cue.vx = 0;
      cue.vy = 0;
      state.ballInHand = true;
      state.kitchenOnly = result.kitchenOnly;
      state.turn = opponent;
      if (state.turn === BOT) {
        state.phase = "botThinking";
        state.botTimer = thinkTime();
      } else {
        state.phase = "placing";
        state.status = result.kitchenOnly
          ? "Foul. Place the cue behind the head string, then shoot."
          : "Foul. Place the cue ball anywhere, then shoot.";
      }
      syncUi();
      return;
    }

    const cue = cueBall();
    cue.pocketed = false;

    if (result.keepShooting) {
      if (shooter === BOT) {
        state.phase = "botThinking";
        state.botTimer = thinkTime();
      } else {
        state.phase = "aiming";
      }
    } else {
      state.turn = opponent;
      if (state.turn === BOT) {
        state.phase = "botThinking";
        state.botTimer = thinkTime();
      } else {
        state.phase = "aiming";
      }
    }
    syncUi();
  }

  function preShotBallsSnapshot(pocketedThisShot) {
    const set = new Set(pocketedThisShot);
    return state.balls.map((b) => ({
      ...b,
      pocketed: set.has(b.n) ? false : b.pocketed,
    }));
  }

  function fireBot() {
    const vel = pickBotShot(
      state.balls,
      state.groups,
      state.kitchenOnly,
      state.ballInHand,
      state.difficulty
    );
    state.ballInHand = false;
    state.kitchenOnly = false;
    startShot(vel.vx, vel.vy);
  }

  canvas.addEventListener("mousedown", (evt) => {
    if (state.phase === "rackOver" || state.phase === "menu") return;
    const p = pointerPlay(evt);
    if (state.phase === "placing" && state.turn === PLAYER) {
      if (canPlaceCue(p.x, p.y, state.balls, state.kitchenOnly)) {
        const cue = cueBall();
        cue.x = p.x;
        cue.y = p.y;
        cue.pocketed = false;
        cue.vx = 0;
        cue.vy = 0;
        state.ballInHand = false;
        state.phase = "aiming";
        state.status = "Cue placed. Drag to shoot.";
        syncUi();
      }
      return;
    }
    if (state.phase !== "aiming" || state.turn !== PLAYER) return;
    const cue = cueBall();
    if (cue.pocketed) return;
    state.aim = { x: p.x, y: p.y, active: true };
  });

  canvas.addEventListener("mousemove", (evt) => {
    const p = pointerPlay(evt);
    state.hover = p;
    if (state.aim?.active) {
      state.aim.x = p.x;
      state.aim.y = p.y;
    }
  });

  window.addEventListener("mouseup", () => {
    if (!state.aim?.active || state.phase !== "aiming" || state.turn !== PLAYER) {
      if (state.aim) state.aim.active = false;
      return;
    }
    const cue = cueBall();
    const dx = cue.x - state.aim.x;
    const dy = cue.y - state.aim.y;
    const dist = Math.hypot(dx, dy);
    state.aim.active = false;
    if (dist < 12) {
      state.aim = null;
      return;
    }
    const power = Math.min(1, dist / 180);
    const speed = power * TABLE.maxShotSpeed;
    const nx = dx / dist;
    const ny = dy / dist;
    startShot(nx * speed, ny * speed);
  });

  ui.newRack.addEventListener("click", () => {
    if (!state.started) return;
    resetRack(true);
  });
  ui.resetMatch.addEventListener("click", () => showMenu());

  function chipHtml(n, down) {
    const color = BALL_COLORS[n];
    const stripe = n > 8;
    const bg = stripe
      ? `linear-gradient(${color} 28%, #f5f5f5 28%, #f5f5f5 72%, ${color} 72%)`
      : color;
    const fg = n === 8 ? "#fff" : "#111";
    return `<span class="chip${down ? " gone" : ""}" style="background:${bg};color:${fg}">${n}</span>`;
  }

  function remainingOf(type) {
    return state.balls.filter((b) => b.type === type);
  }

  function syncUi() {
    ui.playerWins.textContent = String(state.wins.player);
    ui.botWins.textContent = String(state.wins.bot);
    ui.turn.textContent = state.rackOver
      ? state.winner === PLAYER
        ? "You win"
        : "Bot wins"
      : state.turn === PLAYER
        ? "You"
        : "Bot";
    const pg = state.groups.player;
    const bg = state.groups.bot;
    ui.groups.textContent = pg ? `You: ${pg} · Bot: ${bg}` : "Open table";
    ui.lastShot.textContent = state.lastShot;
    ui.status.textContent = state.status;
    if (ui.difficulty) {
      ui.difficulty.textContent = state.started
        ? (DIFFICULTIES[state.difficulty] || DIFFICULTIES.medium).label
        : "—";
    }
    ui.playerGroupLabel.textContent = pg ? `You (${pg})` : "You";
    ui.botGroupLabel.textContent = bg ? `Bot (${bg})` : "Bot";

    const eight = state.balls.find((b) => b.n === 8);
    if (!pg) {
      ui.playerBalls.innerHTML = remainingOf("solids")
        .concat(remainingOf("stripes"))
        .sort((a, b) => a.n - b.n)
        .map((b) => chipHtml(b.n, b.pocketed))
        .join("");
      ui.botBalls.innerHTML = chipHtml(8, eight.pocketed);
    } else {
      ui.playerBalls.innerHTML = remainingOf(pg)
        .sort((a, b) => a.n - b.n)
        .map((b) => chipHtml(b.n, b.pocketed))
        .concat(pg && eightIsOn(PLAYER, state.groups, state.balls) ? [chipHtml(8, eight.pocketed)] : [])
        .join("");
      ui.botBalls.innerHTML = remainingOf(bg)
        .sort((a, b) => a.n - b.n)
        .map((b) => chipHtml(b.n, b.pocketed))
        .concat(eightIsOn(BOT, state.groups, state.balls) ? [chipHtml(8, eight.pocketed)] : [])
        .join("");
    }
  }

  function drawTable() {
    const { rail, playW, playH } = TABLE;
    ctx.fillStyle = "#4a2a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0c5a34";
    ctx.fillRect(rail, rail, playW, playH);

    const felt = ctx.createLinearGradient(rail, rail, rail, rail + playH);
    felt.addColorStop(0, "rgba(255,255,255,0.05)");
    felt.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = felt;
    ctx.fillRect(rail, rail, playW, playH);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    const hs = playToCanvas(TABLE.headString, 0);
    ctx.moveTo(hs.x, rail);
    ctx.lineTo(hs.x, rail + playH);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const p of pockets()) {
      const c = playToCanvas(p.x, p.y);
      ctx.beginPath();
      ctx.fillStyle = "#0b0b0b";
      ctx.arc(c.x, c.y, pocketRadius(p) + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBall(b) {
    if (b.pocketed) return;
    const c = playToCanvas(b.x, b.y);
    const color = b.n === 0 ? "#f7f3e8" : BALL_COLORS[b.n];

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(c.x, c.y, b.r, 0, Math.PI * 2);
    ctx.fill();

    if (b.type === "stripes") {
      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, b.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(c.x - b.r, c.y - b.r * 0.42, b.r * 2, b.r * 0.84);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.arc(c.x, c.y, b.r - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    if (b.n !== 0) {
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.arc(c.x, c.y, b.r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = `bold ${Math.max(8, b.r * 0.85)}px Trebuchet MS, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(b.n), c.x, c.y + 0.5);
    } else {
      ctx.beginPath();
      ctx.fillStyle = "#d4c4a8";
      ctx.arc(c.x, c.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAim() {
    if (state.phase === "placing" && state.turn === PLAYER && state.hover) {
      const ok = canPlaceCue(state.hover.x, state.hover.y, state.balls, state.kitchenOnly);
      const c = playToCanvas(state.hover.x, state.hover.y);
      ctx.beginPath();
      ctx.strokeStyle = ok ? "rgba(255,255,255,0.85)" : "rgba(255,80,80,0.9)";
      ctx.lineWidth = 2;
      ctx.arc(c.x, c.y, TABLE.ballR, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!(state.aim?.active && state.turn === PLAYER && state.phase === "aiming")) return;
    const cue = cueBall();
    if (cue.pocketed) return;
    const dx = cue.x - state.aim.x;
    const dy = cue.y - state.aim.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;
    const nx = dx / dist;
    const ny = dy / dist;
    const from = playToCanvas(cue.x, cue.y);
    const to = playToCanvas(cue.x + nx * Math.min(220, 40 + dist), cue.y + ny * Math.min(220, 40 + dist));
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    const power = Math.min(1, dist / 180);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(from.x + 16, from.y - 28, 80, 8);
    ctx.fillStyle = power > 0.75 ? "#ff6b5a" : "#d7b56d";
    ctx.fillRect(from.x + 16, from.y - 28, 80 * power, 8);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;

    if (state.phase === "simulating") {
      state.shotFrames += 1;
      stepWorld(state.balls, state.shot, dt);
      if (state.shotFrames > 2 && allStopped(state.balls)) finishShot();
    } else if (state.phase === "botThinking") {
      state.botTimer -= dt;
      if (state.botTimer <= 0) fireBot();
    }

    drawTable();
    for (const b of state.balls) drawBall(b);
    drawAim();
    requestAnimationFrame(frame);
  }

  syncUi();
  requestAnimationFrame(frame);

  return { startMatch, showMenu, resetRack };
}
