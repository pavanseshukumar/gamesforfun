/**
 * Challenge levels for the arcade games. Each level is plain data:
 *
 *   {
 *     name:       short title shown on the level card
 *     goal:       one-line description of what to do
 *     config:     rule overrides the game understands (time limit, speeds, modes…)
 *     metric:     which end-of-round stat is judged ("score", "combo", …)
 *     thresholds: [1★, 2★, 3★] targets for that metric
 *     lower:      true when a smaller metric is better (e.g. moves)
 *   }
 *
 * Games register their list here; the shared level select, the useChallenge
 * hook and the tests all read from this one place.
 */
import { BOUNCE_LEVELS } from "./bounce/levels";
import { COLOR_CATCH_LEVELS } from "./colorCatch/levels";
import { MATH_LEVELS } from "./math/levels";
import { SLICE_LEVELS } from "./slice/levels";
import { STACK_LEVELS } from "./stack/levels";
import { TAP_RUSH_LEVELS } from "./tapRush/levels";

export const CHALLENGES = {
  "tap-rush": TAP_RUSH_LEVELS,
  stack: STACK_LEVELS,
  bounce: BOUNCE_LEVELS,
  "color-catch": COLOR_CATCH_LEVELS,
  slice: SLICE_LEVELS,
  "quick-math": MATH_LEVELS,
};

export const challengesFor = (gameId) => CHALLENGES[gameId] ?? null;

/** Stars (0–3) a round earns on a level. */
export function starsFor(level, stats) {
  const value = stats[level.metric] ?? 0;
  return level.thresholds.filter((t) => (level.lower ? value <= t : value >= t)).length;
}

/** "⭐ 20 · ⭐⭐ 30 · ⭐⭐⭐ 40"-style target line. */
export const targetsText = (level) =>
  level.thresholds.map((t, i) => `${"⭐".repeat(i + 1)} ${t}`).join("  ·  ");
