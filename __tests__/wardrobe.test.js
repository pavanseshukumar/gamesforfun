import {
  cleanOutfit,
  EMPTY_OUTFIT,
  isUnlocked,
  itemById,
  ITEMS,
  needText,
  playerStats,
  progressTo,
  SLOTS,
  wornOutfit,
} from "../src/games/wardrobe";

describe("Dress-Up wardrobe", () => {
  test("every item has a unique id, a real slot and a known unlock rule", () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const slots = SLOTS.map((s) => s.id);
    for (const item of ITEMS) {
      expect(slots).toContain(item.slot);
      expect(["level", "stars", "streak", "plays"]).toContain(item.need.kind);
      expect(item.need.n).toBeGreaterThan(0);
      expect(needText(item.need)).toMatch(/\d/);
    }
    for (const slot of slots)
      expect(ITEMS.filter((i) => i.slot === slot).length).toBeGreaterThan(2);
  });

  test("stats count level stars across games, games played and best streak", () => {
    const stats = playerStats({
      xp: 0,
      levels: { maze: { 1: { stars: 3 }, 2: { stars: 1 } }, stack: { 1: { stars: 2 } } },
      bestStreak: 4,
      plays: { maze: 3, stack: 2 },
    });
    expect(stats).toEqual({ level: 1, stars: 6, streak: 4, plays: 5 });
  });

  test("items unlock exactly at their target", () => {
    const cap = itemById("cap"); // 10 stars
    expect(isUnlocked(cap, { stars: 9 })).toBe(false);
    expect(isUnlocked(cap, { stars: 10 })).toBe(true);
    expect(progressTo(cap, { stars: 5 })).toBe(0.5);
    expect(progressTo(cap, { stars: 50 })).toBe(1);
  });

  test("unknown, misplaced or locked items are never worn", () => {
    expect(cleanOutfit(undefined)).toEqual(EMPTY_OUTFIT);
    expect(cleanOutfit({ hat: "nope", face: "cap", neck: "bowtie" })).toEqual({
      hat: null,
      face: null,
      neck: "bowtie",
    });
    const fresh = { level: 1, stars: 0, streak: 0, plays: 0 };
    expect(wornOutfit({ hat: "crown", face: null, neck: null }, fresh).hat).toBeNull();
    expect(wornOutfit({ hat: "crown" }, { ...fresh, level: 8 }).hat).toBe("crown");
  });
});
