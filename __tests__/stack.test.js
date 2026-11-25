import {
  colorFor,
  dropBlock,
  GROW_BY,
  PERFECT_TOLERANCE,
  PERFECTS_TO_GROW,
  scoreFor,
  speedFor,
} from "../src/games/stack/logic";

const base = { x: 100, w: 120 };

describe("dropBlock", () => {
  test("a block that misses the tower entirely is a miss", () => {
    expect(dropBlock(base, { x: 230, w: 120 })).toEqual({ miss: true });
    expect(dropBlock(base, { x: -30, w: 120 })).toEqual({ miss: true }); // touches edge only
  });

  test("overshooting right keeps the overlap and slices the right overhang", () => {
    const r = dropBlock(base, { x: 140, w: 120 });
    expect(r).toMatchObject({ miss: false, perfect: false, placed: { x: 140, w: 80 } });
    expect(r.cut).toEqual({ x: 220, w: 40 });
  });

  test("overshooting left slices the left overhang", () => {
    const r = dropBlock(base, { x: 70, w: 120 });
    expect(r.placed).toEqual({ x: 100, w: 90 });
    expect(r.cut).toEqual({ x: 70, w: 30 });
  });

  test("placed + cut always add back up to the dropped block", () => {
    for (let x = -100; x <= 200; x += 7) {
      const r = dropBlock(base, { x, w: 120 });
      if (r.miss || r.perfect) continue;
      expect(r.placed.w + r.cut.w).toBeCloseTo(120);
    }
  });

  test("a drop within tolerance snaps perfectly with no cut", () => {
    const r = dropBlock(base, { x: 100 + PERFECT_TOLERANCE, w: 120 }, 0);
    expect(r).toMatchObject({ perfect: true, placed: { x: 100, w: 120 }, cut: null, streak: 1 });
  });

  test("a sloppy drop resets the perfect streak", () => {
    expect(dropBlock(base, { x: 130, w: 120 }, 2).streak).toBe(0);
  });

  test("every few perfects in a row the block grows back, centred and capped", () => {
    const r = dropBlock(base, { x: 100, w: 120 }, PERFECTS_TO_GROW - 1, 200);
    expect(r.grew).toBe(true);
    expect(r.placed).toEqual({ x: 100 - GROW_BY / 2, w: 120 + GROW_BY });

    const capped = dropBlock(base, { x: 100, w: 120 }, PERFECTS_TO_GROW - 1, 125);
    expect(capped.placed.w).toBe(125);

    const full = dropBlock(base, { x: 100, w: 120 }, PERFECTS_TO_GROW - 1, 120);
    expect(full.grew).toBe(false);
  });
});

describe("Stack helpers", () => {
  test("blocks speed up with height but stay catchable", () => {
    expect(speedFor(10)).toBeGreaterThan(speedFor(0));
    expect(speedFor(500)).toBe(520);
  });

  test("colours are valid hsl and change per level", () => {
    expect(colorFor(1).face).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    expect(colorFor(1).face).not.toBe(colorFor(2).face);
  });

  test("score is height plus perfects", () => {
    expect(scoreFor(20, 6)).toBe(26);
  });
});
