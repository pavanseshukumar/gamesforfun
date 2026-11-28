import { starsFor } from "../src/games/challenges";
import { FISHING_LEVELS } from "../src/games/fishing/levels";
import {
  CAST_S,
  CATCHES,
  castSeries,
  FISHING_DEFAULTS,
  judge,
  KINDS,
  nibbling,
  pickCatch,
  planCast,
  REEL_S,
} from "../src/games/fishing/logic";
import { createRng } from "../src/lib/random";

/** Fishes for `duration` s; `skill` is the share of bites the player hooks. */
function fish(cfg, seed, skill = 1) {
  const c = { ...FISHING_DEFAULTS, ...cfg };
  const rand = createRng(seed);
  const luck = createRng(seed + 99);
  let t = 0;
  const stats = { score: 0, fish: 0, rare: 0 };
  while (true) {
    const plan = planCast(rand, c);
    t += CAST_S + plan.bite + plan.window * 0.4;
    if (t > c.duration) break;
    if (luck() < skill && judge(plan, plan.bite + plan.window * 0.4) === "caught") {
      const k = CATCHES[plan.kind];
      stats.score += k.points;
      if (!k.junk) stats.fish += 1;
      if (["puffer", "rainbow", "golden"].includes(plan.kind)) stats.rare += 1;
      t += REEL_S;
    } else {
      t += 0.8;
    }
  }
  return stats;
}

describe("Fishing Fun rules", () => {
  test("tapping before the dive scares the fish; in the window catches; after is too late", () => {
    const plan = { kind: "minnow", bite: 2, window: 0.8, nibbles: [1.1] };
    expect(judge(plan, 1.1)).toBe("early");
    expect(judge(plan, 2)).toBe("caught");
    expect(judge(plan, 2.8)).toBe("caught");
    expect(judge(plan, 2.81)).toBe("late");
  });

  test("nibbles come before the bite and never right on top of it", () => {
    for (const plan of castSeries(5, { nibbles: 3 }, 200)) {
      plan.nibbles.forEach((n) => {
        expect(n).toBeGreaterThan(0.4);
        expect(n).toBeLessThan(plan.bite - 0.45);
      });
      expect(nibbling(plan, plan.bite + 0.1)).toBe(false);
      if (plan.nibbles.length) expect(nibbling(plan, plan.nibbles[0] + 0.1)).toBe(true);
    }
  });

  test("rarer fish give more points and less time; boots give nothing", () => {
    const fishes = KINDS.filter((k) => !CATCHES[k].junk);
    for (let i = 1; i < fishes.length; i++) {
      expect(CATCHES[fishes[i]].points).toBeGreaterThan(CATCHES[fishes[i - 1]].points);
      expect(CATCHES[fishes[i]].window).toBeLessThan(CATCHES[fishes[i - 1]].window);
    }
    expect(CATCHES.boot.points).toBe(0);
  });

  test("boosts change what bites", () => {
    const count = (cfg, kind) => {
      const rand = createRng(3);
      let n = 0;
      for (let i = 0; i < 4000; i++) if (pickCatch(rand, cfg) === kind) n++;
      return n;
    };
    expect(count({ rareBoost: 4 }, "golden")).toBeGreaterThan(count({}, "golden") * 2);
    expect(count({ junk: 3 }, "boot")).toBeGreaterThan(count({}, "boot") * 2);
  });

  test("the same seed casts the same way", () => {
    expect(castSeries(9, {}, 10)).toEqual(castSeries(9, {}, 10));
  });
});

describe("Fishing Fun levels", () => {
  test.each(FISHING_LEVELS.map((l, i) => [i + 1, l]))(
    "level %i: 3 stars for a sharp angler, a star for a so-so one",
    (n, level) => {
      const sharp = [1, 2, 3].map((s) => starsFor(level, fish(level.config, s * 31 + n, 1)));
      const average = [1, 2, 3].map((s) => starsFor(level, fish(level.config, s * 17 + n, 0.65)));
      expect(Math.max(...sharp)).toBe(3);
      expect(average.filter((x) => x >= 1).length).toBeGreaterThanOrEqual(2);
    },
  );
});
