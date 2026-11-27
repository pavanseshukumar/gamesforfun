import { ceil5 } from "../timeStars";
import { buildLevel } from "./logic";

// [name, cols, rows, key?, dark?] — mazes grow and keys arrive from level 4;
// levels 16–20 are dark: only a small circle around Dash is lit.
const SPEC = [
  ["First Steps", 5, 7, false],
  ["Twisty Turns", 6, 8, false],
  ["Garden Path", 7, 9, false],
  ["Find the Key", 7, 10, true],
  ["Hedge Hop", 8, 11, false],
  ["Locked Up", 8, 12, true],
  ["Long Way Round", 9, 13, false],
  ["Key Quest", 9, 14, true],
  ["Mazey Days", 10, 15, false],
  ["Deep Woods", 11, 16, true],
  ["Spiral Sprint", 11, 17, false],
  ["Vault Run", 12, 18, true],
  ["Labyrinth", 13, 19, false],
  ["Grand Maze", 14, 20, true],
  ["The Big One", 15, 21, true],
  ["Lights Out", 7, 10, false, true],
  ["Night Walk", 9, 13, false, true],
  ["Moonlit Key", 9, 14, true, true],
  ["Midnight Hedge", 11, 16, false, true],
  ["Darkest Vault", 12, 18, true, true],
];

/**
 * Seconds for 3 stars: time to run and look along the best route, a little over a second per
 * swipe to decide, and extra for dark mazes where you can't see ahead.
 */
export function goalFor(cells, par, dark) {
  return ceil5((cells * 0.12 + par * 1.2 + 5) * (dark ? 1.4 : 1));
}

const withGoal = (level, dark) => ({ ...level, goal: goalFor(level.cells, level.par, dark) });

let cache = null;
/** Built lazily on first use (generation + pathfinding for every maze). */
export function getLevels() {
  if (!cache)
    cache = SPEC.map(([name, c, r, key, dark = false], i) => ({
      ...withGoal(buildLevel(i + 1, name, c, r, key), dark),
      dark,
    }));
  return cache;
}

export const LEVEL_NAMES = SPEC.map(([name]) => ({ name }));
