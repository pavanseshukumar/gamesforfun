import { starsFor } from "../src/games/challenges";
import { PARADE_LEVELS } from "../src/games/parade/levels";
import { createParade, DANCERS, PAD_COLOURS } from "../src/games/parade/logic";

/** Plays perfectly for `rounds` rounds. */
const perfect = (p, rounds) => {
  for (let r = 0; r < rounds; r++) for (const pad of p.answer) p.tap(pad);
};

describe("Pattern Parade rules", () => {
  test("each cleared round adds one step to the same dance", () => {
    const p = createParade({ pads: 4, startLength: 3 }, 1);
    const first = p.show;
    expect(first).toHaveLength(3);
    first.forEach((pad) => expect(pad).toBeLessThan(4));
    const results = first.map((pad) => p.tap(pad));
    expect(results).toEqual(["good", "good", "round"]);
    expect(p.round).toBe(1);
    expect(p.show).toHaveLength(4);
    expect(p.show.slice(0, 3)).toEqual(first);
    expect(p.longest).toBe(3);
  });

  test("a wrong tap ends the parade with one life, or replays the round with more", () => {
    const one = createParade({ lives: 1 }, 2);
    const wrong = (one.answer[0] + 1) % 4;
    expect(one.tap(wrong)).toBe("over");
    expect(one.over).toBe(true);
    expect(one.tap(0)).toBe("ignored");

    const two = createParade({ lives: 2 }, 2);
    two.tap(two.answer[0]);
    expect(two.tap((two.answer[1] + 1) % 4)).toBe("miss");
    expect(two.progress).toBe(0);
    expect(two.lives).toBe(1);
    perfect(two, 1);
    expect(two.round).toBe(1);
  });

  test("reverse mode wants the dance backwards", () => {
    const p = createParade({ reverse: true }, 3);
    expect(p.answer).toEqual([...p.show].reverse());
    perfect(p, 2);
    expect(p.round).toBe(2);
  });

  test("fresh mode deals a new dance each round; shuffle moves the buddies", () => {
    const f = createParade({ fresh: true, startLength: 6 }, 4);
    const first = f.show;
    perfect(f, 1);
    expect(f.show).toHaveLength(7);
    expect(f.show.slice(0, 6)).not.toEqual(first);

    const s = createParade({ shuffle: true, pads: 6 }, 5);
    const orders = [s.order.join()];
    for (let r = 0; r < 4; r++) {
      perfect(s, 1);
      orders.push(s.order.join());
    }
    expect(new Set(orders).size).toBeGreaterThan(1);
    expect([...s.order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("the show speeds up but never below a readable pace", () => {
    const p = createParade({ stepMs: 500, speedUp: 0.1 }, 1);
    const first = p.stepMs;
    perfect(p, 30);
    expect(p.stepMs).toBeLessThan(first);
    expect(p.stepMs).toBeGreaterThanOrEqual(220);
  });

  test("there's a buddy and a colour for every pad", () => {
    expect(DANCERS.length).toBeGreaterThanOrEqual(6);
    expect(PAD_COLOURS.length).toBeGreaterThanOrEqual(6);
  });
});

describe("Pattern Parade levels", () => {
  test.each(PARADE_LEVELS.map((l, i) => [i + 1, l]))("level %i stars a good memory", (n, level) => {
    // A player who remembers 3★ worth of rounds gets 3 stars.
    const p = createParade(level.config, n);
    perfect(p, 14);
    const stats = { rounds: p.round, longest: p.longest, score: p.score };
    expect(starsFor(level, stats)).toBe(3);
    expect(level.config.pads ?? 4).toBeLessThanOrEqual(6);
  });
});
