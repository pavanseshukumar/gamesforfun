import { COLOURS, makeRound, MODES, multiplierFor, tierFor } from "../src/games/odd/logic";
import { createRng } from "../src/lib/random";

const nameOf = (hex) => COLOURS.find((c) => c.hex === hex)?.name;
const key = (c) => JSON.stringify(c);

describe("Odd One Out rounds", () => {
  const rand = createRng(42);

  test.each(MODES)("%s rounds have exactly one odd card", (mode) => {
    for (let i = 0; i < 300; i++) {
      const tier = i % 5;
      const r = makeRound(tier, rand, { modes: [mode] });
      expect(r.mode).toBe(mode);
      expect(r.cards).toHaveLength(4);
      expect(r.answer).toBeGreaterThanOrEqual(0);
      expect(r.answer).toBeLessThan(4);
      const odd = r.cards[r.answer];
      const rest = r.cards.filter((_, k) => k !== r.answer);

      if (mode === "shade" || mode === "buddy") {
        // The other three are identical; the odd one is not.
        expect(new Set(rest.map(key)).size).toBe(1);
        expect(key(odd)).not.toBe(key(rest[0]));
      }
      if (mode === "ink") {
        expect(new Set(rest.map((c) => c.ink)).size).toBe(1);
        expect(odd.ink).not.toBe(rest[0].ink);
        // Every word clashes with its own ink.
        for (const c of r.cards) expect(c.word).not.toBe(nameOf(c.ink));
      }
      if (mode === "word") {
        expect(new Set(rest.map((c) => c.word)).size).toBe(1);
        expect(odd.word).not.toBe(rest[0].word);
        for (const c of r.cards) expect(c.word).not.toBe(nameOf(c.ink));
      }
      if (mode === "match") {
        const matching = r.cards.filter((c) => c.word === nameOf(c.ink));
        expect(matching).toHaveLength(1);
        expect(matching[0]).toBe(odd);
      }
    }
  });

  test("the shade gap shrinks with tier but never vanishes", () => {
    const light = (c) => Number(c.colour.match(/(\d+)%\)$/)[1]);
    const gap = (tier, scale = 1) => {
      const r = makeRound(tier, createRng(7), { modes: ["shade"], shadeScale: scale });
      return Math.abs(light(r.cards[r.answer]) - light(r.cards[(r.answer + 1) % 4]));
    };
    expect(gap(0)).toBeGreaterThan(gap(4));
    expect(gap(4, 0.1)).toBeGreaterThanOrEqual(3);
  });

  test("tiers unlock modes in order", () => {
    const seen = (tier) => {
      const r = createRng(3);
      return new Set(Array.from({ length: 200 }, () => makeRound(tier, r).mode));
    };
    expect([...seen(0)].sort()).toEqual(["buddy", "shade"]);
    expect(seen(1).has("ink")).toBe(true);
    expect(seen(3).has("match")).toBe(true);
  });

  test("tiers and multipliers", () => {
    expect(tierFor(0)).toBe(0);
    expect(tierFor(5)).toBe(1);
    expect(tierFor(100)).toBe(4);
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(5)).toBe(2);
    expect(multiplierFor(50)).toBe(4);
  });
});
