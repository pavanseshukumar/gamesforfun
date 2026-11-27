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
  // Cells on the best route (start → key → exit), for the level's time goal.
  const cells = key == null ? fromStart[exit] : fromStart[key] + distances(maze, key)[exit];
  return { name, maze, start, exit, key, par, cells };
}

/** Seconds knocked off the clock for each gem picked up. */
export const GEM_SECONDS = 3;

/**
 * Seeded gems and teleport pads for a built level.
 * Gems prefer dead ends, so grabbing one is a detour you weigh against the
 * clock. The first pad pair links the early part of the maze to the late part
 * (a shortcut, if you find it); a second pair links two far-apart spots.
 * @returns {{ gems: number[], pads: [number, number][] }}
 */
export function placeExtras(level, n, gemCount, padPairs) {
  const { maze, start, exit, key } = level;
  const rand = createRng(hashString(`maze-extras:${n}`));
  const fromStart = distances(maze, start);
  const far = Math.max(...fromStart);
  const fromExit = distances(maze, exit);
  const route = fromStart[exit];
  const used = new Set([start, exit, key].filter((c) => c != null));
  // Keep the cells right next to the start clear.
  openings(maze, start).forEach((d) => used.add(neighbor(maze, start, d)));
  const free = (c) => !used.has(c);
  const pickFrom = (cells) => {
    const options = cells.filter(free);
    if (!options.length) return null;
    const c = options[Math.floor(rand() * options.length)];
    used.add(c);
    return c;
  };
  const all = maze.walls.map((_, i) => i);
  const band = (lo, hi) => all.filter((c) => fromStart[c] >= far * lo && fromStart[c] <= far * hi);

  const pads = [];
  for (let p = 0; p < padPairs; p++) {
    const a = p === 0 ? pickFrom(band(0.2, 0.45)) : pickFrom(band(0.1, 0.9));
    if (a == null) break;
    const fromA = distances(maze, a);
    // The first pair must cut the start → exit walk by at least a quarter.
    const b =
      p === 0
        ? pickFrom(
            band(0.5, 0.95).filter(
              (c) => fromA[c] >= far * 0.3 && fromStart[a] + fromExit[c] < route * 0.75,
            ),
          )
        : pickFrom(all.filter((c) => fromA[c] >= far * 0.4));
    if (b == null) break;
    pads.push([a, b]);
  }

  const gems = [];
  const deadEnds = all.filter((c) => openings(maze, c).length === 1);
  while (gems.length < gemCount) {
    const c = pickFrom(deadEnds) ?? pickFrom(all.filter((x) => fromStart[x] >= 3));
    if (c == null) break;
    gems.push(c);
  }
  return { gems, pads };
}

/** The other end of a pad pair, or null if `cell` isn't a pad. */
export function padPartner(pads, cell) {
  for (const [a, b] of pads) {
    if (a === cell) return b;
    if (b === cell) return a;
  }
  return null;
}
