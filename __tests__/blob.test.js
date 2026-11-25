import { LEVELS } from "../src/games/blob/levels";
import {
  clampPull,
  createWorld,
  MAX_PULL,
  scoreFor,
  starsFor,
  trajectory,
} from "../src/games/blob/world";
import { restCheck, solve } from "./helpers/blobSolver";

describe("Blob Launch rules", () => {
  test("pulls are clamped to the sling's reach", () => {
    expect(clampPull({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
    const c = clampPull({ x: -300, y: 400 });
    expect(Math.hypot(c.x, c.y)).toBeCloseTo(MAX_PULL);
  });

  test("fewer shots, more stars", () => {
    expect([1, 2, 3].map(starsFor)).toEqual([3, 2, 1]);
  });

  test("score rewards pops and leftover shots", () => {
    expect(scoreFor(3, 2)).toBe(6000);
  });

  test("the aiming dots match the real flight", () => {
    const world = createWorld({ blocks: [], grumps: [], ledges: [] });
    const pull = { x: -70, y: 50 };
    const dots = trajectory(pull, 30, 1);
    world.reload();
    world.launch(pull);
    for (let i = 0; i < 30; i++) world.step();
    expect(world.ball.position.x).toBeCloseTo(dots[29].x, 0);
    expect(world.ball.position.y).toBeCloseTo(dots[29].y, 0);
  });

  test("a released ball has real mass (regression: static start)", () => {
    const world = createWorld(LEVELS[0]);
    world.launch({ x: -60, y: 40 });
    expect(Number.isFinite(world.ball.mass)).toBe(true);
    world.step();
    expect(Number.isFinite(world.ball.position.x)).toBe(true);
  });
});

describe.each(LEVELS.map((lvl, i) => [i + 1, lvl]))("Level %i", (n, lvl) => {
  test(`"${lvl.name}" stands still on its own`, () => {
    const { pops, drift } = restCheck(lvl);
    expect(pops).toBe(0);
    expect(drift).toBeLessThan(6);
  });

  test(`"${lvl.name}" can be cleared within 3 shots`, () => {
    const result = solve(lvl, 3) ?? solve(lvl, 3, true);
    expect(result).not.toBeNull();
    expect(result.shots).toBeLessThanOrEqual(3);
  }, 60_000);
});
