import { arrange, levelCountFor, progressFor, totalLevelCount } from "../src/games/library";
import { ARCADE, CATEGORIES } from "../src/games/registry";

describe("game library", () => {
  test("every arcade game has a known category and some levels", () => {
    const ids = CATEGORIES.map((c) => c.id);
    for (const g of ARCADE) {
      expect(ids).toContain(g.category);
      expect(levelCountFor(g.id)).toBeGreaterThan(0);
    }
    for (const c of ids) expect(ARCADE.some((g) => g.category === c)).toBe(true);
    expect(totalLevelCount(ARCADE)).toBeGreaterThanOrEqual(150);
  });

  test("progress counts stars and cleared levels", () => {
    const pipes = ARCADE.find((g) => g.id === "pipes");
    const p = progressFor(pipes, {
      best: { pipes: 4 },
      plays: { pipes: 2 },
      levels: { pipes: { 1: { stars: 3 }, 2: { stars: 1 }, 3: { stars: 0 } } },
    });
    expect(p).toMatchObject({ best: 4, plays: 2, stars: 4, cleared: 2, levels: 15, isNew: false });
    expect(p.maxStars).toBe(45);
    expect(progressFor(pipes, {}).isNew).toBe(true);
  });

  test("filters by category and sorts", () => {
    const puzzles = arrange(ARCADE, {}, { category: "puzzle" });
    expect(puzzles.length).toBeGreaterThan(0);
    expect(puzzles.every((g) => g.category === "puzzle")).toBe(true);

    const az = arrange(ARCADE, {}, { sort: "az" }).map((g) => g.title);
    expect(az).toEqual([...az].sort((a, b) => a.localeCompare(b)));

    const recent = arrange(ARCADE, { lastPlayed: { maze: 200, pipes: 100 } }, { sort: "recent" });
    expect(recent.slice(0, 2).map((g) => g.id)).toEqual(["maze", "pipes"]);
    expect(recent).toHaveLength(ARCADE.length);
  });
});
