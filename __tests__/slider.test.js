import { blankOf, isSolved, neighbors, scramble, slide, solvedBoard } from "../src/games/sliding";
import { LEVELS, scoreFor, starsFor } from "../src/games/slider/levels";
import { hashString } from "../src/lib/random";

describe("Sliding rules at any size", () => {
  test.each([3, 4, 5])("%i×%i: neighbours respect edges", (size) => {
    expect(neighbors(0, size).sort((a, b) => a - b)).toEqual([1, size]);
    const last = size * size - 1;
    expect(neighbors(last, size).sort((a, b) => a - b)).toEqual([last - size, last - 1]);
  });

  test.each([3, 4, 5])("%i×%i: slide only moves tiles next to the gap", (size) => {
    const board = solvedBoard(size);
    expect(slide(board, 0)).toBeNull();
    const moved = slide(board, board.length - 2);
    expect(moved[board.length - 1]).toBe(board.length - 2);
    expect(moved[board.length - 2]).toBe(blankOf(size));
  });

  test("a scramble is undone by walking its path backwards", () => {
    const { board, path } = scramble(1234, 4, 60);
    let b = board;
    for (let k = path.length - 1; k >= 1; k--) b = slide(b, path[k - 1]);
    expect(isSolved(b)).toBe(true);
  });
});

describe("Picture Slider levels", () => {
  test("grow from 3×3 to 5×5 and are never pre-solved", () => {
    expect(LEVELS[0].size).toBe(3);
    expect(LEVELS[LEVELS.length - 1].size).toBe(5);
    LEVELS.forEach((l) => {
      expect(l.board).toHaveLength(l.size * l.size);
      expect(isSolved(l.board)).toBe(false);
    });
  });

  test("every level is a fixed seeded scramble, and par moves undo it exactly", () => {
    LEVELS.forEach((l, i) => {
      // Recompute from the seed: same board every time, on every device.
      const { board, path } = scramble(hashString(`slider:${i + 1}`), l.size, l.par);
      expect(board).toEqual(l.board);
      let b = board;
      for (let k = path.length - 1; k >= 1; k--) b = slide(b, path[k - 1]);
      expect(isSolved(b)).toBe(true);
      expect(path.length - 1).toBe(l.par);
    });
  });

  test("stars and score reward tidy, quick solves", () => {
    expect(starsFor(40, 40)).toBe(3);
    expect(starsFor(64, 40)).toBe(2);
    expect(starsFor(65, 40)).toBe(1);
    expect(scoreFor(40, 40, 30)).toBeGreaterThan(scoreFor(60, 40, 30));
    expect(scoreFor(40, 40, 10)).toBeGreaterThan(scoreFor(40, 40, 200));
  });
});
