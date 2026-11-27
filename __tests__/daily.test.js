import { MASCOTS } from "../src/games/buddies";
import {
  BLANK,
  dailyXp,
  isSolved,
  longestDailyRun,
  mascotOfDay,
  neighbors,
  shuffledBoard,
  slide,
  solvedBoard,
  todaysBoard,
} from "../src/games/daily/logic";

/** Standard solvability test for a 4×4 sliding puzzle. */
function isSolvable(board) {
  const tiles = board.filter((t) => t !== BLANK);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++) if (tiles[i] > tiles[j]) inversions++;
  const blankRowFromBottom = 4 - Math.floor(board.indexOf(BLANK) / 4);
  return (inversions + blankRowFromBottom) % 2 === 1;
}

describe("Daily puzzle board", () => {
  test("is the same for everyone on a given day", () => {
    expect(todaysBoard("2026-11-24")).toEqual(todaysBoard("2026-11-24"));
  });

  test("changes from day to day", () => {
    expect(todaysBoard("2026-11-24")).not.toEqual(todaysBoard("2026-11-25"));
  });

  test("every day of a year is a scrambled, solvable permutation", () => {
    const start = new Date("2026-01-01T12:00:00");
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const board = todaysBoard(key);
      expect(new Set(board).size).toBe(16);
      expect(isSolved(board)).toBe(false);
      expect(isSolvable(board)).toBe(true);
    }
  });

  test("never comes out solved, even with a tiny shuffle", () => {
    for (let seed = 1; seed < 50; seed++) expect(isSolved(shuffledBoard(seed, 1))).toBe(false);
  });
});

describe("Sliding", () => {
  test("only tiles next to the gap can move", () => {
    const board = solvedBoard();
    expect(slide(board, 0)).toBeNull();
    expect(slide(board, 14).slice(14)).toEqual([BLANK, 14]);
    expect(slide(board, 11).slice(11)).toEqual([BLANK, 12, 13, 14, 11]);
  });

  test("neighbors respects the grid edges", () => {
    expect(neighbors(0).sort((a, b) => a - b)).toEqual([1, 4]);
    expect(neighbors(5).sort((a, b) => a - b)).toEqual([1, 4, 6, 9]);
    expect(neighbors(15).sort((a, b) => a - b)).toEqual([11, 14]);
  });
});

describe("Daily helpers", () => {
  test("mascot of the day is one of the cast and stable", () => {
    const m = mascotOfDay("2026-11-24");
    expect(Object.keys(MASCOTS)).toContain(m);
    expect(mascotOfDay("2026-11-24")).toBe(m);
  });

  test("longestDailyRun counts consecutive days, across DST changes", () => {
    expect(longestDailyRun({})).toBe(0);
    expect(
      longestDailyRun({ "2026-11-01": 1, "2026-11-02": 1, "2026-11-03": 1, "2026-11-05": 1 }),
    ).toBe(3);
    expect(longestDailyRun({ "2026-03-07": 1, "2026-03-08": 1, "2026-03-09": 1 })).toBe(3);
    expect(longestDailyRun({ "2026-10-31": 1, "2026-11-01": 1, "2026-11-02": 1 })).toBe(3);
  });

  test("fewer moves earn more XP, never less than 30", () => {
    expect(dailyXp(100)).toBe(60);
    expect(dailyXp(60)).toBeGreaterThan(dailyXp(100));
    expect(dailyXp(5000)).toBe(30);
  });
});
