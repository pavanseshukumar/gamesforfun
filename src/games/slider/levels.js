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
  ["Blink Winks", 4, "blink", 64],
  ["Bolt Beeps", 4, "bolt", 78],
  ["Zuzu Lands", 4, "zuzu", 92],
  ["Spike Spins", 4, "spike", 106],
  ["Wobble Wiggles", 5, "wobble", 120],
  ["Mochi Marathon", 5, "mochi", 150],
  ["Grand Gallery", 5, "bolt", 180],
  ["Picture Only", 3, "rex", 30, true],
  ["Bun Portrait", 4, "bun", 60, true],
  ["Pom Sketch", 4, "pom", 90, true],
  ["Blink Blur", 5, "blink", 130, true],
  ["Six by Six", 6, "zuzu", 170],
  ["Mega Mosaic", 6, "spike", 220],
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
