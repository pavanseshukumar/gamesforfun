import { buildLevel } from "./logic";

// [name, cols, rows, locked tiles] — gardens grow; from level 6 a few pipes are
// bolted in place (already right) as hints on the bigger boards.
const SPEC = [
  ["First Drops", 3, 4, 0],
  ["Garden Hose", 4, 4, 0],
  ["Twisty Tap", 4, 5, 0],
  ["Splash Down", 5, 5, 0],
  ["Watering Can", 5, 6, 0],
  ["Bolted Down", 5, 6, 2],
  ["Sprinkler", 6, 6, 0],
  ["Pipe Dream", 6, 7, 3],
  ["Leaky Lane", 6, 8, 0],
  ["Big Garden", 7, 8, 3],
  ["Waterworks", 7, 9, 0],
  ["Rain Barrel", 7, 9, 4],
  ["Aqueduct", 8, 10, 0],
  ["Fountain Square", 8, 10, 4],
  ["Grand Canal", 8, 11, 0],
];

let cache = null;
/** Built lazily on first use. */
export function getLevels() {
  if (!cache) cache = SPEC.map(([name, c, r, locked], i) => buildLevel(i + 1, name, c, r, locked));
  return cache;
}

export const LEVEL_NAMES = SPEC.map(([name]) => ({ name }));
