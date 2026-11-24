/**
 * Daily Puzzle: a 4×4 sliding picture puzzle. Every player gets the same
 * board each day because the shuffle is seeded from the date.
 *
 * A board is an array of 16 tile ids: tile `i` belongs at index `i`, and
 * BLANK (15) is the gap. Shuffling makes random legal moves backwards from
 * the solved picture, so every board is solvable.
 */
import { dayKey } from "../../lib/progress";
import { createRng, hashString } from "../../lib/random";

export const SIZE = 4;
export const BLANK = SIZE * SIZE - 1;
const SHUFFLE_MOVES = 140;
const CAST = ["zip", "bloop", "gloop", "pip", "sunny"];

export const solvedBoard = () => Array.from({ length: SIZE * SIZE }, (_, i) => i);

export const isSolved = (board) => board.every((tile, i) => tile === i);

/** Indexes of cells orthogonally next to `index`. */
export function neighbors(index) {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  const out = [];
  if (r > 0) out.push(index - SIZE);
  if (r < SIZE - 1) out.push(index + SIZE);
  if (c > 0) out.push(index - 1);
  if (c < SIZE - 1) out.push(index + 1);
  return out;
}

/** Slides the tile at `index` into the gap if they touch. Returns a new board or null. */
export function slide(board, index) {
  const gap = board.indexOf(BLANK);
  if (!neighbors(gap).includes(index)) return null;
  const next = [...board];
  [next[gap], next[index]] = [next[index], next[gap]];
  return next;
}

export function shuffledBoard(seed, moves = SHUFFLE_MOVES) {
  const rand = createRng(seed);
  let board = solvedBoard();
  let gap = BLANK;
  let prev = -1;
  for (let i = 0; i < moves || isSolved(board); i++) {
    // Never undo the previous move, so the shuffle really travels.
    const options = neighbors(gap).filter((n) => n !== prev);
    const pick = options[Math.floor(rand() * options.length)];
    board = slide(board, pick);
    prev = gap;
    gap = pick;
  }
  return board;
}

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
