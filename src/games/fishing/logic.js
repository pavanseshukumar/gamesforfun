/**
 * Fishing Fun: cast, watch the bobber, and tap the moment it dives. Fake
 * nibbles make it twitch first: tap on a nibble and the fish swims off.
 * Rarer fish bite faster and give you less time. Pure, seeded and tested.
 */
import { createRng } from "../../lib/random";

/** What can be on the line. `window` is seconds to tap after the bite. */
export const CATCHES = {
  minnow: { name: "Minnow", points: 10, window: 1.0, weight: 40, colour: "#8FC2FF" },
  sunny: { name: "Sunny Fish", points: 20, window: 0.85, weight: 26, colour: "#FFC93D" },
  puffer: { name: "Puffer", points: 35, window: 0.7, weight: 14, colour: "#FF9F7A" },
  rainbow: { name: "Rainbow Fish", points: 60, window: 0.6, weight: 6, colour: "#C3A2FF" },
  golden: { name: "Golden Fish", points: 150, window: 0.5, weight: 2, colour: "#FFD23F" },
  boot: { name: "Old Boot", points: 0, window: 1.0, weight: 12, colour: "#8A6A55", junk: true },
};
export const KINDS = Object.keys(CATCHES);

/** Seconds the cast flies before the bobber lands, and the reel-in show after a catch. */
export const CAST_S = 0.6;
export const REEL_S = 1.1;

export const FISHING_DEFAULTS = {
  duration: 60, // seconds
  rareBoost: 1, // × the chance of puffer / rainbow / golden
  junk: 1, // × the chance of an old boot
  windowScale: 1, // × the time to react after a bite
  nibbles: 1, // × how many fake nibbles come first
  waitScale: 1, // × how long before the bite
};

/** Picks what bites, by weight. */
export function pickCatch(rand, cfg = FISHING_DEFAULTS) {
  const c = { ...FISHING_DEFAULTS, ...cfg };
  const weights = KINDS.map((k) => {
    const w = CATCHES[k].weight;
    if (CATCHES[k].junk) return w * c.junk;
    return ["puffer", "rainbow", "golden"].includes(k) ? w * c.rareBoost : w;
  });
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < KINDS.length; i++) {
    r -= weights[i];
    if (r <= 0) return KINDS[i];
  }
  return KINDS[0];
}

/**
 * Plans one cast: when the fake nibbles come, when the real bite comes, and
 * how long you then have. Times are seconds after the bobber lands.
 */
export function planCast(rand, cfg = FISHING_DEFAULTS) {
  const c = { ...FISHING_DEFAULTS, ...cfg };
  const kind = pickCatch(rand, c);
  const bite = (1.4 + rand() * 3.2) * c.waitScale;
  const count = Math.round((rand() * 2.4 + (kind === "golden" ? 1 : 0)) * c.nibbles);
  const nibbles = [];
  for (let i = 0; i < count; i++) {
    const t = 0.5 + rand() * (bite - 0.9);
    if (t > 0.4 && t < bite - 0.45) nibbles.push(+t.toFixed(2));
  }
  nibbles.sort((a, b) => a - b);
  const window = CATCHES[kind].window * c.windowScale;
  return { kind, bite, window, nibbles };
}

/**
 * Judges a tap `t` seconds after the bobber landed.
 * @returns {"early"|"caught"|"late"} early: before the bite (scares it off) ·
 *   caught: during the bite · late: the fish already got away
 */
export function judge(plan, t) {
  if (t < plan.bite) return "early";
  if (t <= plan.bite + plan.window) return "caught";
  return "late";
}

/** Is the bobber twitching (a nibble) at time t? Each nibble lasts 0.25 s. */
export const nibbling = (plan, t) => plan.nibbles.some((n) => t >= n && t < n + 0.25);

/** A seeded run of casts (handy for tests and replays). */
export function castSeries(seed, cfg, n) {
  const rand = createRng(seed);
  return Array.from({ length: n }, () => planCast(rand, cfg));
}
