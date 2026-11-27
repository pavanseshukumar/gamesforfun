import { useGameStore } from "../src/store/useGameStore";

const store = () => useGameStore.getState();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 24, 15, 0, 0));
  store().resetStats();
});

afterEach(() => jest.useRealTimers());

describe("recordGame", () => {
  test("first score is a best; a lower score is not", () => {
    expect(store().recordGame("tap-rush", 40).isNewBest).toBe(true);
    expect(store().recordGame("tap-rush", 30).isNewBest).toBe(false);
    expect(store().best["tap-rush"]).toBe(40);
    expect(store().plays["tap-rush"]).toBe(2);
  });

  test("zero never counts as a best in a points game", () => {
    expect(store().recordGame("tap-rush", 0).isNewBest).toBe(false);
    expect(store().best["tap-rush"]).toBeUndefined();
  });

  test("lower-is-better games keep the smallest score", () => {
    store().recordGame("memory", 20, { lowerIsBetter: true });
    expect(store().recordGame("memory", 14, { lowerIsBetter: true }).isNewBest).toBe(true);
    expect(store().recordGame("memory", 18, { lowerIsBetter: true }).isNewBest).toBe(false);
    expect(store().best.memory).toBe(14);
  });

  test("XP accumulates and level-ups are reported once", () => {
    const first = store().recordGame("fusion", 100, { xp: 70 });
    expect(first).toMatchObject({ xpGained: 70, levelUp: 2 });
    expect(store().xp).toBe(70);
    expect(store().recordGame("fusion", 100, { xp: 1 }).levelUp).toBeNull();
  });

  test("challenge rounds (countsForBest: false) never change the endless best", () => {
    store().recordGame("tap-rush", 40);
    const r = store().recordGame("tap-rush", 99, { countsForBest: false, xp: 15 });
    expect(r.isNewBest).toBe(false);
    expect(store().best["tap-rush"]).toBe(40);
    expect(store().plays["tap-rush"]).toBe(2); // still counts as a game played
    expect(store().xp).toBe(25);
  });

  test("records keep maxima, and min: keys keep minima", () => {
    store().recordGame("bounce", 10, { records: { bounceHeight: 12, "min:x": 9 } });
    store().recordGame("bounce", 10, { records: { bounceHeight: 8, "min:x": 4 } });
    expect(store().records).toMatchObject({ bounceHeight: 12, "min:x": 4 });
  });
});

describe("Streaks", () => {
  test("playing on consecutive days builds a streak; skipping a day resets it", () => {
    store().recordGame("tap-rush", 5);
    expect(store().streak).toBe(1);
    store().recordGame("tap-rush", 5); // same day: unchanged
    expect(store().streak).toBe(1);

    jest.setSystemTime(new Date(2026, 10, 25, 9, 0, 0));
    store().recordGame("tap-rush", 5);
    expect(store().streak).toBe(2);

    jest.setSystemTime(new Date(2026, 10, 27, 9, 0, 0)); // skipped the 26th
    store().recordGame("tap-rush", 5);
    expect(store().streak).toBe(1);
    expect(store().bestStreak).toBe(2);
  });
});

describe("Daily puzzle results", () => {
  test("only the first solve of a day is stored", () => {
    expect(store().recordDaily("2026-11-24", 150)).toBe(true);
    expect(store().recordDaily("2026-11-24", 90)).toBe(false);
    expect(store().daily["2026-11-24"]).toBe(150);
  });
});

describe("Settings", () => {
  test("reset keeps profile and settings but clears progress", () => {
    store().setName("Pavan");
    store().setSound(false);
    store().recordGame("tap-rush", 50, { xp: 60 });
    store().resetStats();
    expect(store()).toMatchObject({ name: "Pavan", sound: false, xp: 0, best: {}, plays: {} });
    store().setSound(true);
  });

  test("control preferences are stored per game", () => {
    store().setControl("colorCatch", "drag");
    expect(store().controls.colorCatch).toBe("drag");
  });
});

describe("saved buddy from the first cast", () => {
  test("moves to its replacement when old saves load", () => {
    const { persist } = useGameStore;
    const migrate = persist.getOptions().migrate;
    expect(migrate({ avatar: "zip", xp: 5 }, 0)).toEqual({ avatar: "spike", xp: 5 });
    expect(migrate({ avatar: "sunny" }, 0).avatar).toBe("pom");
    expect(migrate({ avatar: "mochi" }, 0).avatar).toBe("mochi");
  });
});
