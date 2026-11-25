import { buildLevel } from "./logic";

// [name, cols, rows, scramble taps, shape] — boards grow and get shaped holes.
const SPEC = [
  ["First Glow", 3, 3, 2, "full"],
  ["Night Light", 3, 3, 3, "full"],
  ["Lamp Post", 4, 4, 3, "full"],
  ["Plus Sign", 4, 4, 4, "plus"],
  ["Fireflies", 4, 5, 5, "full"],
  ["Lantern", 5, 5, 5, "ring"],
  ["Star Shine", 5, 5, 6, "diamond"],
  ["City Block", 5, 5, 7, "full"],
  ["Night Market", 5, 6, 7, "plus"],
  ["Lighthouse", 5, 6, 8, "ring"],
  ["Festival", 6, 6, 8, "full"],
  ["Big Diamond", 7, 7, 9, "diamond"],
  ["Skyline", 6, 7, 10, "plus"],
  ["Aurora", 6, 7, 11, "ring"],
  ["Super Nova", 7, 7, 12, "full"],
];

let cache = null;
export function getLevels() {
  if (!cache)
    cache = SPEC.map(([name, c, r, t, shape], i) => buildLevel(i + 1, name, c, r, t, shape));
  return cache;
}

export const LEVEL_NAMES = SPEC.map(([name]) => ({ name }));
