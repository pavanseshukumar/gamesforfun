/**
 * Where's Pom?: a park full of buddies; find the one you're asked for. Each
 * scene has exactly one of the target buddy. Crowds grow, buddies put on hats
 * (which hide their ears), bushes get in the way and later they wander about.
 * Pure and seeded: the tests check every scene is fair.
 */
import { MASCOTS } from "../buddies";
import { ITEMS } from "../wardrobe";

export const VARIANTS = Object.keys(MASCOTS);
const HATS = ITEMS.filter((i) => i.slot === "hat").map((i) => i.id);
const MOODS = ["happy", "happy", "cheer", "wow", "cool"];

export const SPOT_DEFAULTS = {
  duration: 60, // seconds
  crowd: 10, // buddies in the first scene
  growth: 2, // more buddies each scene
  maxCrowd: 34,
  disguise: 0, // chance each buddy wears a hat (0–1)
  bushes: 0, // bushes in the way
  wander: false, // buddies drift about
  penalty: 3, // seconds lost per wrong tap
};

/**
 * Builds scene number `round` (0-based). Positions are fractions of the
 * play area (x, y are centres; size is a fraction of its width).
 */
export function makeScene(round, rand, cfg = SPOT_DEFAULTS) {
  const c = { ...SPOT_DEFAULTS, ...cfg };
  const n = Math.min(c.maxCrowd, c.crowd + round * c.growth);
  const target = VARIANTS[Math.floor(rand() * VARIANTS.length)];
  const others = VARIANTS.filter((v) => v !== target);

  // Spread buddies over a jittered grid so nobody hides fully behind another.
  const cols = n > 24 ? 6 : n > 12 ? 5 : 4;
  const rows = Math.ceil((n * 1.15) / cols);
  const cells = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) cells.push([q, r]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const size = Math.min(0.2, 0.9 / cols);
  const buddies = cells.slice(0, n).map(([q, r], i) => ({
    variant: i === 0 ? target : others[Math.floor(rand() * others.length)],
    x: (q + 0.5 + (rand() - 0.5) * 0.45) / cols,
    y: (r + 0.5 + (rand() - 0.5) * 0.45) / rows,
    size: size * (0.85 + rand() * 0.3),
    rot: (rand() - 0.5) * 24,
    mood: MOODS[Math.floor(rand() * MOODS.length)],
    hat: rand() < c.disguise ? HATS[Math.floor(rand() * HATS.length)] : null,
    phase: rand() * Math.PI * 2, // for wandering
  }));
  // Shuffle the draw order so the target isn't always at the back.
  const order = buddies.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const drawn = order.map((i) => buddies[i]);
  const targetIndex = order.indexOf(0);

  // Bushes go in front but never over the target's face.
  const t = drawn[targetIndex];
  const bushes = [];
  for (let guard = 0; bushes.length < c.bushes && guard < 200; guard++) {
    const b = { x: rand(), y: rand(), r: 0.07 + rand() * 0.05 };
    if (Math.hypot(b.x - t.x, b.y - t.y) < b.r + t.size * 0.55) continue;
    bushes.push(b);
  }
  return { target, buddies: drawn, targetIndex, bushes };
}

/** Points for finding the buddy `seconds` after the scene appeared, on a streak. */
export function findPoints(seconds, streak) {
  const quick = Math.max(0, Math.round((6 - seconds) * 2));
  return (10 + quick) * Math.min(3, 1 + Math.floor(streak / 3));
}
