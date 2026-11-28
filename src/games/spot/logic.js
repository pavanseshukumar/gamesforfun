/**
 * Where's Pom?: a busy scene full of buddies; complete each scene's mission.
 *   one  — "Find Kit!": exactly one Kit in the crowd
 *   many — "Find all 3 Buns!": several of one buddy, tap them all
 *   hat  — "Find Kit in the crown!": a few Kits in different hats, one is right
 * Scenes rotate through places (park, beach, snow, and a night park lit by a
 * sweeping torch), and some hide a bonus ⏰ (+time) or ⭐ (+points).
 * Pure and seeded: the tests check every scene is fair.
 */
import { MASCOTS } from "../buddies";
import { ITEMS } from "../wardrobe";

export const VARIANTS = Object.keys(MASCOTS);
export const HATS = ITEMS.filter((i) => i.slot === "hat").map((i) => i.id);
export const HAT_NAMES = Object.fromEntries(
  ITEMS.filter((i) => i.slot === "hat").map((i) => [i.id, i.name]),
);
const MOODS = ["happy", "happy", "cheer", "wow", "cool"];
export const THEMES = ["park", "beach", "snow", "night"];
export const MISSIONS = ["one", "many", "hat"];

export const SPOT_DEFAULTS = {
  duration: 60, // seconds
  crowd: 10, // buddies in the first scene
  growth: 2, // more buddies each scene
  maxCrowd: 34,
  disguise: 0, // chance each buddy wears a hat (0–1)
  bushes: 0, // bushes in the way
  wander: false, // buddies drift about
  penalty: 3, // seconds lost per wrong tap
  missions: null, // which missions to deal (null = unlock as you go)
  themes: null, // which places to visit (null = rotate through them all)
  bonus: 0.5, // chance a scene hides a ⏰ or ⭐
};

/** Seconds a ⏰ adds; points a ⭐ is worth. */
export const CLOCK_SECONDS = 5;
export const STAR_POINTS = 15;

const pickOf = (rand, list) => list[Math.floor(rand() * list.length)];

/** The mission for scene `round`: the first scenes are always simple. */
export function missionFor(round, rand, cfg = SPOT_DEFAULTS) {
  if (cfg.missions?.length) return pickOf(rand, cfg.missions);
  if (round < 2) return "one";
  const pool = round < 4 ? ["one", "many"] : ["one", "many", "hat"];
  return pickOf(rand, pool);
}

/** The place for scene `round`: the night park only after a few scenes. */
export function themeFor(round, cfg = SPOT_DEFAULTS) {
  if (cfg.themes?.length) return cfg.themes[round % cfg.themes.length];
  const order = ["park", "beach", "snow", "park", "night", "beach", "snow", "night"];
  return order[round % order.length];
}

/**
 * Builds scene number `round` (0-based). Positions are fractions of the
 * play area (x, y are centres; size is a fraction of its width).
 */
export function makeScene(round, rand, cfg = SPOT_DEFAULTS) {
  const c = { ...SPOT_DEFAULTS, ...cfg };
  const n = Math.min(c.maxCrowd, c.crowd + round * c.growth);
  const type = missionFor(round, rand, c);
  const target = pickOf(rand, VARIANTS);
  const others = VARIANTS.filter((v) => v !== target);
  const hat = type === "hat" ? pickOf(rand, HATS) : null;
  const count = type === "many" ? (round > 6 ? 3 : 2 + (rand() < 0.4 ? 1 : 0)) : 1;
  // "hat" scenes add look-alikes: the same buddy in other hats (or none).
  const lookalikes = type === "hat" ? 2 + (round > 6 ? 1 : 0) : 0;

  // Spread buddies over a jittered grid so nobody hides fully behind another.
  const cols = n > 24 ? 6 : n > 12 ? 5 : 4;
  const rows = Math.ceil((n * 1.15) / cols) + 1; // a spare row for the bonus
  const cells = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) cells.push([q, r]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const size = Math.min(0.2, 0.9 / cols);
  const otherHats = HATS.filter((h) => h !== hat);
  const at = ([q, r]) => ({
    x: (q + 0.5 + (rand() - 0.5) * 0.45) / cols,
    y: (r + 0.5 + (rand() - 0.5) * 0.45) / rows,
  });
  const buddies = cells.slice(0, n).map((cell, i) => {
    let variant;
    let wear;
    if (i < count) {
      variant = target;
      wear = hat ?? (rand() < c.disguise ? pickOf(rand, HATS) : null);
    } else if (i < count + lookalikes) {
      variant = target;
      wear = rand() < 0.25 ? null : pickOf(rand, otherHats);
    } else {
      variant = pickOf(rand, others);
      wear = rand() < c.disguise ? pickOf(rand, HATS) : null;
    }
    return {
      variant,
      ...at(cell),
      size: size * (0.85 + rand() * 0.3),
      rot: (rand() - 0.5) * 24,
      mood: MOODS[Math.floor(rand() * MOODS.length)],
      hat: wear,
      phase: rand() * Math.PI * 2, // for wandering
      goal: i < count,
    };
  });
  // Shuffle the draw order so the targets aren't always at the back.
  for (let i = buddies.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [buddies[i], buddies[j]] = [buddies[j], buddies[i]];
  }
  const targets = buddies.map((b, i) => (b.goal ? i : -1)).filter((i) => i >= 0);

  // A bonus sits in a spare cell.
  let bonus = null;
  if (rand() < c.bonus && cells.length > n) {
    bonus = { kind: rand() < 0.5 ? "clock" : "star", ...at(cells[n]) };
  }

  // Bushes go in front but never over a target's face.
  const bushes = [];
  for (let guard = 0; bushes.length < c.bushes && guard < 300; guard++) {
    const b = { x: rand(), y: rand(), r: 0.07 + rand() * 0.05 };
    if (
      targets.some(
        (t) => Math.hypot(b.x - buddies[t].x, b.y - buddies[t].y) < b.r + buddies[t].size * 0.55,
      )
    )
      continue;
    bushes.push(b);
  }
  return {
    mission: { type, target, hat, count },
    theme: themeFor(round, c),
    buddies,
    targets,
    bushes,
    bonus,
  };
}

/** Points for finishing a scene `seconds` after it appeared, on a streak. */
export function findPoints(seconds, streak, count = 1) {
  const quick = Math.max(0, Math.round((6 + 2 * (count - 1) - seconds) * 2));
  return (10 + 5 * (count - 1) + quick) * Math.min(3, 1 + Math.floor(streak / 3));
}

/** The torch's spot in the night park at time t (seconds), as area fractions. */
export function torchAt(t) {
  "worklet";
  return {
    x: 0.5 + 0.36 * Math.sin(t * 0.9),
    y: 0.5 + 0.36 * Math.sin(t * 1.37 + 1),
  };
}
