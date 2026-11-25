/**
 * Slice Splash rules shared by the game (inside worklets) and the tests.
 * All functions are worklet-safe pure maths.
 */
export const GRAVITY = 900; // px/s²

/** Shortest distance from point (px, py) to segment (ax, ay)–(bx, by). */
export function segmentDistance(px, py, ax, ay, bx, by) {
  "worklet";
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Launch velocity so a body thrown from y0 peaks at peakY (y grows downward). */
export function launchVy(y0, peakY) {
  "worklet";
  return -Math.sqrt(2 * GRAVITY * Math.max(1, y0 - peakY));
}

/** Combo bonus for slicing `n` things in one swipe. */
export const comboBonus = (n) => (n >= 3 ? n : 0);

/** Difficulty over time: seconds between waves, bubbles per wave, grump chance. */
export function waveFor(seconds) {
  "worklet";
  return {
    interval: Math.max(0.7, 1.4 - seconds * 0.01),
    size: Math.min(4, 1 + Math.floor(seconds / 15)),
    grumpChance: Math.min(0.2, 0.08 + seconds * 0.0015),
  };
}
