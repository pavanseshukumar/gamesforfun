import { getLevels } from "../src/games/lights/levels";
import {
  affected,
  cellCount,
  isSolved,
  litCount,
  remainingTaps,
  starsFor,
  tap,
} from "../src/games/lights/logic";

describe("Light It Up rules", () => {
  test("a tap flips the cell and its neighbours, and two taps cancel", () => {
    const board = new Array(9).fill(true);
    const once = tap(3, 3, board, 4);
    expect(litCount(once)).toBe(4); // centre + 4 neighbours went dark
    expect(tap(3, 3, once, 4)).toEqual(board);
    // A corner touches only 3 cells.
    expect(affected(3, 3, board, 0).sort()).toEqual([0, 1, 3]);
  });

  test("holes are never flipped or tapped", () => {
    const board = [null, true, true, true];
    expect(affected(2, 2, board, 1)).not.toContain(0);
    expect(tap(2, 2, board, 0)).toBe(board);
  });

  test("remaining taps are scramble XOR player taps", () => {
    expect(remainingTaps([1, 5, 7], [5, 2]).sort()).toEqual([1, 2, 7]);
  });

  test("stars", () => {
    expect(starsFor(5, 5)).toBe(3);
    expect(starsFor(5, 5, 1)).toBe(2);
    expect(starsFor(12, 5)).toBe(2);
    expect(starsFor(13, 5)).toBe(1);
  });
});

describe("Light It Up levels", () => {
  const levels = getLevels();

  test("15 levels that grow", () => {
    expect(levels).toHaveLength(15);
    for (let i = 1; i < levels.length; i++)
      expect(levels[i].par).toBeGreaterThanOrEqual(levels[i - 1].par);
  });

  describe.each(levels.map((l, i) => [i + 1, l]))("Level %i", (n, lvl) => {
    test(`"${lvl.name}" starts dark enough and is solved by its scramble taps`, () => {
      const { cols, rows, start, scramble, par } = lvl;
      expect(isSolved(start)).toBe(false);
      expect(cellCount(start) - litCount(start)).toBeGreaterThanOrEqual(cellCount(start) / 3);
      expect(new Set(scramble).size).toBe(par);
      let board = start;
      for (const i of scramble) {
        expect(board[i]).not.toBeNull();
        board = tap(cols, rows, board, i);
      }
      expect(isSolved(board)).toBe(true);
    });
  });
});
