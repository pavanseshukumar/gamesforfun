import { starsFor } from "../src/games/challenges";
import { FEED_LEVELS } from "../src/games/feed/levels";
import { createFeedGame, FEED_DEFAULTS, FOODS, makeWaiter } from "../src/games/feed/logic";
import { MASCOTS } from "../src/games/buddies";

const DT = 0.05;
const run = (cfg, seed, seconds, waiter) => {
  const g = createFeedGame(cfg, seed);
  const events = [];
  for (let i = 0; i < seconds / DT && !g.over; i++) {
    events.push(...g.tick(DT));
    waiter?.(g, DT);
  }
  return { g, events };
};
const untilWaiting = (g, i = 0) => {
  for (let k = 0; k < 200 && g.seats[i].state !== "waiting"; k++) g.tick(DT);
};

describe("Feed the Buddies rules", () => {
  test("the tray holds distinct snacks, and buddies only ask for tray snacks", () => {
    const { g } = run({ menu: 5, doubles: true }, 3, 40, makeWaiter(1));
    expect(g.menu).toHaveLength(5);
    expect(new Set(g.menu).size).toBe(5);
    g.menu.forEach((f) => expect(FOODS).toContain(f));
    g.seats.forEach((s) => s.want.forEach((f) => expect(g.menu).toContain(f)));
  });

  test("buddies arrive, and two seats never hold the same buddy", () => {
    const g = createFeedGame({}, 1);
    for (let k = 0; k < 100; k++) {
      g.tick(DT);
      const sat = g.seats.map((s) => s.buddy).filter(Boolean);
      expect(new Set(sat).size).toBe(sat.length);
      sat.forEach((b) => expect(Object.keys(MASCOTS)).toContain(b));
    }
    expect(g.seats.every((s) => s.state === "waiting")).toBe(true);
  });

  test("the right snack feeds a buddy; a wrong one costs patience and the streak", () => {
    const g = createFeedGame({ seats: 2 }, 2);
    untilWaiting(g, 0);
    const seat = g.seats[0];
    const wrong = g.menu.find((f) => !seat.want.includes(f));
    const before = seat.patience;
    expect(g.serve(0, wrong)).toBe("wrong");
    expect(seat.patience).toBeLessThan(before);
    expect(g.serve(0, seat.want[0])).toBe("served");
    expect(g.served).toBe(1);
    expect(g.score).toBeGreaterThanOrEqual(10);
    expect(g.serve(0, g.menu[0])).toBe("ignored"); // already leaving
  });

  test("double orders need both snacks", () => {
    const g = createFeedGame({ doubles: true, seats: 4 }, 5);
    let found = null;
    for (let k = 0; k < 4000 && !found; k++) {
      g.tick(DT);
      const i = g.seats.findIndex((s) => s.state === "waiting" && s.want.length === 2);
      if (i >= 0) found = i;
      else g.seats.forEach((s, j) => s.state === "waiting" && g.serve(j, s.want[0]));
    }
    expect(found).not.toBeNull();
    const [a, b] = g.seats[found].want;
    expect(g.serve(found, a)).toBe("partial");
    expect(g.serve(found, b)).toBe("served");
  });

  test("a buddy left waiting gets upset and costs a heart; no hearts ends the round", () => {
    const { g, events } = run({ duration: 0 }, 1, 120);
    expect(events.some((e) => e.type === "upset")).toBe(true);
    expect(g.lives).toBe(0);
    expect(g.over).toBe(true);
    expect(events.at(-1).type).toBe("out");
  });

  test("timed rounds end on the clock", () => {
    const { g, events } = run({ duration: 20 }, 1, 60, makeWaiter(0.8));
    expect(g.over).toBe(true);
    expect(events.at(-1).type).toBe("time");
    expect(g.lives).toBe(FEED_DEFAULTS.lives);
  });

  test("the same seed plays out the same way", () => {
    const a = run({}, 9, 30, makeWaiter(1)).g;
    const b = run({}, 9, 30, makeWaiter(1)).g;
    expect([a.score, a.served]).toEqual([b.score, b.served]);
  });
});

describe("Feed the Buddies levels", () => {
  test.each(FEED_LEVELS.map((l, i) => [i + 1, l]))(
    "level %i earns a star for a steady waiter (one snack every 1.5 s)",
    (n, level) => {
      const { g } = run(level.config, n, (level.config.duration ?? 60) + 1, makeWaiter(1.5));
      const stats = { served: g.served, score: g.score, streak: g.bestStreak };
      expect(starsFor(level, stats)).toBeGreaterThanOrEqual(1);
    },
  );
});
