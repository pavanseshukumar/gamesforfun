import { getLevels } from "../src/games/paint/levels";
import { adjacent, isPainted, starsFor, step } from "../src/games/paint/logic";

describe("Path Painter rules", () => {
  const walls = new Set([4]);
  test("the line extends to adjacent free cells only", () => {
    expect(step(3, walls, [0], 1)).toEqual({ path: [0, 1], added: 1 });
    expect(step(3, walls, [0], 4).added).toBe(0); // wall
    expect(step(3, walls, [0], 2).added).toBe(0); // not adjacent
    expect(step(3, walls, [0, 1, 2, 5], 2).added).toBe(-1); // back onto previous: undo
    expect(step(3, walls, [0, 1, 2, 5, 8, 7, 6, 3], 0).added).toBe(0); // can't cross itself
  });

  test("adjacency doesn't wrap around rows", () => {
    expect(adjacent(3, 2, 3)).toBe(false);
    expect(adjacent(3, 2, 5)).toBe(true);
  });

  test("stars reward little backtracking", () => {
    expect(starsFor(8, 9)).toBe(3);
    expect(starsFor(11, 9)).toBe(3);
    expect(starsFor(12, 9)).toBe(2);
    expect(starsFor(30, 9)).toBe(1);
    expect(isPainted([0, 1], 2)).toBe(true);
  });
});

describe("Path Painter levels", () => {
  const levels = getLevels();

  test("15 levels that grow", () => {
    expect(levels).toHaveLength(15);
    for (let i = 1; i < levels.length; i++)
      expect(levels[i].open).toBeGreaterThanOrEqual(levels[i - 1].open);
  });

  describe.each(levels.map((l, i) => [i + 1, l]))("Level %i", (n, lvl) => {
    test(`"${lvl.name}" has a stored solution that paints every open cell`, () => {
      const { cols, walls, start, solution, open } = lvl;
      expect(solution[0]).toBe(start);
      expect(solution).toHaveLength(open);
      expect(new Set(solution).size).toBe(open);
      let path = [start];
      for (const cell of solution.slice(1)) {
        const res = step(cols, walls, path, cell);
        expect(res.added).toBe(1);
        path = res.path;
      }
      expect(isPainted(path, open)).toBe(true);
    });
  });
});
