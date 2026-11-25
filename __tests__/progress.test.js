import { ACHIEVEMENTS, progressOf } from "../src/games/achievements";
import { dayKey, levelInfo, rankFor, xpForLevel } from "../src/lib/progress";
import { createRng, hashString } from "../src/lib/random";

describe("Levels", () => {
  test("level 1 starts at 0 XP and thresholds keep rising", () => {
    expect(xpForLevel(1)).toBe(0);
    for (let l = 2; l < 30; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
  });

  test("levelInfo reports progress inside the current level", () => {
    const at = xpForLevel(4);
    expect(levelInfo(at)).toMatchObject({ level: 4, into: 0 });
    expect(levelInfo(at - 1).level).toBe(3);
    const info = levelInfo(at + 10);
    expect(info.into).toBe(10);
    expect(info.toNext).toBe(xpForLevel(5) - (at + 10));
  });

  test("ranks unlock at the documented levels", () => {
    expect(rankFor(1).name).toBe("Rookie");
    expect(rankFor(3).name).toBe("Bronze Explorer");
    expect(rankFor(5).name).toBe("Silver Explorer");
    expect(rankFor(8).name).toBe("Gold Explorer");
    expect(rankFor(40).name).toBe("Diamond Legend");
  });

  test("dayKey is a zero-padded local date", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("Seeded randomness", () => {
  test("same seed, same sequence", () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  test("values stay in [0, 1)", () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test("hashString is stable and spreads nearby strings", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("2026-11-24")).not.toBe(hashString("2026-11-25"));
  });
});

describe("Achievements", () => {
  const empty = {
    plays: {},
    best: {},
    records: {},
    bestStreak: 0,
    level: 1,
    daily: {},
  };

  test("ids are unique and every achievement has a goal", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    ACHIEVEMENTS.forEach((a) => expect(a.goal).toBeGreaterThan(0));
  });

  test("nothing is unlocked for a brand-new player", () => {
    ACHIEVEMENTS.forEach((a) => expect(progressOf(a, empty).done).toBe(false));
  });

  test("higher-is-better goals unlock at the goal", () => {
    const quick = ACHIEVEMENTS.find((a) => a.id === "quick-fingers");
    expect(progressOf(quick, { ...empty, best: { "tap-rush": 59 } }).done).toBe(false);
    expect(progressOf(quick, { ...empty, best: { "tap-rush": 60 } })).toMatchObject({
      done: true,
      ratio: 1,
    });
  });

  test("lower-is-better goals unlock at or under the goal", () => {
    const sharp = ACHIEVEMENTS.find((a) => a.id === "sharp-mind");
    expect(progressOf(sharp, { ...empty, best: { memory: 15 } }).done).toBe(false);
    expect(progressOf(sharp, { ...empty, best: { memory: 14 } }).done).toBe(true);
  });

  test("daily streak trophy reads the longest run of solves", () => {
    const week = ACHIEVEMENTS.find((a) => a.id === "week-warrior");
    const daily = {};
    for (let d = 1; d <= 7; d++) daily[`2026-11-0${d}`] = 100;
    expect(progressOf(week, { ...empty, daily }).done).toBe(true);
  });
});
