/**
 * Picture Slider levels: sliding-tile pictures that grow from 3×3 to 6×6.
 * Levels 13–16 are "picture only": the number hints are switched off.
 * Each board is a fixed seeded scramble ("par" is the scramble's length).
 * Stars are for time (see games/timeStars.js): bigger, more scrambled boards
 * and boards without number hints get longer goals.
 */
import { hashString } from "../../lib/random";
import { scramble } from "../sliding";
import { ceil5 } from "../timeStars";

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

/** Seconds for 3 stars: about 1.5–1.8 s per scramble move, plus a little to get going. */
export function goalFor(par, size, pictureOnly = false) {
  return ceil5((par * (1.2 + 0.1 * size) + 10) * (pictureOnly ? 1.25 : 1));
}

export const LEVELS = SPEC.map(([name, size, variant, moves, pictureOnly = false], i) => {
  const { board, path } = scramble(hashString(`slider:${i + 1}`), size, moves);
  const par = path.length - 1;
  return { name, size, variant, board, par, pictureOnly, goal: goalFor(par, size, pictureOnly) };
});
