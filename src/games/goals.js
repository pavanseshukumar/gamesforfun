/**
 * Daily goals: three small goals a day, the same all day (seeded by the date).
 * The store feeds every finished round, cleared level and solved daily puzzle
 * through `trackGoals`, and goal progress is read back from today's stats.
 * Pure functions, shared by the store, the Home card and the tests.
 */
import { createRng, hashString } from "../lib/random";
import { ARCADE } from "./registry";

export const GOAL_XP = 30;
export const BONUS_XP = 60;

/** Points worth chasing in one round, per points game. */
const SCORE_TARGETS = {
  "tap-rush": 60,
  fusion: 250,
  bounce: 15,
  "color-catch": 20,
  "word-pop": 30,
  stack: 12,
  slice: 25,
  "quick-math": 12,
  odd: 12,
};

/** Personal-record goals: a key the game passes in `records`. */
const RECORD_GOALS = [
  { game: "odd", key: "oddStreak", n: 8, text: "Get 8 in a row in Odd One Out" },
  { game: "tap-rush", key: "rushCombo", n: 12, text: "Hit a 12 combo in Tap Rush" },
];

const visible = (id) => ARCADE.some((g) => g.id === id);
const titleOf = (id) => ARCADE.find((g) => g.id === id)?.title ?? id;

/** Today's three goals. */
export function goalsFor(day) {
  const rand = createRng(hashString(`goals:${day}`));
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const builders = {
    rounds: () => {
      const n = pick([3, 4, 5]);
      return { text: `Play ${n} rounds of anything`, target: n, emoji: "🎮" };
    },
    variety: () => {
      const n = pick([2, 3, 4]);
      return { text: `Play ${n} different games`, target: n, emoji: "🧭" };
    },
    playGame: () => {
      const g = pick(ARCADE);
      const n = pick([2, 3]);
      return { text: `Play ${g.title} ${n} times`, target: n, game: g.id, emoji: g.emoji };
    },
    levels: () => {
      const n = pick([2, 3]);
      return { text: `Clear ${n} levels in any game`, target: n, emoji: "🗺️" };
    },
    perfect: () => ({ text: "Get 3 stars on a level", target: 1, emoji: "⭐" }),
    score: () => {
      const id = pick(Object.keys(SCORE_TARGETS).filter(visible));
      const n = SCORE_TARGETS[id];
      return { text: `Score ${n} in ${titleOf(id)}`, target: n, game: id, emoji: "🏆" };
    },
    daily: () => ({ text: "Solve today's Daily Puzzle", target: 1, emoji: "🧩" }),
    record: () => {
      const r = pick(RECORD_GOALS.filter((g) => visible(g.game)));
      return { text: r.text, target: r.n, game: r.game, key: r.key, emoji: "🔥" };
    },
  };
  const types = Object.keys(builders);
  const chosen = [];
  while (chosen.length < 3) {
    const type = pick(types);
    if (!chosen.includes(type)) chosen.push(type);
  }
  return chosen.map((type, i) => ({ id: `${day}:${i}`, type, ...builders[type]() }));
}

export const freshGoalStats = (day) => ({
  day,
  rounds: 0,
  games: [], // distinct game ids played today
  playsBy: {}, // gameId → rounds today
  bestScore: {}, // gameId → best single-round score today
  levels: 0, // levels cleared (≥ 1 star) today
  perfects: 0, // 3-star clears today
  daily: false,
  records: {}, // record key → best today
});

/**
 * Folds one event into today's stats (starting fresh on a new day).
 * event: { type: "round", gameId, score, records } | { type: "level", stars } | { type: "daily" }
 */
export function trackGoals(stats, event, day) {
  const s = stats?.day === day ? stats : freshGoalStats(day);
  if (event.type === "round") {
    const { gameId, score = 0, records = {} } = event;
    const nextRecords = { ...s.records };
    for (const [k, v] of Object.entries(records)) nextRecords[k] = Math.max(nextRecords[k] ?? 0, v);
    return {
      ...s,
      rounds: s.rounds + 1,
      games: s.games.includes(gameId) ? s.games : [...s.games, gameId],
      playsBy: { ...s.playsBy, [gameId]: (s.playsBy[gameId] ?? 0) + 1 },
      bestScore: { ...s.bestScore, [gameId]: Math.max(s.bestScore[gameId] ?? 0, score) },
      records: nextRecords,
    };
  }
  if (event.type === "level") {
    if (!(event.stars > 0)) return s;
    return { ...s, levels: s.levels + 1, perfects: s.perfects + (event.stars === 3 ? 1 : 0) };
  }
  if (event.type === "daily") return { ...s, daily: true };
  return s;
}

/** Progress towards a goal (compare with goal.target). */
export function goalProgress(goal, stats, day) {
  const s = stats?.day === day ? stats : freshGoalStats(day);
  switch (goal.type) {
    case "rounds":
      return s.rounds;
    case "variety":
      return s.games.length;
    case "playGame":
      return s.playsBy[goal.game] ?? 0;
    case "levels":
      return s.levels;
    case "perfect":
      return s.perfects;
    case "score":
      return s.bestScore[goal.game] ?? 0;
    case "daily":
      return s.daily ? 1 : 0;
    case "record":
      return s.records[goal.key] ?? 0;
    default:
      return 0;
  }
}

export const isDone = (goal, stats, day) => goalProgress(goal, stats, day) >= goal.target;
