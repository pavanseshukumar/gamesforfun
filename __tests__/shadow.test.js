import { starsFor } from "../src/games/challenges";
import { SHADOW_LEVELS } from "../src/games/shadow/levels";
import {
  HATS,
  makeRound,
  multiplierFor,
  shapeKey,
  tierFor,
  VARIANTS,
} from "../src/games/shadow/logic";
import { createRng } from "../src/lib/random";

describe("Shadow Match rounds", () => {
  test.each([0, 1, 2, 3])("tier %i: exactly one option casts the shadow", (tier) => {
    const rand = createRng(tier + 1);
    for (let i = 0; i < 300; i++) {
      for (const options of [3, 4, 6]) {
        const r = makeRound(tier, rand, { options });
        expect(r.options).toHaveLength(options);
        const keys = r.options.map(shapeKey);
        expect(new Set(keys).size).toBe(options);
        expect(keys.filter((k) => k === shapeKey(r.target))).toHaveLength(1);
        expect(r.options[r.answer]).toEqual(r.target);
        r.options.forEach((o) => {
          expect(VARIANTS).toContain(o.variant);
          if (o.hat) expect(HATS).toContain(o.hat);
          expect(["up", "down"]).toContain(o.pose);
        });
      }
    }
  });

  test("tier 0 has no hats; later tiers dress everyone up", () => {
    const rand = createRng(7);
    const t0 = makeRound(0, rand);
    t0.options.forEach((o) => expect(o.hat).toBeNull());
    const t1 = makeRound(1, rand);
    expect(t1.target.hat).not.toBeNull();
  });

  test("under a hat only tails tell buddies apart", () => {
    expect(shapeKey({ variant: "mochi", hat: "cap", pose: "up" })).toBe(
      shapeKey({ variant: "bun", hat: "cap", pose: "up" }),
    );
    expect(shapeKey({ variant: "kit", hat: "cap", pose: "up" })).not.toBe(
      shapeKey({ variant: "bun", hat: "cap", pose: "up" }),
    );
    expect(shapeKey({ variant: "mochi", hat: null, pose: "up" })).not.toBe(
      shapeKey({ variant: "bun", hat: null, pose: "up" }),
    );
  });

  test("tiers and multipliers climb", () => {
    expect(tierFor(0)).toBe(0);
    expect(tierFor(4)).toBe(1);
    expect(tierFor(99)).toBe(3);
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(4)).toBe(2);
    expect(multiplierFor(100)).toBe(4);
  });
});

describe("Shadow Match levels", () => {
  test.each(SHADOW_LEVELS.map((l, i) => [i + 1, l]))("level %i is clearable", (n, level) => {
    const duration = level.config.duration ?? 60;
    // A sharp player answers every 2 s; a so-so one every 3.5 s, missing 1 in 5.
    const play = (every, missEvery) => {
      let t = 0;
      let correct = 0;
      let streak = 0;
      let best = 0;
      let score = 0;
      let k = 0;
      while (t < duration) {
        t += every;
        k++;
        if (missEvery && k % missEvery === 0) {
          if (level.config.suddenDeath) break;
          streak = 0;
          t += level.config.penalty ?? 3;
          continue;
        }
        correct++;
        streak++;
        best = Math.max(best, streak);
        score += multiplierFor(streak - 1);
      }
      return { correct, streak: best, score };
    };
    expect(starsFor(level, play(2, 0))).toBe(3);
    expect(starsFor(level, play(3.5, 5))).toBeGreaterThanOrEqual(1);
  });
});
