import { BALANCE_LEVELS } from "../src/games/balance/levels";
import { autoBalance, createBalanceWorld, MAX_BOXES, MAX_STARS } from "../src/games/balance/world";
import { starsFor } from "../src/games/challenges";

const run = (cfg, seed, control, seconds = 60) => {
  const world = createBalanceWorld(cfg, seed);
  const events = [];
  for (let i = 0; i < seconds * 60 && !world.over; i++) {
    events.push(...world.step(control(world)));
  }
  return { world, events };
};

describe("Balance Buddy physics", () => {
  test("Bolt rests on a flat plank with nothing falling", () => {
    // With nothing falling, a steady hand keeps Bolt near the middle.
    const world = createBalanceWorld({ dropScale: 0.0001, starRate: 0 }, 1);
    for (let i = 0; i < 600; i++) world.step(autoBalance(world));
    expect(world.over).toBe(false);
    expect(Math.abs(world.buddy.position.x - 200)).toBeLessThan(30);
  });

  test("tilting rolls Bolt downhill and off the end", () => {
    const { world, events } = run({ dropScale: 0.0001, starRate: 0 }, 1, () => 1, 20);
    expect(world.over).toBe(true);
    expect(events.some((e) => e.type === "fall")).toBe(true);
    expect(world.buddy.position.x).toBeGreaterThan(200);
  });

  test("a steady hand survives a long round and collects stars", () => {
    for (const seed of [1, 2, 3]) {
      const { world } = run({}, seed, autoBalance, 60);
      expect(world.over).toBe(false);
      expect(world.time).toBeGreaterThanOrEqual(59);
      expect(world.score).toBeGreaterThanOrEqual(59);
    }
  });

  test("doing nothing eventually loses (crates knock Bolt off)", () => {
    const { world } = run({}, 4, () => 0, 180);
    expect(world.over).toBe(true);
  });

  test("timed rounds end on the clock", () => {
    const { world, events } = run({ duration: 10 }, 5, autoBalance, 30);
    expect(world.over).toBe(true);
    expect(events.at(-1).type).toBe("time");
  });

  test("poses have a fixed layout for the sprite pool", () => {
    const world = createBalanceWorld({}, 1);
    world.step(0);
    expect(world.poses()).toHaveLength(6 + MAX_BOXES * 4 + MAX_STARS * 3);
  });

  test("the same seed plays out the same way", () => {
    const a = run({}, 7, autoBalance, 20).world;
    const b = run({}, 7, autoBalance, 20).world;
    expect(a.poses()).toEqual(b.poses());
  });

  test("doing nothing loses quickly even on the default seesaw", () => {
    for (const seed of [1, 2, 3]) {
      const { world } = run({}, seed, () => 0, 120);
      expect(world.over).toBe(true);
      expect(world.time).toBeLessThan(90);
    }
  });
});

describe("Balance Buddy levels", () => {
  test.each(BALANCE_LEVELS.map((l, i) => [i + 1, l]))(
    "level %i is clearable by a steady hand",
    (n, level) => {
      const { world } = run(level.config, n, autoBalance, level.config.duration + 1);
      const stats = { seconds: Math.floor(world.time), stars: world.stars, score: world.score };
      expect(starsFor(level, stats)).toBeGreaterThanOrEqual(1);
    },
  );
});
