/**
 * Picture Slider levels: sliding-tile pictures that grow from 3×3 to 5×5.
 * Each board is a fixed seeded scramble, and "par" is the scramble's length —
 * always achievable (undo the scramble), so 3 stars is always within reach.
 */
import { hashString } from "../../lib/random";
import { scramble } from "../sliding";

const SPEC = [
  // [name, size, mascot, scramble moves]
  ["Zip Says Hi", 3, "zip", 20],
  ["Bloop's Glasses", 3, "bloop", 26],
  ["Gloop Glows", 3, "gloop", 32],
  ["Pip's Bow", 3, "pip", 40],
  ["Sunny Side Up", 4, "sunny", 50],
  ["Zip Zooms", 4, "zip", 64],
  ["Bloop Blinks", 4, "bloop", 78],
  ["Gloop Hops", 4, "gloop", 92],
  ["Pip Picnic", 4, "pip", 106],
  ["Sunny Day", 5, "sunny", 120],
  ["Zip Marathon", 5, "zip", 150],
  ["Grand Gallery", 5, "bloop", 180],
];

export const LEVELS = SPEC.map(([name, size, variant, moves], i) => {
  const { board, path } = scramble(hashString(`slider:${i + 1}`), size, moves);
  return { name, size, variant, board, par: path.length - 1 };
});

/** 3 stars at or under par, 2 within 60% over, otherwise 1. */
export function starsFor(moves, par) {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.6)) return 2;
  return 1;
}

/** 1000 per star plus a bonus for being quick and tidy. */
export function scoreFor(moves, par, seconds) {
  const tidy = Math.max(0, 1000 - Math.max(0, moves - par) * 10);
  const quick = Math.max(0, 1000 - seconds * 4);
  return starsFor(moves, par) * 1000 + tidy + quick;
}
