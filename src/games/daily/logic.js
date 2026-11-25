/**
 * Daily Puzzle: a 4×4 sliding picture puzzle. Every player gets the same
 * board each day because the shuffle is seeded from the date.
 *
 * A board is an array of 16 tile ids: tile `i` belongs at index `i`, and
 * BLANK (15) is the gap. Shuffling makes random legal moves backwards from
 * the solved picture, so every board is solvable.
 */
import { dayKey } from "../../lib/progress";
import { hashString } from "../../lib/random";
import * as sliding from "../sliding";

export const SIZE = 4;
export const BLANK = sliding.blankOf(SIZE);
const SHUFFLE_MOVES = 140;
const CAST = ["zip", "bloop", "gloop", "pip", "sunny"];

export const solvedBoard = () => sliding.solvedBoard(SIZE);
export const isSolved = sliding.isSolved;
export const neighbors = (index) => sliding.neighbors(index, SIZE);
export const slide = sliding.slide;
export const shuffledBoard = (seed, moves = SHUFFLE_MOVES) =>
  sliding.scramble(seed, SIZE, moves).board;

// The seed keeps the app's original name on purpose: changing it would change every
// daily puzzle (including today's) and break server-side checks of daily results.
export const seedForDay = (day = dayKey()) => hashString(`gamesforfun:${day}`);

export const todaysBoard = (day = dayKey()) => shuffledBoard(seedForDay(day));

/** The mascot whose picture is today's puzzle. */
export const mascotOfDay = (day = dayKey()) => CAST[seedForDay(day) % CAST.length];

/** Longest run of consecutive solved days in a { day: moves } map. */
export function longestDailyRun(daily) {
  const days = Object.keys(daily).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    const t = new Date(`${d}T12:00:00`);
    run = prev && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** Fewer moves earn more XP; a first daily solve is always worth at least 30. */
export const dailyXp = (moves) => 30 + Math.max(0, Math.round((220 - moves) / 4));
