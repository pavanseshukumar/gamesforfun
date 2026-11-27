/**
 * Time-based stars for level games (Picture Slider, Maze Dash). Each level
 * has a `goal` in seconds: finish within it for 3 stars, within twice it for
 * 2, and any finish earns 1.
 */

/** Rounds up to the next multiple of 5 seconds, so goals read nicely. */
export const ceil5 = (s) => Math.ceil(s / 5) * 5;

/** Seconds allowed for each star tier: [3★, 2★]. */
export const starTimes = (goal) => [goal, goal * 2];

export function starsForTime(seconds, goal) {
  const [three, two] = starTimes(goal);
  if (seconds <= three) return 3;
  if (seconds <= two) return 2;
  return 1;
}

/** 1000 per star plus up to 1000 more for finishing quickly. */
export function scoreForTime(seconds, goal) {
  const quick = Math.max(0, Math.round(1000 * (1 - seconds / (goal * 3))));
  return starsForTime(seconds, goal) * 1000 + quick;
}

/** 75 → "1:15". */
export function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
