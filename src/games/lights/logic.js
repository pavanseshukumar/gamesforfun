/**
 * Light It Up rules. A board is a grid of cells that are lit (true), dark
 * (false) or missing (null, a hole in shaped boards). Tapping a cell flips it
 * and its four neighbours. The goal is to light every cell.
 *
 * Levels start from a fully lit board and apply a seeded set of distinct taps,
 * so every board is solvable: tapping those same cells again undoes it. Taps
 * commute and cancel in pairs, so the cells still needing a tap are always
 * (scramble taps) XOR (player taps), which powers the hint.
 */
import { createRng, hashString } from "../../lib/random";

const NEIGHBOURS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Cells flipped by tapping cell i (itself and existing orthogonal neighbours). */
export function affected(cols, rows, cells, i) {
  const x = i % cols;
  const y = Math.floor(i / cols);
  const out = [];
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    const j = ny * cols + nx;
    if (cells[j] !== null) out.push(j);
  }
  return out;
}

/** Returns a new board with cell i tapped. */
export function tap(cols, rows, cells, i) {
  if (cells[i] === null) return cells;
  const next = [...cells];
  for (const j of affected(cols, rows, cells, i)) next[j] = !next[j];
  return next;
}

export const isSolved = (cells) => cells.every((c) => c !== false);
export const litCount = (cells) => cells.filter((c) => c === true).length;
export const cellCount = (cells) => cells.filter((c) => c !== null).length;

/** Shapes: which cells exist. "full", "plus" (corners cut), "ring" (hole in the middle), "diamond". */
function shapeMask(cols, rows, shape) {
  return Array.from({ length: cols * rows }, (_, i) => {
    const x = i % cols;
    const y = Math.floor(i / cols);
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    if (shape === "plus") {
      const corner = (x === 0 || x === cols - 1) && (y === 0 || y === rows - 1);
      return !corner;
    }
    if (shape === "ring") return !(Math.abs(x - cx) < 1 && Math.abs(y - cy) < 1);
    if (shape === "diamond") return Math.abs(x - cx) + Math.abs(y - cy) <= Math.max(cx, cy) + 0.5;
    return true;
  });
}

/**
 * Builds level n: a lit board of the given shape, scrambled by `taps` distinct
 * seeded taps. `par` is the scramble's tap count (a solution of that length
 * always exists; clever players may find a shorter one).
 */
export function buildLevel(n, name, cols, rows, taps, shape = "full") {
  const rand = createRng(hashString(`lights:${n}`));
  const mask = shapeMask(cols, rows, shape);
  const solved = mask.map((m) => (m ? true : null));
  const open = solved.map((c, i) => (c === null ? -1 : i)).filter((i) => i >= 0);

  for (let attempt = 0; attempt < 100; attempt++) {
    const pool = [...open];
    const chosen = [];
    while (chosen.length < Math.min(taps, pool.length)) {
      const k = Math.floor(rand() * pool.length);
      chosen.push(pool.splice(k, 1)[0]);
    }
    let start = solved;
    for (const i of chosen) start = tap(cols, rows, start, i);
    // Insist on a properly dark board: no accidental solves, at least a third unlit.
    if (!isSolved(start) && cellCount(start) - litCount(start) >= Math.ceil(open.length / 3)) {
      return {
        name,
        cols,
        rows,
        shape,
        start,
        scramble: chosen.sort((a, b) => a - b),
        par: chosen.length,
      };
    }
  }
  throw new Error(`Light It Up level ${n} could not be scrambled`);
}

/** Cells that still need one tap, given the scramble and the player's taps so far. */
export function remainingTaps(scramble, playerTaps) {
  const need = new Set(scramble);
  for (const i of playerTaps) {
    if (need.has(i)) need.delete(i);
    else need.add(i);
  }
  return [...need];
}

/** Stars: 3 at or under par with no hints, 2 within double par (or with hints), else 1. */
export function starsFor(taps, par, hints = 0) {
  if (taps <= par && hints === 0) return 3;
  if (taps <= par * 2 + 2) return 2;
  return 1;
}
