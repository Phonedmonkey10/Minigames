import { TABLE, pockets, canPlaceCue } from "./table.js";
import { pathClear } from "./physics.js";
import { eightIsOn, legalObjectTypes } from "./rules.js";

export const DIFFICULTIES = {
  low: {
    id: "low",
    label: "Low",
    blurb: "Misses often, shaky aim.",
    noise: 0.24,
    powerJitter: 200,
    placementTries: 14,
    randomShotChance: 0.6,
    thinkTime: 0.28,
  },
  medium: {
    id: "medium",
    label: "Medium",
    blurb: "Makes easy pots, misses cuts.",
    noise: 0.13,
    powerJitter: 110,
    placementTries: 36,
    randomShotChance: 0.3,
    thinkTime: 0.42,
  },
  high: {
    id: "high",
    label: "High",
    blurb: "Looks for sound shots.",
    noise: 0.062,
    powerJitter: 55,
    placementTries: 70,
    randomShotChance: 0.12,
    thinkTime: 0.55,
  },
  veryHigh: {
    id: "veryHigh",
    label: "Very High",
    blurb: "Tight aim, few mistakes.",
    noise: 0.028,
    powerJitter: 22,
    placementTries: 100,
    randomShotChance: 0.04,
    thinkTime: 0.7,
  },
  ultra: {
    id: "ultra",
    label: "Ultra",
    blurb: "Nearly always picks the best line.",
    noise: 0.007,
    powerJitter: 6,
    placementTries: 150,
    randomShotChance: 0,
    thinkTime: 0.85,
  },
};

export const DIFFICULTY_ORDER = ["low", "medium", "high", "veryHigh", "ultra"];

function legalTargets(balls, shooter, groups) {
  if (eightIsOn(shooter, groups, balls)) {
    return balls.filter((b) => !b.pocketed && b.n === 8);
  }
  const types = new Set(legalObjectTypes(shooter, groups));
  return balls.filter((b) => !b.pocketed && types.has(b.type));
}

function ghostBall(obj, pocket) {
  const dx = pocket.x - obj.x;
  const dy = pocket.y - obj.y;
  const len = Math.hypot(dx, dy) || 1;
  const d = obj.r * 2;
  return {
    x: obj.x - (dx / len) * d,
    y: obj.y - (dy / len) * d,
  };
}

function inPlay(p, r) {
  return p.x >= r && p.x <= TABLE.playW - r && p.y >= r && p.y <= TABLE.playH - r;
}

function scoreShot(cue, ghost, obj, pocket) {
  const toGhost = Math.hypot(ghost.x - cue.x, ghost.y - cue.y);
  const toPocket = Math.hypot(pocket.x - obj.x, pocket.y - obj.y);
  const vx = ghost.x - cue.x;
  const vy = ghost.y - cue.y;
  const ox = pocket.x - obj.x;
  const oy = pocket.y - obj.y;
  const cut =
    (vx * ox + vy * oy) /
    ((Math.hypot(vx, vy) || 1) * (Math.hypot(ox, oy) || 1));
  return (1 - Math.max(0, cut)) * 420 + toGhost * 0.35 + toPocket * 0.2;
}

function findShots(balls, shooter, groups) {
  const cue = balls.find((b) => b.n === 0);
  const targets = legalTargets(balls, shooter, groups);
  const found = [];

  for (const obj of targets) {
    for (const pocket of pockets()) {
      const ghost = ghostBall(obj, pocket);
      if (!inPlay(ghost, cue.r)) continue;
      if (!pathClear(balls, obj, pocket, obj.r * 0.92, new Set([obj.n, 0]))) continue;
      if (!pathClear(balls, cue, ghost, cue.r * 0.92, new Set([0, obj.n]))) continue;
      found.push({ ghost, obj, pocket, score: scoreShot(cue, ghost, obj, pocket) });
    }
  }
  found.sort((a, b) => a.score - b.score);
  return found;
}

function pickFromShots(shots, cfg) {
  if (!shots.length) return null;
  if (Math.random() < cfg.randomShotChance) {
    return shots[Math.floor(Math.random() * shots.length)];
  }
  return shots[0];
}

function aimAt(cue, target, cfg) {
  const dx = target.x - cue.x;
  const dy = target.y - cue.y;
  const len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * cfg.noise;
  const dist = Math.min(
    TABLE.maxShotSpeed,
    Math.max(180, 340 + len * 1.05 + (Math.random() - 0.5) * cfg.powerJitter)
  );
  return { vx: Math.cos(ang) * dist, vy: Math.sin(ang) * dist };
}

export function pickBotShot(balls, groups, kitchenOnly, needsPlacement, difficulty = "medium") {
  const cfg = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  const cue = balls.find((b) => b.n === 0);

  if (needsPlacement) {
    const r = TABLE.ballR;
    const samples = [];
    for (let i = 0; i < cfg.placementTries; i++) {
      const x = kitchenOnly
        ? r + Math.random() * Math.max(10, TABLE.headString - 2 * r)
        : r + Math.random() * (TABLE.playW - 2 * r);
      const y = r + Math.random() * (TABLE.playH - 2 * r);
      if (canPlaceCue(x, y, balls, kitchenOnly)) samples.push({ x, y });
    }
    if (canPlaceCue(TABLE.headString * 0.55, TABLE.playH / 2, balls, kitchenOnly)) {
      samples.push({ x: TABLE.headString * 0.55, y: TABLE.playH / 2 });
    }

    let best = null;
    const saved = { x: cue.x, y: cue.y };
    for (const p of samples) {
      cue.x = p.x;
      cue.y = p.y;
      const shots = findShots(balls, "bot", groups);
      const shot = shots[0];
      if (shot && (!best || shot.score < best.score)) best = { ...shot, place: p };
    }
    cue.x = saved.x;
    cue.y = saved.y;

    if (best) {
      cue.x = best.place.x;
      cue.y = best.place.y;
      cue.pocketed = false;
      cue.vx = 0;
      cue.vy = 0;
      return aimAt(cue, best.ghost, cfg);
    }

    const fallback = samples[0] || { x: r * 4, y: TABLE.playH / 2 };
    cue.x = fallback.x;
    cue.y = fallback.y;
    cue.pocketed = false;
    cue.vx = 0;
    cue.vy = 0;
  } else {
    cue.pocketed = false;
  }

  const shot = pickFromShots(findShots(balls, "bot", groups), cfg);
  if (shot) return aimAt(cue, shot.ghost, cfg);

  const targets = legalTargets(balls, "bot", groups);
  const t = targets[0] || balls.find((b) => !b.pocketed && b.n !== 0);
  if (!t) return { vx: 200, vy: 0 };
  return aimAt(cue, t, cfg);
}
