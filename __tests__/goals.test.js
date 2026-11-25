import {
  BONUS_XP,
  freshGoalStats,
  GOAL_XP,
  goalProgress,
  goalsFor,
  isDone,
  trackGoals,
} from "../src/games/goals";
import { ARCADE } from "../src/games/registry";
import { dayKey } from "../src/lib/progress";
import { useGameStore } from "../src/store/useGameStore";

const DAY = "2026-11-24";

describe("daily goal picks", () => {
  test("three different goal types, the same all day", () => {
    const goals = goalsFor(DAY);
    expect(goals).toHaveLength(3);
    expect(new Set(goals.map((g) => g.type)).size).toBe(3);
    expect(goalsFor(DAY)).toEqual(goals);
    for (const g of goals) {
      expect(g.target).toBeGreaterThan(0);
      expect(g.text.length).toBeGreaterThan(5);
    }
  });

  test("a month of goals only ever names games that are shown", () => {
    const ids = ARCADE.map((g) => g.id);
    for (let d = 1; d <= 30; d++) {
      for (const g of goalsFor(`2026-12-${String(d).padStart(2, "0")}`)) {
        if (g.game) expect(ids).toContain(g.game);
      }
    }
  });
});

describe("goal tracking", () => {
  test("rounds, variety, plays, scores and records add up", () => {
    let s = null;
    s = trackGoals(s, { type: "round", gameId: "odd", score: 9, records: { oddStreak: 5 } }, DAY);
    s = trackGoals(s, { type: "round", gameId: "odd", score: 14, records: { oddStreak: 3 } }, DAY);
    s = trackGoals(s, { type: "round", gameId: "maze", score: 2 }, DAY);
    expect(goalProgress({ type: "rounds" }, s, DAY)).toBe(3);
    expect(goalProgress({ type: "variety" }, s, DAY)).toBe(2);
    expect(goalProgress({ type: "playGame", game: "odd" }, s, DAY)).toBe(2);
    expect(goalProgress({ type: "score", game: "odd" }, s, DAY)).toBe(14);
    expect(goalProgress({ type: "record", key: "oddStreak" }, s, DAY)).toBe(5);
  });

  test("levels, perfects and the daily puzzle", () => {
    let s = freshGoalStats(DAY);
    s = trackGoals(s, { type: "level", stars: 2 }, DAY);
    s = trackGoals(s, { type: "level", stars: 3 }, DAY);
    s = trackGoals(s, { type: "level", stars: 0 }, DAY);
    s = trackGoals(s, { type: "daily" }, DAY);
    expect(goalProgress({ type: "levels" }, s, DAY)).toBe(2);
    expect(isDone({ type: "perfect", target: 1 }, s, DAY)).toBe(true);
    expect(isDone({ type: "daily", target: 1 }, s, DAY)).toBe(true);
  });

  test("a new day starts from zero", () => {
    const s = trackGoals(null, { type: "round", gameId: "odd" }, DAY);
    expect(goalProgress({ type: "rounds" }, s, "2026-11-25")).toBe(0);
    expect(trackGoals(s, { type: "daily" }, "2026-11-25").rounds).toBe(0);
  });
});

describe("claiming goals in the store", () => {
  const store = () => useGameStore.getState();
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 24, 15, 0, 0));
    store().resetStats();
  });
  afterEach(() => jest.useRealTimers());

  /** Plays enough to finish any goal type. */
  const finishEverything = () => {
    for (const g of ARCADE) {
      for (let i = 0; i < 3; i++) {
        store().recordGame(g.id, 1000, { records: { oddStreak: 50, rushCombo: 50 } });
      }
    }
    for (let i = 0; i < 3; i++) store().recordLevel("maze", i + 1, 3, 100);
    store().recordDaily(dayKey(), 20);
  };

  test("unfinished goals can't be claimed; finished ones pay XP once", () => {
    const [first] = goalsFor(dayKey());
    expect(store().claimGoal(first.id)).toBeNull();
    finishEverything();
    const xp = store().xp;
    expect(store().claimGoal(first.id).xpGained).toBe(GOAL_XP);
    expect(store().xp).toBe(xp + GOAL_XP);
    expect(store().claimGoal(first.id)).toBeNull();
    expect(store().goalsDone).toBe(1);
  });

  test("the bonus needs all three claimed", () => {
    finishEverything();
    const goals = goalsFor(dayKey());
    store().claimGoal(goals[0].id);
    expect(store().claimGoal("bonus")).toBeNull();
    store().claimGoal(goals[1].id);
    store().claimGoal(goals[2].id);
    expect(store().claimGoal("bonus").xpGained).toBe(BONUS_XP);
    expect(store().claimGoal("bonus")).toBeNull();
    expect(store().goalsDone).toBe(3);
  });
});
