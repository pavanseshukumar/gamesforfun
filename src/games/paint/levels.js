import { buildLevel } from "./logic";

// [name, cols, rows, walls] — canvases grow and gain more obstacles.
const SPEC = [
  ["First Stroke", 3, 3, 0],
  ["Zig Zag", 3, 4, 1],
  ["Doodle", 4, 4, 1],
  ["Swirl", 4, 5, 3],
  ["Ribbon", 4, 5, 2],
  ["Snake Trail", 5, 5, 3],
  ["Rainbow Road", 5, 5, 2],
  ["Brush Up", 5, 6, 4],
  ["Masterpiece", 5, 6, 3],
  ["Gallery Walk", 6, 6, 5],
  ["Mural", 6, 6, 4],
  ["Splash Art", 6, 7, 6],
  ["Fresco", 6, 7, 5],
  ["Mosaic", 7, 7, 6],
  ["Grand Canvas", 7, 8, 7],
];

let cache = null;
export function getLevels() {
  if (!cache) cache = SPEC.map(([name, c, r, w], i) => buildLevel(i + 1, name, c, r, w));
  return cache;
}

export const LEVEL_NAMES = SPEC.map(([name]) => ({ name }));
