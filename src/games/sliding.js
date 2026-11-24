/**
 * Sliding-tile rules for any N×N board (used by the Daily Puzzle and Picture
 * Slider). A board is an array of N² tile ids: tile `i` belongs at index `i`,
 * and the highest id is the gap. Shuffles walk random legal moves backwards
 * from the solved picture, so every board is solvable.
 */
import { createRng } from "../lib/random";

export const sizeOf = (board) => Math.round(Math.sqrt(board.length));
export const blankOf = (size) => size * size - 1;

export const solvedBoard = (size) => Array.from({ length: size * size }, (_, i) => i);

export const isSolved = (board) => board.every((tile, i) => tile === i);

/** Indexes of cells orthogonally next to `index` on a `size`-wide board. */
export function neighbors(index, size) {
  const r = Math.floor(index / size);
  const c = index % size;
  const out = [];
  if (r > 0) out.push(index - size);
  if (r < size - 1) out.push(index + size);
  if (c > 0) out.push(index - 1);
  if (c < size - 1) out.push(index + 1);
  return out;
}

/** Slides the tile at `index` into the gap if they touch. Returns a new board or null. */
export function slide(board, index) {
  const size = sizeOf(board);
  const gap = board.indexOf(blankOf(size));
  if (!neighbors(gap, size).includes(index)) return null;
  const next = [...board];
  [next[gap], next[index]] = [next[index], next[gap]];
  return next;
}

/**
 * A board scrambled by `moves` random legal slides (never undoing the last one).
 * Returns { board, path } where `path` is the sequence of gap positions, so the
 * scramble length is a known-achievable target ("par").
 */
export function scramble(seed, size, moves) {
  const rand = createRng(seed);
  let board = solvedBoard(size);
  let gap = blankOf(size);
  let prev = -1;
  const path = [gap];
  for (let i = 0; i < moves || isSolved(board); i++) {
    const options = neighbors(gap, size).filter((n) => n !== prev);
    const pick = options[Math.floor(rand() * options.length)];
    board = slide(board, pick);
    prev = gap;
    gap = pick;
    path.push(gap);
  }
  return { board, path };
}
