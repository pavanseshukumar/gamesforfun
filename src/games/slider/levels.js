/**
 * Picture Slider levels: sliding-tile pictures that grow from 3×3 to 6×6.
 * Levels 13–16 are "picture only": the number hints are switched off.
 * Each board is a fixed seeded scramble, and "par" is the scramble's length —
 * always achievable (undo the scramble), so 3 stars is always within reach.
 */
import { hashString } from "../../lib/random";
import { scramble } from "../sliding";

const SPEC = [
  // [name, size, mascot, scramble moves, picture only?]
  ["Mochi Says Hi", 3, "mochi", 20],
  ["Bun's Ears", 3, "bun", 26],
  ["Rex Roars", 3, "rex", 32],
  ["Pom's Picnic", 3, "pom", 40],
  ["Pengu Slides", 4, "pengu", 50],
  ["Peep Cheeps", 4, "peep", 64],
  ["Koko Climbs", 4, "koko", 78],
  ["Hop Hops", 4, "hop", 92],
  ["Kit Sneaks", 4, "kit", 106],
  ["Hoot Hoots", 5, "hoot", 120],
  ["Mochi Marathon", 5, "mochi", 150],
  ["Grand Gallery", 5, "koko", 180],
  ["Picture Only", 3, "rex", 30, true],
  ["Bun Portrait", 4, "bun", 60, true],
  ["Pom Sketch", 4, "pom", 90, true],
  ["Peep Blur", 5, "peep", 130, true],
  ["Six by Six", 6, "hop", 170],
  ["Mega Mosaic", 6, "kit", 220],
];

export const LEVELS = SPEC.map(([name, size, variant, moves, pictureOnly = false], i) => {
  const { board, path } = scramble(hashString(`slider:${i + 1}`), size, moves);
  return { name, size, variant, board, par: path.length - 1, pictureOnly };
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
