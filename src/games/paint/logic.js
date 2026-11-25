/**
 * Path Painter rules. A board is a grid where some cells are walls. Starting
 * from the brush cell, the player drags one continuous line through
 * orthogonally adjacent cells; it may not cross itself. The level is painted
 * once the line covers every open cell.
 *
 * Levels are generated from a seed: scatter some walls, then search for a path
 * that visits every open cell from a start cell (Warnsdorff's rule — try the
 * neighbour with the fewest onward moves first — with backtracking). The found
 * path is kept as the level's proof of solvability.
 */
import { createRng, hashString } from "../../lib/random";

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function neighbours(cols, rows, i) {
  const x = i % cols;
  const y = Math.floor(i / cols);
  const out = [];
  for (const [dx, dy] of STEPS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
  }
  return out;
}

export const adjacent = (cols, a, b) => {
  const dx = Math.abs((a % cols) - (b % cols));
  const dy = Math.abs(Math.floor(a / cols) - Math.floor(b / cols));
  return dx + dy === 1;
};

/** All open cells reachable from `start` (to reject boards that walls cut in two). */
function reachable(cols, rows, walls, start) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const i = queue.shift();
    for (const j of neighbours(cols, rows, i)) {
      if (walls.has(j) || seen.has(j)) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return seen.size;
}

/**
 * Checkerboard parity: a path alternates colours, so the open cells of each
 * colour may differ by at most one, and the start must be on the larger colour.
 */
function parityOk(cols, open, start) {
  const colour = (i) => ((i % cols) + Math.floor(i / cols)) % 2;
  const dark = open.filter((i) => colour(i) === 0).length;
  const diff = dark - (open.length - dark);
  if (Math.abs(diff) > 1) return false;
  if (diff === 1) return colour(start) === 0;
  if (diff === -1) return colour(start) === 1;
  return true;
}

/** Depth-first search for a path through every open cell, Warnsdorff-ordered. */
function findPath(cols, rows, walls, start, rand, budget = 40000) {
  const total = cols * rows - walls.size;
  const visited = new Set([start]);
  const path = [start];
  let steps = 0;
  const free = (i) => !walls.has(i) && !visited.has(i);
  const onward = (i) => neighbours(cols, rows, i).filter(free).length;

  const dfs = () => {
    if (path.length === total) return true;
    if (++steps > budget) return false;
    const here = path[path.length - 1];
    // Prune: an unvisited cell with no free neighbours (other than next to the
    // head) is stranded, and only one cell can be the path's far end.
    let ends = 0;
    const nearHead = new Set(neighbours(cols, rows, here));
    for (let i = 0; i < cols * rows; i++) {
      if (!free(i)) continue;
      const d = onward(i) + (nearHead.has(i) ? 1 : 0);
      if (d === 0) return false;
      if (d === 1 && !nearHead.has(i) && ++ends > 1) return false;
    }
    const options = neighbours(cols, rows, here)
      .filter(free)
      .map((j) => ({ j, d: onward(j), r: rand() }))
      .sort((a, b) => a.d - b.d || a.r - b.r);
    for (const { j } of options) {
      visited.add(j);
      path.push(j);
      if (dfs()) return true;
      path.pop();
      visited.delete(j);
    }
    return false;
  };
  return dfs() ? path : null;
}

/** Builds level n with `wallCount` walls. @returns {{ name, cols, rows, walls: Set, start, solution }} */
export function buildLevel(n, name, cols, rows, wallCount) {
  const rand = createRng(hashString(`paint:${n}`));
  for (let attempt = 0; attempt < 200; attempt++) {
    const walls = new Set();
    while (walls.size < wallCount) walls.add(Math.floor(rand() * cols * rows));
    const open = [...Array(cols * rows).keys()].filter((i) => !walls.has(i));
    const start = open[Math.floor(rand() * open.length)];
    if (reachable(cols, rows, walls, start) !== open.length) continue;
    if (!parityOk(cols, open, start)) continue;
    const solution = findPath(cols, rows, walls, start, rand);
    if (solution) return { name, cols, rows, walls, start, solution, open: open.length };
  }
  throw new Error(`Path Painter level ${n} has no solution`);
}

/**
 * Applies the pointer moving onto `cell`: extends the line to an adjacent free
 * cell, or steps back when returning to the previous cell. Anything else is
 * ignored. Returns { path, added } (added: +1 extend, -1 undo, 0 nothing).
 */
export function step(cols, walls, path, cell) {
  const head = path[path.length - 1];
  if (cell === head) return { path, added: 0 };
  if (path.length > 1 && cell === path[path.length - 2]) {
    return { path: path.slice(0, -1), added: -1 };
  }
  if (walls.has(cell) || path.includes(cell) || !adjacent(cols, head, cell)) {
    return { path, added: 0 };
  }
  return { path: [...path, cell], added: 1 };
}

export const isPainted = (path, openCount) => path.length === openCount;

/**
 * Stars by wasted moves (cells painted beyond the minimum, from backtracking):
 * 3 within a third of the board, 2 within one and a half boards, else 1.
 */
export function starsFor(moves, openCount) {
  const wasted = Math.max(0, moves - (openCount - 1));
  if (wasted <= Math.ceil(openCount / 3)) return 3;
  if (wasted <= Math.ceil(openCount * 1.5)) return 2;
  return 1;
}
