import { getLevels } from "../src/games/pipes/levels";
import { degree, E, flow, N, rotate, S, starsFor, tapsBetween, W } from "../src/games/pipes/logic";

describe("Pipe rules", () => {
  test("a tap turns a pipe 90° clockwise and four taps bring it back", () => {
    expect(rotate(N)).toBe(E);
    expect(rotate(W)).toBe(N);
    expect(rotate(N | E)).toBe(E | S);
    expect(rotate(N | S)).toBe(E | W);
    for (let m = 0; m < 16; m++) expect(rotate(m, 4)).toBe(m);
  });

  test("taps between orientations take symmetry into account", () => {
    expect(tapsBetween(N | S, E | W)).toBe(1);
    expect(tapsBetween(N | S, N | S)).toBe(0);
    expect(tapsBetween(N | E, W | N)).toBe(3);
    expect(tapsBetween(N, N | E)).toBeNull();
  });

  test("water only crosses facing openings", () => {
    // 2×1 board: E-open next to W-open connects; E next to N does not.
    expect(flow(2, 1, [E, W], 0).has(1)).toBe(true);
    expect(flow(2, 1, [E, N], 0).has(1)).toBe(false);
  });

  test("stars", () => {
    expect(starsFor(12, 10)).toBe(3);
    expect(starsFor(13, 10)).toBe(2);
    expect(starsFor(24, 10)).toBe(2);
    expect(starsFor(25, 10)).toBe(1);
  });
});

describe("Pipe Flow levels", () => {
  const levels = getLevels();

  test("15 levels that grow", () => {
    expect(levels).toHaveLength(15);
    for (let i = 1; i < levels.length; i++)
      expect(levels[i].cols * levels[i].rows).toBeGreaterThanOrEqual(
        levels[i - 1].cols * levels[i - 1].rows,
      );
  });

  describe.each(levels.map((l, i) => [i + 1, l]))("Level %i", (n, lvl) => {
    const { cols, rows, solution, start, source, flower, locked, par, path } = lvl;

    test("the solved board is one connected tree of pipes", () => {
      expect(flow(cols, rows, solution, source).size).toBe(cols * rows);
      const edges = solution.reduce((sum, m) => sum + degree(m), 0) / 2;
      expect(edges).toBe(cols * rows - 1);
    });

    test("tap and flower are dead ends, far apart, and fixed in place", () => {
      expect(degree(solution[source])).toBe(1);
      expect(degree(solution[flower])).toBe(1);
      expect(start[source]).toBe(solution[source]);
      expect(start[flower]).toBe(solution[flower]);
      expect(path.length).toBeGreaterThanOrEqual(Math.min(cols, rows));
      for (const i of locked) {
        expect(start[i]).toBe(solution[i]);
        expect(path).toContain(i);
      }
    });

    test("starts unsolved, and par taps along the path solve it", () => {
      expect(flow(cols, rows, start, source).has(flower)).toBe(false);
      const board = [...start];
      let taps = 0;
      for (const i of path) {
        const k = tapsBetween(board[i], solution[i]);
        board[i] = rotate(board[i], k);
        taps += k;
      }
      expect(taps).toBe(par);
      expect(par).toBeGreaterThan(0);
      expect(flow(cols, rows, board, source).has(flower)).toBe(true);
    });
  });
});
