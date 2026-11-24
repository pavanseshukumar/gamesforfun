import { comboBonus, GRAVITY, launchVy, segmentDistance, waveFor } from "../src/games/slice/logic";

describe("Slice Splash maths", () => {
  test("segment distance handles the middle, the ends and zero-length swipes", () => {
    expect(segmentDistance(5, 5, 0, 0, 10, 0)).toBeCloseTo(5);
    expect(segmentDistance(-3, 4, 0, 0, 10, 0)).toBeCloseTo(5); // past the start
    expect(segmentDistance(13, 4, 0, 0, 10, 0)).toBeCloseTo(5); // past the end
    expect(segmentDistance(3, 4, 0, 0, 0, 0)).toBeCloseTo(5); // a tap
  });

  test("a fast swipe that jumps over a bubble still cuts it", () => {
    // Two samples 200px apart with the bubble in between.
    expect(segmentDistance(100, 52, 0, 50, 200, 55)).toBeLessThan(20);
  });

  test("launch speed makes a throw peak where asked", () => {
    const vy = launchVy(600, 150);
    const peak = 600 - (vy * vy) / (2 * GRAVITY);
    expect(peak).toBeCloseTo(150);
  });

  test("combos start at three", () => {
    expect([1, 2, 3, 5].map(comboBonus)).toEqual([0, 0, 3, 5]);
  });

  test("waves get busier and riskier over time, within limits", () => {
    const early = waveFor(0);
    const late = waveFor(200);
    expect(late.interval).toBeLessThan(early.interval);
    expect(late.size).toBeGreaterThan(early.size);
    expect(late.grumpChance).toBeGreaterThan(early.grumpChance);
    expect(late.size).toBeLessThanOrEqual(4);
    expect(late.grumpChance).toBeLessThanOrEqual(0.2);
  });
});
