/**
 * Shadow Match: a buddy appears as a solid shadow; pick which of the dressed-up
 * buddies cast it. In a shadow only the outline counts, so options differ in
 * things that change it: the buddy's own ears and tail (when no hat hides
 * them), the hat, and the pose (arms up or down). Glasses and neckwear sit
 * inside the outline, so they never decide a round. Pure and seeded.
 */
import { MASCOTS } from "../buddies";
import { ITEMS } from "../wardrobe";

export const VARIANTS = Object.keys(MASCOTS);
export const HATS = ITEMS.filter((i) => i.slot === "hat").map((i) => i.id);
/** Buddies whose tail still shows under a hat. */
const TAILS = new Set(["rex", "kit"]);

export const SHADOW_DEFAULTS = {
  duration: 60, // seconds
  options: 4, // choices per round (3, 4 or 6)
  startTier: 0,
  penalty: 3, // seconds lost per miss
  suddenDeath: false,
};

/** Correct answers needed to reach each tier. */
export const TIER_AT = [0, 4, 10, 18];
export const tierFor = (correct) => TIER_AT.filter((n) => correct >= n).length - 1;

/**
 * What a shadow looks like: two buddies with the same key cast the same shadow.
 * Under a hat the ears and crests are hidden, so only tails still tell them apart.
 */
export function shapeKey({ variant, hat, pose }) {
  const body = hat ? (TAILS.has(variant) ? variant : "plain") : variant;
  return `${body}|${hat ?? "-"}|${pose}`;
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

/** One candidate buddy: { variant, hat, pose } with pose "down" or "up". */
function candidate(rand, tier, base) {
  if (tier === 0) {
    // Different buddies, no hats: ears, tails and crests tell them apart.
    return { variant: pick(rand, VARIANTS), hat: null, pose: base.pose };
  }
  if (tier === 1) {
    // Same buddy, different hats.
    return { ...base, hat: rand() < 0.2 ? null : pick(rand, HATS) };
  }
  if (tier === 2) {
    // Same buddy: change the hat or the pose.
    return rand() < 0.5
      ? { ...base, hat: pick(rand, HATS) }
      : { ...base, pose: base.pose === "up" ? "down" : "up" };
  }
  // Hardest: a different buddy under the same hat (only tails show), or one change.
  const r = rand();
  if (r < 0.35) return { ...base, variant: pick(rand, VARIANTS) };
  if (r < 0.7) return { ...base, hat: pick(rand, HATS) };
  return { ...base, pose: base.pose === "up" ? "down" : "up" };
}

/**
 * Deals a round.
 * @returns {{ target, options: object[], answer: number }}
 */
export function makeRound(tier, rand, { options = 4 } = {}) {
  const t = Math.max(0, Math.min(3, tier));
  const target = {
    variant: pick(rand, VARIANTS),
    hat: t === 0 ? null : pick(rand, HATS),
    pose: rand() < 0.5 ? "up" : "down",
  };
  if (t === 3 && rand() < 0.5) target.variant = pick(rand, [...TAILS]);
  const seen = new Set([shapeKey(target)]);
  const others = [];
  for (let guard = 0; others.length < options - 1 && guard < 500; guard++) {
    // Fall back to a looser tier if this one runs out of distinct shadows.
    const c = candidate(rand, guard > 200 ? Math.max(0, t - 1) : t, target);
    const key = shapeKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    others.push(c);
  }
  const answer = Math.floor(rand() * options);
  const all = [...others];
  all.splice(answer, 0, target);
  return { target, options: all, answer };
}

/** Points for a right answer: the streak raises a multiplier up to ×4. */
export const multiplierFor = (streak) => Math.min(4, 1 + Math.floor(streak / 4));
