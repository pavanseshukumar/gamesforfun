import { createWorld, MAX_PULL } from "../../src/games/blob/world";

const MAX_STEPS = 480; // 8 s per shot

/** Plays a shot to rest. Returns the world afterwards. */
function playShot(level, history, pull) {
  const w = createWorld(level);
  for (const p of [...history, pull]) {
    w.reload();
    w.launch(p);
    for (let i = 0; i < MAX_STEPS; i++) {
      w.step();
      if (i > 20 && w.settled()) break;
    }
  }
  return w;
}

/** All candidate pulls: angles from flat to steep, several strengths. */
export function candidatePulls(fine = false) {
  const out = [];
  const step = fine ? 3 : 6;
  const strengths = fine
    ? [0.4, 0.46, 0.52, 0.58, 0.64, 0.7, 0.76, 0.82, 0.88, 0.94, 1]
    : [0.5, 0.6, 0.7, 0.8, 0.9, 1];
  for (let deg = -10; deg <= 80; deg += step) {
    for (const f of strengths) {
      const a = (deg * Math.PI) / 180;
      // Pull back-and-down from the sling to fire up-and-right.
      out.push({ x: -Math.cos(a) * MAX_PULL * f, y: Math.sin(a) * MAX_PULL * f });
    }
  }
  return out;
}

/** Simulates the level untouched; returns pops and how far blocks drifted. */
export function restCheck(level, steps = 360) {
  const w = createWorld(level);
  const start = w.blocks.map((b) => ({ ...b.position }));
  let pops = 0;
  for (let i = 0; i < steps; i++) pops += w.step().filter((e) => e.type === "pop").length;
  const drift = Math.max(
    0,
    ...w.blocks.map((b, i) => Math.hypot(b.position.x - start[i].x, b.position.y - start[i].y)),
  );
  return { pops, drift };
}

/** Greedy search: best shot each turn. Returns shots used, or null if unsolved. */
export function solve(level, maxShots = 3, fine = false) {
  const history = [];
  const candidates = candidatePulls(fine);
  for (let shot = 1; shot <= maxShots; shot++) {
    let best = null;
    for (const pull of candidates) {
      const w = playShot(level, history, pull);
      const left = w.remaining();
      if (!best || left < best.left) best = { pull, left };
      if (left === 0) break;
    }
    history.push(best.pull);
    if (best.left === 0) return { shots: shot, history };
  }
  return null;
}
