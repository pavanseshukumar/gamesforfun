import { starsFor } from "../src/games/challenges";
import { HOP_LEVELS } from "../src/games/hopAcross/levels";
import {
  autoHop,
  createHopWorld,
  HOP_S,
  MAX_PADS,
  padX,
  ROW_H,
  rowSpec,
  STEP_S,
  VIS_ROWS,
  W,
  HOP_DEFAULTS,
} from "../src/games/hopAcross/world";

const play = (cfg, seed, seconds = 90, brain = autoHop) => {
  const w = createHopWorld(cfg, seed);
  const events = [];
  for (let i = 0; i < seconds * 60 && !w.over; i++) {
    if (brain(w)) w.hop();
    events.push(...w.step());
  }
  return { w, events };
};

describe("Hop Across river", () => {
  test("rows are seeded: the same seed gives the same river", () => {
    expect(rowSpec(7, 12, HOP_DEFAULTS)).toEqual(rowSpec(7, 12, HOP_DEFAULTS));
    expect(rowSpec(7, 12, HOP_DEFAULTS)).not.toEqual(rowSpec(8, 12, HOP_DEFAULTS));
  });

  test("neighbouring rows drift opposite ways, and pads wrap around the river", () => {
    for (let r = 1; r < 40; r++) {
      const a = rowSpec(1, r, HOP_DEFAULTS);
      const b = rowSpec(1, r + 1, HOP_DEFAULTS);
      expect(Math.sign(a.v)).toBe(-Math.sign(b.v));
      expect(a.count).toBeGreaterThanOrEqual(1);
      expect(a.count).toBeLessThanOrEqual(MAX_PADS);
      for (let t = 0; t < 30; t += 0.7) {
        const x = padX(a, 0, t);
        expect(x).toBeGreaterThanOrEqual(-a.w);
        expect(x).toBeLessThan(W + a.w);
      }
    }
  });

  test("the river gets harder: smaller, faster pads that sink sooner", () => {
    const early = rowSpec(1, 1, HOP_DEFAULTS);
    const late = rowSpec(1, 45, HOP_DEFAULTS);
    expect(late.w).toBeLessThan(early.w);
    expect(Math.abs(late.v)).toBeGreaterThan(Math.abs(early.v) * 0.9);
    expect(late.sink).toBeLessThan(early.sink);
  });

  test("standing still on the bank is safe; on a pad it isn't", () => {
    const { w } = play({}, 1, 10, () => false);
    expect(w.over).toBe(false);
    const { w: w2 } = play({}, 1, 30, (x) => x.row === 0 && autoHop(x));
    expect(w2.over).toBe(true);
    expect(["sank", "swept"]).toContain(w2.reason);
  });

  test("hopping into open water is a splash", () => {
    const w = createHopWorld({}, 3);
    // Wait for a moment when nothing is in front, then hop.
    let tries = 0;
    while (w.padUnder(1, w.frogX, w.time + HOP_S + STEP_S) >= 0 && tries++ < 2000) w.step();
    expect(w.hop()).toBe(true);
    const events = [];
    for (let i = 0; i < 40; i++) events.push(...w.step());
    expect(w.over).toBe(true);
    expect(w.reason).toBe("splash");
    expect(w.rows).toBe(0);
    expect(events.map((e) => e.type)).toContain("splash");
  });

  test("a careful player crosses many rows and eats flies", () => {
    const { w, events } = play({}, 2, 90);
    expect(w.rows).toBeGreaterThan(15);
    expect(events.filter((e) => e.type === "land").length).toBe(w.rows);
    expect(w.score).toBe(w.rows + w.flies * 5);
  });

  test("timed rounds end on the clock", () => {
    const { w } = play({ duration: 10 }, 1, 30);
    if (w.reason === "time") expect(w.time).toBeCloseTo(10, 0);
    expect(w.over).toBe(true);
  });

  test("poses have a fixed layout and the camera follows Hop", () => {
    const { w } = play({}, 2, 8);
    const p = w.poses();
    expect(p).toHaveLength(6 + VIS_ROWS * MAX_PADS * 4);
    expect(p[0]).toBeGreaterThan(0);
    expect(Math.abs(p[0] - w.row * ROW_H)).toBeLessThan(ROW_H);
  });
});

describe("Hop Across levels", () => {
  test.each(HOP_LEVELS.map((l, i) => [i + 1, l]))(
    "level %i is clearable by a careful player",
    (n, level) => {
      // Most seeds should earn at least one star.
      const cleared = [1, 2, 3, 4, 5].filter((seed) => {
        const { w } = play(level.config, seed * 11 + n, level.config.duration || 120);
        return starsFor(level, { rows: w.rows, flies: w.flies, score: w.score }) >= 1;
      });
      expect(cleared.length).toBeGreaterThanOrEqual(3);
    },
  );
});
