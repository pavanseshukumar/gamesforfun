import {
  MAX_PEEKS,
  matchReward,
  newDeck,
  PEEK_EVERY,
  SYMBOLS,
  xpFor,
} from "../src/games/memory/logic";
import { createRng } from "../src/lib/random";

describe("Memory Flip deck", () => {
  test.each([6, 8, 10, 12])("%i pairs: every symbol twice, one golden pair", (pairs) => {
    const deck = newDeck(pairs, createRng(pairs));
    expect(deck).toHaveLength(pairs * 2);
    const counts = {};
    deck.forEach((c) => (counts[c.symbol] = (counts[c.symbol] ?? 0) + 1));
    expect(Object.values(counts).every((n) => n === 2)).toBe(true);
    expect(deck.filter((c) => c.golden)).toHaveLength(2);
    const golden = deck.filter((c) => c.golden);
    expect(golden[0].symbol).toBe(golden[1].symbol);
    expect(new Set(deck.map((c) => c.key)).size).toBe(deck.length);
  });

  test("there are enough symbols for the biggest deck", () => {
    expect(SYMBOLS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(SYMBOLS.map((s) => s.emoji)).size).toBe(SYMBOLS.length);
  });
});

describe("Memory Flip rewards", () => {
  test("every third match in a row, and the golden pair, earn a Peek", () => {
    expect(matchReward(1, false).peek).toBe(false);
    expect(matchReward(2, false).peek).toBe(false);
    expect(matchReward(PEEK_EVERY, false).peek).toBe(true);
    expect(matchReward(PEEK_EVERY * 2, false).peek).toBe(true);
    expect(matchReward(1, true).peek).toBe(true);
    expect(MAX_PEEKS).toBeGreaterThan(0);
  });

  test("labels celebrate combos", () => {
    expect(matchReward(1, false).label).toBe("Match!");
    expect(matchReward(3, false).label).toBe("Combo ×3");
    expect(matchReward(6, false).label).toContain("🔥");
    expect(matchReward(2, true).label).toContain("Golden");
  });

  test("fewer moves and longer combos earn more XP", () => {
    expect(xpFor(8, 8, 8)).toBeGreaterThan(xpFor(20, 8, 8));
    expect(xpFor(12, 8, 5)).toBeGreaterThan(xpFor(12, 8, 1));
  });
});
