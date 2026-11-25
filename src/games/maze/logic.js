/**
 * Maze Dash rules. A maze is { cols, rows, walls } where walls[i] is a bitmask
 * of the walls still standing around cell i (N=1, E=2, S=4, W=8).
 * Mazes are "perfect": exactly one path between any two cells.
 */
import { createRng, hashString } from "../../lib/random";

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
export const DIRS = { up: N, right: E, down: S, left: W };
const OPPOSITE = { [N]: S, [S]: N, [E]: W, [W]: E };
const STEP = { [N]: [0, -1], [S]: [0, 1], [E]: [1, 0], [W]: [-1, 0] };

export const cellOf = (maze, x, y) => y * maze.cols + x;
export const xyOf = (maze, i) => [i % maze.cols, Math.floor(i / maze.cols)];

/** Generates a perfect maze with a seeded depth-first carve (iterative). */
export function generateMaze(cols, rows, seed) {
  const rand = createRng(seed);
  const walls = new Array(cols * rows).fill(N | E | S | W);
  const seen = new Array(cols * rows).fill(false);
  const stack = [0];
  seen[0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    const options = [N, E, S, W].filter((d) => {
      const [dx, dy] = STEP[d];
      const nx = cx + dx;
      const ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny * cols + nx];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const d = options[Math.floor(rand() * options.length)];
    const [dx, dy] = STEP[d];
    const next = (cy + dy) * cols + (cx + dx);
    walls[cur] &= ~d;
    walls[next] &= ~OPPOSITE[d];
    seen[next] = true;
    stack.push(next);
  }
  return { cols, rows, walls };
}

export const canMove = (maze, i, d) => (maze.walls[i] & d) === 0;

/** Directions open from cell i. */
export const openings = (maze, i) => [N, E, S, W].filter((d) => canMove(maze, i, d));

export function neighbor(maze, i, d) {
  const [x, y] = xyOf(maze, i);
  const [dx, dy] = STEP[d];
  return cellOf(maze, x + dx, y + dy);
}

/**
 * Moves from `start` in direction `d`, then keeps following the corridor
 * (around corners) until reaching a junction, a dead end, or a stop cell
 * (exit or key). Returns the list of cells entered, empty if blocked.
 */
export function run(maze, start, d, stops = []) {
  if (!canMove(maze, start, d)) return [];
  const path = [];
  let cur = start;
  let dir = d;
  for (let guard = 0; guard < maze.walls.length; guard++) {
    cur = neighbor(maze, cur, dir);
    path.push(cur);
    if (stops.includes(cur)) break;
    const exits = openings(maze, cur).filter((o) => o !== OPPOSITE[dir]);
    if (exits.length !== 1) break; // junction or dead end
    dir = exits[0];
  }
  return path;
}

/** Shortest path (list of cells, inclusive) between two cells. */
export function shortestPath(maze, from, to) {
  const prev = new Array(maze.walls.length).fill(-1);
  const queue = [from];
  prev[from] = from;
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) break;
    for (const d of openings(maze, cur)) {
      const n = neighbor(maze, cur, d);
      if (prev[n] === -1) {
        prev[n] = cur;
        queue.push(n);
      }
    }
  }
  const path = [to];
  while (path[0] !== from) path.unshift(prev[path[0]]);
  return path;
}

/** Distances from `from` to every cell. */
function distances(maze, from) {
  const dist = new Array(maze.walls.length).fill(-1);
  dist[from] = 0;
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const d of openings(maze, cur)) {
      const n = neighbor(maze, cur, d);
      if (dist[n] === -1) {
        dist[n] = dist[cur] + 1;
        queue.push(n);
      }
    }
  }
  return dist;
}

/** Fewest swipes to walk `from → to` with corridor-following runs. */
export function swipesBetween(maze, from, to, stops) {
  const path = shortestPath(maze, from, to);
  let pos = from;
  let swipes = 0;
  while (pos !== to) {
    const next = path[path.indexOf(pos) + 1];
    const d = [N, E, S, W].find(
      (dir) => canMove(maze, pos, dir) && neighbor(maze, pos, dir) === next,
    );
    const moved = run(maze, pos, d, stops);
    pos = moved[moved.length - 1];
    swipes++;
  }
  return swipes;
}

/**
 * Builds a level: start top-left, exit at the cell farthest from the start,
 * and (optionally) a key on the dead end that makes the biggest detour.
 */
export function buildLevel(n, name, cols, rows, withKey) {
  const maze = generateMaze(cols, rows, hashString(`maze:${n}`));
  const start = 0;
  const fromStart = distances(maze, start);
  const exit = fromStart.indexOf(Math.max(...fromStart));
  let key = null;
  if (withKey) {
    const fromExit = distances(maze, exit);
    let best = -1;
    maze.walls.forEach((_, i) => {
      if (i === start || i === exit || openings(maze, i).length !== 1) return;
      const detour = fromStart[i] + fromExit[i];
      if (detour > best) {
        best = detour;
        key = i;
      }
    });
  }
  const stops = [exit, key].filter((c) => c != null);
  const par =
    key == null
      ? swipesBetween(maze, start, exit, stops)
      : swipesBetween(maze, start, key, stops) + swipesBetween(maze, key, exit, stops);
  return { name, maze, start, exit, key, par };
}

/** 3 stars at or under par swipes, 2 within 50% over, otherwise 1. */
export function starsFor(swipes, par) {
  if (swipes <= par) return 3;
  if (swipes <= Math.ceil(par * 1.5)) return 2;
  return 1;
}

export function scoreFor(swipes, par, seconds) {
  return (
    starsFor(swipes, par) * 1000 +
    Math.max(0, 1000 - seconds * 5) +
    Math.max(0, 500 - (swipes - par) * 25)
  );
}
