import {
  cardTime,
  makeQuestion,
  multiplierFor,
  sneakyWrong,
  tierFor,
  TIER_AT,
  TIERS,
} from "../src/games/math/logic";
import { createRng } from "../src/lib/random";

const evaluate = ({ a, op, b }) =>
  op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b;

describe("Quick Math questions", () => {
  test.each(TIERS.map((t, i) => [i, t.name]))("tier %i (%s) is always honest", (tier) => {
    const rand = createRng(100 + tier);
    for (let i = 0; i < 2000; i++) {
      const q = makeQuestion(tier, rand);
      expect(TIERS[tier].ops).toContain(q.op);
      expect(q.truth).toBe(evaluate(q));
      expect(Number.isInteger(q.truth)).toBe(true); // division is exact
      expect(q.truth).toBeGreaterThanOrEqual(0); // no negatives
      expect(q.isTrue).toBe(q.shown === q.truth);
      expect(q.text).toBe(`${q.a} ${q.op} ${q.b} = ${q.shown}`);
    }
  });

  test("about half the cards are true", () => {
    const rand = createRng(7);
    let trues = 0;
    for (let i = 0; i < 4000; i++) if (makeQuestion(2, rand).isTrue) trues++;
    expect(trues / 4000).toBeGreaterThan(0.45);
    expect(trues / 4000).toBeLessThan(0.55);
  });

  test("wrong answers are believable: never the truth, never negative", () => {
    const rand = createRng(3);
    for (let i = 0; i < 2000; i++) {
      const v = sneakyWrong(7, "+", 8, 15, rand);
      expect(v).not.toBe(15);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(sneakyWrong(0, "+", 0, 0, () => 0)).toBeGreaterThan(0);
  });
});

describe("Quick Math pacing", () => {
  test("tiers unlock at the documented counts", () => {
    TIER_AT.forEach((need, i) => {
      expect(tierFor(need)).toBe(i);
      if (need > 0) expect(tierFor(need - 1)).toBe(i - 1);
    });
  });

  test("cards speed up but never below 1.6s", () => {
    expect(cardTime(0)).toBe(4);
    expect(cardTime(20)).toBeLessThan(cardTime(0));
    expect(cardTime(500)).toBe(1.6);
  });

  test("multiplier grows every 5 in a row, up to ×4", () => {
    expect([0, 4, 5, 10, 15, 99].map(multiplierFor)).toEqual([1, 1, 2, 3, 4, 4]);
  });
});
