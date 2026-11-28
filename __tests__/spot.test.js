import { starsFor } from "../src/games/challenges";
import { SPOT_LEVELS } from "../src/games/spot/levels";
import { findPoints, makeScene, SPOT_DEFAULTS, VARIANTS } from "../src/games/spot/logic";
import { createRng } from "../src/lib/random";

describe("Where's Pom? scenes", () => {
  test("every scene hides exactly one of the target, on screen and never under a bush", () => {
    for (const cfg of [SPOT_DEFAULTS, { disguise: 0.8, bushes: 6 }, { crowd: 20, growth: 3 }]) {
      const rand = createRng(4);
      for (let round = 0; round < 15; round++) {
        const s = makeScene(round, rand, cfg);
        const c = { ...SPOT_DEFAULTS, ...cfg };
        expect(s.buddies).toHaveLength(Math.min(c.maxCrowd, c.crowd + round * c.growth));
        expect(s.buddies.filter((b) => b.variant === s.target)).toHaveLength(1);
        expect(s.buddies[s.targetIndex].variant).toBe(s.target);
        expect(VARIANTS).toContain(s.target);
        s.buddies.forEach((b) => {
          expect(b.x).toBeGreaterThan(0);
          expect(b.x).toBeLessThan(1);
          expect(b.y).toBeGreaterThan(0);
          expect(b.y).toBeLessThan(1);
        });
        const t = s.buddies[s.targetIndex];
        s.bushes.forEach((b) => expect(Math.hypot(b.x - t.x, b.y - t.y)).toBeGreaterThan(b.r));
        if (c.bushes) expect(s.bushes.length).toBe(c.bushes);
      }
    }
  });

  test("no two buddies share a spot", () => {
    const s = makeScene(10, createRng(2), { crowd: 30 });
    for (let i = 0; i < s.buddies.length; i++)
      for (let j = i + 1; j < s.buddies.length; j++) {
        const a = s.buddies[i];
        const b = s.buddies[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.02);
      }
  });

  test("quick finds and streaks score more", () => {
    expect(findPoints(1, 0)).toBeGreaterThan(findPoints(5, 0));
    expect(findPoints(3, 6)).toBeGreaterThan(findPoints(3, 0));
    expect(findPoints(30, 0)).toBe(10);
  });
});

describe("Where's Pom? levels", () => {
  test.each(SPOT_LEVELS.map((l, i) => [i + 1, l]))("level %i is clearable", (n, level) => {
    const c = { ...SPOT_DEFAULTS, ...level.config };
    const play = (every, missEvery) => {
      let t = 0;
      let found = 0;
      let streak = 0;
      let score = 0;
      let k = 0;
      while (true) {
        k++;
        if (missEvery && k % missEvery === 0) {
          t += c.penalty;
          streak = 0;
        }
        t += every;
        if (t > c.duration) break;
        found++;
        score += findPoints(every, streak);
        streak++;
      }
      return { found, score };
    };
    expect(starsFor(level, play(2.5, 0))).toBe(3);
    expect(starsFor(level, play(5, 4))).toBeGreaterThanOrEqual(1);
  });
});
