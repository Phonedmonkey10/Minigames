export const TABLE = {
  playW: 900,
  playH: 450,
  rail: 36,
  ballR: 11,
  pocketR: 24,
  sidePocketR: 22,
  restitution: 0.72,
  ballRestitution: 0.96,
  friction: 125,
  stopSpeed: 5,
  maxShotSpeed: 920,
  headString: 225,
};

export const BALL_COLORS = {
  1: "#f0d000",
  2: "#1e5aa8",
  3: "#c62828",
  4: "#6a1b9a",
  5: "#ef6c00",
  6: "#2e7d32",
  7: "#4e1c1c",
  8: "#111111",
  9: "#f0d000",
  10: "#1e5aa8",
  11: "#c62828",
  12: "#6a1b9a",
  13: "#ef6c00",
  14: "#2e7d32",
  15: "#4e1c1c",
};

export function canvasSize() {
  return {
    w: TABLE.playW + TABLE.rail * 2,
    h: TABLE.playH + TABLE.rail * 2,
  };
}

export function playToCanvas(x, y) {
  return { x: x + TABLE.rail, y: y + TABLE.rail };
}

export function canvasToPlay(x, y) {
  return { x: x - TABLE.rail, y: y - TABLE.rail };
}

export function pockets() {
  const { playW: w, playH: h } = TABLE;
  return [
    { x: 0, y: 0, corner: true },
    { x: w / 2, y: 0, corner: false },
    { x: w, y: 0, corner: true },
    { x: 0, y: h, corner: true },
    { x: w / 2, y: h, corner: false },
    { x: w, y: h, corner: true },
  ];
}

export function pocketRadius(pocket) {
  return pocket.corner ? TABLE.pocketR : TABLE.sidePocketR;
}

export function ballType(n) {
  if (n === 0) return "cue";
  if (n === 8) return "eight";
  if (n <= 7) return "solids";
  return "stripes";
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeRack() {
  const r = TABLE.ballR;
  const d = 2 * r + 0.35;
  const apexX = TABLE.playW * 0.75;
  const apexY = TABLE.playH / 2;
  const positions = [];

  for (let row = 0; row < 5; row++) {
    const count = row + 1;
    const x = apexX + row * d * Math.sqrt(3) / 2;
    for (let i = 0; i < count; i++) {
      const y = apexY + (i - (count - 1) / 2) * d;
      positions.push({ x, y, row, i, count });
    }
  }

  const remaining = shuffled([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]);
  const numbers = new Array(15);

  numbers[0] = remaining.pop();

  const centerIndex = positions.findIndex((p) => p.row === 2 && p.i === 1);
  numbers[centerIndex] = 8;

  const backLeft = positions.findIndex((p) => p.row === 4 && p.i === 0);
  const backRight = positions.findIndex((p) => p.row === 4 && p.i === 4);

  const solids = remaining.filter((n) => n <= 7);
  const stripes = remaining.filter((n) => n >= 9);
  const cornerA = solids.pop();
  const cornerB = stripes.pop();
  if (Math.random() < 0.5) {
    numbers[backLeft] = cornerA;
    numbers[backRight] = cornerB;
  } else {
    numbers[backLeft] = cornerB;
    numbers[backRight] = cornerA;
  }

  const rest = shuffled([...solids, ...stripes]);
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] == null) numbers[i] = rest.pop();
  }

  const balls = [
    {
      n: 0,
      x: TABLE.headString,
      y: TABLE.playH / 2,
      vx: 0,
      vy: 0,
      r,
      pocketed: false,
      type: "cue",
    },
  ];

  positions.forEach((p, idx) => {
    const n = numbers[idx];
    balls.push({
      n,
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      r,
      pocketed: false,
      type: ballType(n),
    });
  });

  return balls;
}

export function respotBall(ball, balls) {
  const r = TABLE.ballR;
  const spots = [];
  const footX = TABLE.playW * 0.75;
  const midY = TABLE.playH / 2;
  for (let i = 0; i < 40; i++) {
    spots.push({ x: footX - i * (2 * r + 1), y: midY });
  }
  for (let i = 1; i < 20; i++) {
    spots.push({ x: footX, y: midY - i * (2 * r + 1) });
    spots.push({ x: footX, y: midY + i * (2 * r + 1) });
  }

  const clear = (x, y) => {
    if (x < r || x > TABLE.playW - r || y < r || y > TABLE.playH - r) return false;
    return balls.every(
      (b) => b === ball || b.pocketed || Math.hypot(b.x - x, b.y - y) >= 2 * r + 0.8
    );
  };

  for (const s of spots) {
    if (clear(s.x, s.y)) {
      ball.x = s.x;
      ball.y = s.y;
      ball.vx = 0;
      ball.vy = 0;
      ball.pocketed = false;
      return;
    }
  }

  ball.x = TABLE.playW / 2;
  ball.y = TABLE.playH / 2;
  ball.vx = 0;
  ball.vy = 0;
  ball.pocketed = false;
}

export function isInKitchen(x) {
  return x <= TABLE.headString;
}

export function canPlaceCue(x, y, balls, kitchenOnly) {
  const r = TABLE.ballR;
  if (x < r || x > TABLE.playW - r || y < r || y > TABLE.playH - r) return false;
  if (kitchenOnly && !isInKitchen(x)) return false;
  for (const b of balls) {
    if (b.pocketed || b.n === 0) continue;
    if (Math.hypot(b.x - x, b.y - y) < 2 * r + 0.6) return false;
  }
  return true;
}
