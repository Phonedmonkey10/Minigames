import { TABLE, pockets, pocketRadius } from "./table.js";

function speed(b) {
  return Math.hypot(b.vx, b.vy);
}

export function allStopped(balls) {
  return balls.every((b) => b.pocketed || speed(b) < TABLE.stopSpeed);
}

export function haltSlowBalls(balls) {
  for (const b of balls) {
    if (b.pocketed) continue;
    if (speed(b) < TABLE.stopSpeed) {
      b.vx = 0;
      b.vy = 0;
    }
  }
}

function integrate(ball, dt) {
  if (ball.pocketed) return;
  const s = speed(ball);
  if (s > 0) {
    const next = Math.max(0, s - TABLE.friction * dt);
    const k = next / s;
    ball.vx *= k;
    ball.vy *= k;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
}

function nearPocket(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of pockets()) {
    const d = Math.hypot(x - p.x, y - p.y);
    const reach = pocketRadius(p) + TABLE.ballR * 1.35;
    if (d < reach && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

function bounceRail(ball, shot) {
  const r = ball.r;
  const minX = r;
  const maxX = TABLE.playW - r;
  const minY = r;
  const maxY = TABLE.playH - r;
  const p = nearPocket(ball.x, ball.y);
  let hit = false;

  const allowLeft = p && p.x === 0;
  const allowRight = p && p.x === TABLE.playW;
  const allowTop = p && p.y === 0;
  const allowBottom = p && p.y === TABLE.playH;

  if (!allowLeft && ball.x < minX) {
    ball.x = minX;
    ball.vx = Math.abs(ball.vx) * TABLE.restitution;
    hit = true;
  } else if (!allowRight && ball.x > maxX) {
    ball.x = maxX;
    ball.vx = -Math.abs(ball.vx) * TABLE.restitution;
    hit = true;
  }

  if (!allowTop && ball.y < minY) {
    ball.y = minY;
    ball.vy = Math.abs(ball.vy) * TABLE.restitution;
    hit = true;
  } else if (!allowBottom && ball.y > maxY) {
    ball.y = maxY;
    ball.vy = -Math.abs(ball.vy) * TABLE.restitution;
    hit = true;
  }

  if (hit && shot.firstHit != null) shot.railAfterContact = true;
}

function markRailIfClose(ball, shot) {
  if (ball.pocketed || shot.firstHit == null || shot.railAfterContact) return;
  const slop = 8;
  if (
    ball.x <= ball.r + slop ||
    ball.x >= TABLE.playW - ball.r - slop ||
    ball.y <= ball.r + slop ||
    ball.y >= TABLE.playH - ball.r - slop
  ) {
    shot.railAfterContact = true;
  }
}

function collidePair(a, b, shot) {
  if (a.pocketed || b.pocketed) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = a.r + b.r;
  if (dist === 0 || dist >= min) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = min - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (rel <= 0) return;

  const impulse = rel * TABLE.ballRestitution;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;

  const cue = a.n === 0 ? a : b.n === 0 ? b : null;
  const other = cue === a ? b : cue === b ? a : null;
  if (cue && other && shot.firstHit == null) shot.firstHit = other.n;
}

function pocketBall(ball, shot) {
  if (ball.pocketed) return;
  ball.pocketed = true;
  ball.vx = 0;
  ball.vy = 0;
  shot.pocketed.push(ball.n);
  if (ball.n === 0) shot.cuePocketed = true;
}

function checkPockets(ball, shot) {
  if (ball.pocketed) return;
  for (const p of pockets()) {
    const pr = pocketRadius(p);
    if (Math.hypot(ball.x - p.x, ball.y - p.y) < pr - ball.r * 0.15) {
      pocketBall(ball, shot);
      return;
    }
  }

  const outside =
    ball.x < -ball.r ||
    ball.x > TABLE.playW + ball.r ||
    ball.y < -ball.r ||
    ball.y > TABLE.playH + ball.r;
  if (outside) pocketBall(ball, shot);
}

export function stepWorld(balls, shot, dt) {
  const subs = 6;
  const h = dt / subs;
  for (let s = 0; s < subs; s++) {
    for (const b of balls) integrate(b, h);
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        collidePair(balls[i], balls[j], shot);
      }
    }
    for (const b of balls) {
      bounceRail(b, shot);
      markRailIfClose(b, shot);
      checkPockets(b, shot);
    }
  }
}

export function pathClear(balls, from, to, radius, ignoreNs) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return true;
  const nx = dx / len;
  const ny = dy / len;
  for (const b of balls) {
    if (b.pocketed || ignoreNs.has(b.n)) continue;
    const px = b.x - from.x;
    const py = b.y - from.y;
    const t = px * nx + py * ny;
    if (t < -b.r || t > len + b.r) continue;
    const cx = from.x + nx * Math.max(0, Math.min(len, t));
    const cy = from.y + ny * Math.max(0, Math.min(len, t));
    if (Math.hypot(b.x - cx, b.y - cy) < b.r + radius + 1) return false;
  }
  return true;
}
