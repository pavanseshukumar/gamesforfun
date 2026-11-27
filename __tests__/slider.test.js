import { blankOf, isSolved, neighbors, scramble, slide, solvedBoard } from "../src/games/sliding";
import { goalFor, LEVELS } from "../src/games/slider/levels";
import { fmtTime, scoreForTime, starsForTime } from "../src/games/timeStars";
import { hashString } from "../src/lib/random";

describe("Sliding rules at any size", () => {
  test.each([3, 4, 5, 6])("%i×%i: neighbours respect edges", (size) => {
    expect(neighbors(0, size).sort((a, b) => a - b)).toEqual([1, size]);
    const last = size * size - 1;
    expect(neighbors(last, size).sort((a, b) => a - b)).toEqual([last - size, last - 1]);
  });

  test.each([3, 4, 5, 6])("%i×%i: slide only moves tiles next to the gap", (size) => {
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
  test("grow from 3×3 to 6×6 and are never pre-solved", () => {
    expect(LEVELS).toHaveLength(18);
    expect(LEVELS[0].size).toBe(3);
    expect(LEVELS[LEVELS.length - 1].size).toBe(6);
    expect(LEVELS.filter((l) => l.pictureOnly).length).toBe(4);
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

  test("time goals grow with the board and are longer without numbers", () => {
    LEVELS.forEach((l) => {
      expect(l.goal % 5).toBe(0);
      expect(l.goal).toBeGreaterThanOrEqual(l.par); // at least a second per scramble move
    });
    expect(goalFor(100, 5)).toBeGreaterThan(goalFor(100, 4));
    expect(goalFor(60, 4, true)).toBeGreaterThan(goalFor(60, 4));
  });
});

describe("Time stars", () => {
  test("3 stars within the goal, 2 within twice it, else 1", () => {
    expect(starsForTime(40, 40)).toBe(3);
    expect(starsForTime(41, 40)).toBe(2);
    expect(starsForTime(80, 40)).toBe(2);
    expect(starsForTime(81, 40)).toBe(1);
    expect(starsForTime(9999, 40)).toBe(1);
  });

  test("score rewards quicker finishes", () => {
    expect(scoreForTime(10, 40)).toBeGreaterThan(scoreForTime(39, 40));
    expect(scoreForTime(39, 40)).toBeGreaterThan(scoreForTime(41, 40));
    expect(scoreForTime(9999, 40)).toBe(1000);
  });

  test("formats as m:ss", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(75.9)).toBe("1:15");
    expect(fmtTime(605)).toBe("10:05");
  });
});
