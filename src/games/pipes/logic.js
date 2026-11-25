/**
 * Pipe Flow rules. A board is a grid of pipe tiles; each tile's openings are a
 * bitmask (N=1, E=2, S=4, W=8). Tapping a tile turns it 90° clockwise.
 * Water starts at the tap and runs through every pair of facing openings;
 * a level is solved once it reaches the flower.
 *
 * Levels are generated from a seed: a random spanning tree over the grid gives
 * every cell its pipes (so every tile matters), the tap and flower sit on two
 * far-apart dead ends, and the other tiles are spun to scramble the board.
 */
import { createRng, hashString } from "../../lib/random";

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const DIRS = [N, E, S, W];
const OPPOSITE = { [N]: S, [S]: N, [E]: W, [W]: E };
const STEP = { [N]: [0, -1], [E]: [1, 0], [S]: [0, 1], [W]: [-1, 0] };

/** Turns a mask 90° clockwise `times` times. */
export function rotate(mask, times = 1) {
  let m = mask;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

/** Fewest clockwise taps that turn `from` into `to` (null if impossible). */
export function tapsBetween(from, to) {
  for (let k = 0; k < 4; k++) if (rotate(from, k) === to) return k;
  return null;
}

export const degree = (mask) => DIRS.filter((d) => mask & d).length;

/** Neighbour index in direction d, or -1 off the board. */
export function neighbour(cols, rows, i, d) {
  const [dx, dy] = STEP[d];
  const x = (i % cols) + dx;
  const y = Math.floor(i / cols) + dy;
  return x < 0 || y < 0 || x >= cols || y >= rows ? -1 : y * cols + x;
}

/** Seeded random spanning tree: returns the solved mask of every cell. */
function spanningTree(cols, rows, rand) {
  const masks = new Array(cols * rows).fill(0);
  const seen = new Array(cols * rows).fill(false);
  // Randomised Prim's: a frontier of edges gives a bushier tree than DFS,
  // so boards have more branches to reason about and fewer long corridors.
  const start = Math.floor(rand() * cols * rows);
  seen[start] = true;
  const frontier = DIRS.map((d) => [start, d]);
  while (frontier.length) {
    const k = Math.floor(rand() * frontier.length);
    const [from, d] = frontier[k];
    frontier[k] = frontier[frontier.length - 1];
    frontier.pop();
    const to = neighbour(cols, rows, from, d);
    if (to < 0 || seen[to]) continue;
    seen[to] = true;
    masks[from] |= d;
    masks[to] |= OPPOSITE[d];
    for (const nd of DIRS) frontier.push([to, nd]);
  }
  return masks;
}

/** Cells the water reaches from `source`, given the current masks. */
export function flow(cols, rows, masks, source) {
  const wet = new Set([source]);
  const queue = [source];
  while (queue.length) {
    const i = queue.shift();
    for (const d of DIRS) {
      if (!(masks[i] & d)) continue;
      const j = neighbour(cols, rows, i, d);
      if (j < 0 || wet.has(j) || !(masks[j] & OPPOSITE[d])) continue;
      wet.add(j);
      queue.push(j);
    }
  }
  return wet;
}

/** Path between two cells through the tree's solved pipes. */
function treePath(cols, rows, masks, from, to) {
  const prev = new Map([[from, -1]]);
  const queue = [from];
  while (queue.length) {
    const i = queue.shift();
    if (i === to) break;
    for (const d of DIRS) {
      if (!(masks[i] & d)) continue;
      const j = neighbour(cols, rows, i, d);
      if (j < 0 || prev.has(j)) continue;
      prev.set(j, i);
      queue.push(j);
    }
  }
  const path = [];
  for (let i = to; i !== -1; i = prev.get(i)) path.unshift(i);
  return path;
}

/**
 * Builds level n. `locked` tiles start in place and can't be turned.
 * @returns {{ name, cols, rows, solution, start, source, flower, locked: Set, par, path }}
 */
export function buildLevel(n, name, cols, rows, lockedCount = 0) {
  const rand = createRng(hashString(`pipes:${n}`));
  const solution = spanningTree(cols, rows, rand);
  const leaves = solution.map((m, i) => (degree(m) === 1 ? i : -1)).filter((i) => i >= 0);

  // Tap on a dead end near the top-left, flower on the dead end farthest from it.
  const source = leaves.reduce((a, b) => {
    const score = (i) => (i % cols) + Math.floor(i / cols);
    return score(b) < score(a) ? b : a;
  });
  const dist = (from) => {
    const d = new Array(solution.length).fill(-1);
    d[from] = 0;
    const q = [from];
    while (q.length) {
      const i = q.shift();
      for (const dir of DIRS) {
        if (!(solution[i] & dir)) continue;
        const j = neighbour(cols, rows, i, dir);
        if (j >= 0 && d[j] < 0) {
          d[j] = d[i] + 1;
          q.push(j);
        }
      }
    }
    return d;
  };
  const fromSource = dist(source);
  const flower = leaves.reduce((a, b) => (fromSource[b] > fromSource[a] ? b : a));
  const path = treePath(cols, rows, solution, source, flower);

  // Lock tiles on the path (in place) as hints; never the tap or flower.
  const locked = new Set();
  const candidates = path.slice(1, -1).filter((i) => degree(solution[i]) < 4);
  while (locked.size < Math.min(lockedCount, candidates.length)) {
    locked.add(candidates[Math.floor(rand() * candidates.length)]);
  }

  const fixed = (i) => i === source || i === flower || locked.has(i);
  let start;
  for (let attempt = 0; attempt < 50; attempt++) {
    start = solution.map((m, i) => (fixed(i) ? m : rotate(m, Math.floor(rand() * 4))));
    // A board that's already solved, or whose path is barely scrambled, is no puzzle.
    const scrambled = path.filter((i) => !fixed(i) && start[i] !== solution[i]).length;
    if (!flow(cols, rows, start, source).has(flower) && scrambled >= Math.min(3, path.length - 2))
      break;
  }

  const par = path.reduce((sum, i) => sum + (fixed(i) ? 0 : tapsBetween(start[i], solution[i])), 0);
  return { name, cols, rows, solution, start, source, flower, locked, par, path };
}

/**
 * Par only counts pipes on the water's path, and finding that path takes a few
 * exploratory turns, so stars allow some slack: 3 stars within par + 2 taps,
 * 2 stars within double par + 4, otherwise 1.
 */
export function starsFor(taps, par) {
  if (taps <= par + 2) return 3;
  if (taps <= par * 2 + 4) return 2;
  return 1;
}
