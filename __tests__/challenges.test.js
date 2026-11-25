import { CHALLENGES, starsFor, targetsText } from "../src/games/challenges";
import { ALL_GAMES } from "../src/games/registry";
import { BOUNCE_DEFAULTS } from "../src/games/bounce/levels";
import { COLOR_CATCH_DEFAULTS } from "../src/games/colorCatch/levels";
import { FUSION_DEFAULTS } from "../src/games/fusion/levels";
import { BALANCE_DEFAULTS } from "../src/games/balance/levels";
import { MATH_DEFAULTS } from "../src/games/math/levels";
import { MEMORY_DEFAULTS } from "../src/games/memory/levels";
import { ODD_DEFAULTS } from "../src/games/odd/levels";
import { SLICE_DEFAULTS } from "../src/games/slice/levels";
import { STACK_DEFAULTS } from "../src/games/stack/levels";
import { TAP_RUSH_DEFAULTS } from "../src/games/tapRush/levels";
import { WORD_POP_DEFAULTS } from "../src/games/wordpop/levels";

// Each game's challenge configs may only use keys its screen understands.
const DEFAULTS = {
  "tap-rush": TAP_RUSH_DEFAULTS,
  stack: STACK_DEFAULTS,
  bounce: BOUNCE_DEFAULTS,
  "color-catch": COLOR_CATCH_DEFAULTS,
  slice: SLICE_DEFAULTS,
  "quick-math": MATH_DEFAULTS,
  "word-pop": WORD_POP_DEFAULTS,
  fusion: FUSION_DEFAULTS,
  memory: MEMORY_DEFAULTS,
  balance: BALANCE_DEFAULTS,
  odd: ODD_DEFAULTS,
};

describe.each(Object.entries(CHALLENGES))("%s challenge levels", (gameId, levels) => {
  test("belong to a real game", () => {
    expect(ALL_GAMES.map((g) => g.id)).toContain(gameId);
  });

  test("are well formed: name, goal, metric and three rising star targets", () => {
    expect(levels.length).toBeGreaterThanOrEqual(8);
    for (const l of levels) {
      expect(l.name).toBeTruthy();
      expect(l.goal).toBeTruthy();
      expect(typeof l.metric).toBe("string");
      expect(l.thresholds).toHaveLength(3);
      const [a, b, c] = l.thresholds;
      if (l.lower) expect(a > b && b > c).toBe(true);
      else expect(a < b && b < c).toBe(true);
    }
  });

  test("only use config keys the game supports", () => {
    const known = Object.keys(DEFAULTS[gameId]);
    for (const l of levels) Object.keys(l.config).forEach((k) => expect(known).toContain(k));
  });

  test("have unique names", () => {
    expect(new Set(levels.map((l) => l.name)).size).toBe(levels.length);
  });
});

describe("starsFor", () => {
  const up = { metric: "score", thresholds: [10, 20, 30] };
  const down = { metric: "moves", thresholds: [30, 20, 10], lower: true };

  test("counts the targets reached", () => {
    expect([0, 10, 25, 30, 99].map((score) => starsFor(up, { score }))).toEqual([0, 1, 2, 3, 3]);
  });

  test("handles lower-is-better metrics", () => {
    expect([40, 30, 15, 10].map((moves) => starsFor(down, { moves }))).toEqual([0, 1, 2, 3]);
  });

  test("an unreached goal (Infinity moves) earns nothing", () => {
    expect(starsFor(down, { moves: Infinity })).toBe(0);
  });

  test("a missing stat earns nothing", () => {
    expect(starsFor(up, {})).toBe(0);
  });

  test("target line lists each star level", () => {
    expect(targetsText(up)).toBe("⭐ 10  ·  ⭐⭐ 20  ·  ⭐⭐⭐ 30");
  });
});
