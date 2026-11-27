import { getLevels } from "../src/games/maze/levels";
import {
  canMove,
  DIRS,
  E,
  generateMaze,
  N,
  openings,
  run,
  S,
  shortestPath,
  swipesBetween,
  W,
} from "../src/games/maze/logic";

/** Counts reachable cells from 0 by flood fill. */
function reachable(maze) {
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const cur = queue.shift();
    const x = cur % maze.cols;
    for (const [d, n] of [
      [N, cur - maze.cols],
      [S, cur + maze.cols],
      [E, x < maze.cols - 1 ? cur + 1 : -1],
      [W, x > 0 ? cur - 1 : -1],
    ]) {
      if (canMove(maze, cur, d) && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen.size;
}

describe("Maze generation", () => {
  test("is perfect: every cell reachable, exactly cells−1 passages, no doors in the border", () => {
    for (const [c, r, seed] of [
      [5, 7, 1],
      [12, 18, 99],
      [15, 21, 2026],
    ]) {
      const m = generateMaze(c, r, seed);
      expect(reachable(m)).toBe(c * r);
      const passages = m.walls.reduce((sum, _, i) => sum + openings(m, i).length, 0) / 2;
      expect(passages).toBe(c * r - 1);
      for (let x = 0; x < c; x++) {
        expect(canMove(m, x, N)).toBe(false);
        expect(canMove(m, (r - 1) * c + x, S)).toBe(false);
      }
      for (let y = 0; y < r; y++) {
        expect(canMove(m, y * c, W)).toBe(false);
        expect(canMove(m, y * c + c - 1, E)).toBe(false);
      }
    }
  });

  test("is the same for the same seed", () => {
    expect(generateMaze(9, 13, 7)).toEqual(generateMaze(9, 13, 7));
    expect(generateMaze(9, 13, 7)).not.toEqual(generateMaze(9, 13, 8));
  });
});

describe("Corridor runs", () => {
  const m = generateMaze(10, 14, 5);

  test("a blocked swipe goes nowhere", () => {
    const blocked = [N, E, S, W].find((d) => !canMove(m, 0, d));
    expect(run(m, 0, blocked)).toEqual([]);
  });

  test("a run stops only at junctions, dead ends or stop cells", () => {
    for (let i = 0; i < m.walls.length; i++) {
      for (const d of openings(m, i)) {
        const path = run(m, i, d);
        const end = path[path.length - 1];
        expect(openings(m, end).length).not.toBe(2);
        // Every cell before the end is a plain corridor cell.
        path.slice(0, -1).forEach((c) => expect(openings(m, c).length).toBe(2));
      }
    }
  });

  test("a run halts on a stop cell even mid-corridor", () => {
    const d = openings(m, 0)[0];
    const full = run(m, 0, d);
    if (full.length > 1) expect(run(m, 0, d, [full[0]])).toEqual([full[0]]);
  });

  test("shortest path connects its ends through open walls", () => {
    const p = shortestPath(m, 0, m.walls.length - 1);
    expect(p[0]).toBe(0);
    expect(p[p.length - 1]).toBe(m.walls.length - 1);
    expect(new Set(p).size).toBe(p.length);
  });

  test("swipe directions map to wall bits", () => {
    expect(DIRS).toEqual({ up: N, right: E, down: S, left: W });
  });
});

describe("Maze Dash levels", () => {
  const levels = getLevels();

  test("grow in size and add keys from level 4", () => {
    expect(levels).toHaveLength(20);
    expect(levels[0].key).toBeNull();
    expect(levels[3].key).not.toBeNull();
    // Lit mazes grow throughout; the dark pack restarts smaller and grows again.
    for (const group of [levels.filter((l) => !l.dark), levels.filter((l) => l.dark)]) {
      expect(group.length).toBeGreaterThan(0);
      for (let i = 1; i < group.length; i++)
        expect(group[i].maze.walls.length).toBeGreaterThan(group[i - 1].maze.walls.length);
    }
    expect(levels.findIndex((l) => l.dark)).toBe(15);
  });

  test("keys sit on dead ends, away from start and exit", () => {
    levels
      .filter((l) => l.key != null)
      .forEach((l) => {
        expect(openings(l.maze, l.key)).toHaveLength(1);
        expect([l.start, l.exit]).not.toContain(l.key);
      });
  });

  test("par is achievable: following the optimal route reaches key then exit in par swipes", () => {
    levels.forEach((l) => {
      const stops = [l.exit, l.key].filter((c) => c != null);
      const total =
        l.key == null
          ? swipesBetween(l.maze, l.start, l.exit, stops)
          : swipesBetween(l.maze, l.start, l.key, stops) +
            swipesBetween(l.maze, l.key, l.exit, stops);
      expect(total).toBe(l.par);
      expect(l.par).toBeGreaterThan(1);
    });
  });

  test("time goals leave room to run the best route, and grow with the maze", () => {
    levels.forEach((l) => {
      // Running the best route takes cells × 55 ms; the goal must allow far more.
      expect(l.goal).toBeGreaterThan(l.cells * 0.055 * 2);
      expect(l.goal % 5).toBe(0);
    });
    const lit = levels.filter((l) => !l.dark);
    expect(lit.at(-1).goal).toBeGreaterThan(lit[0].goal);
    // A dark maze gets more time than the same-size lit one.
    expect(levels[16].goal).toBeGreaterThan(levels[6].goal);
  });
});
