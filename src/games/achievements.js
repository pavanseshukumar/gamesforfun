import { GAMES } from "./registry";

const total = (plays) => Object.values(plays).reduce((a, b) => a + b, 0);

/**
 * Every achievement: `value(state)` reads the current number and `goal` is the
 * target. For "lower is better" goals, set `lower: true`.
 */
export const ACHIEVEMENTS = [
  {
    id: "first-game",
    title: "First Steps",
    desc: "Finish any game",
    emoji: "👟",
    colors: ["#FFE066", "#FFB703"],
    goal: 1,
    value: (s) => total(s.plays),
  },
  {
    id: "explorer",
    title: "Explorer",
    desc: "Play every game once",
    emoji: "🧭",
    colors: ["#8FC1FF", "#4D8CFF"],
    goal: GAMES.length,
    value: (s) => GAMES.filter((g) => s.plays[g.id] > 0).length,
  },
  {
    id: "regular",
    title: "Regular",
    desc: "Play 25 games",
    emoji: "🎮",
    colors: ["#C9A8FF", "#8A5CFF"],
    goal: 25,
    value: (s) => total(s.plays),
  },
  {
    id: "quick-fingers",
    title: "Quick Fingers",
    desc: "Score 60 in Tap Rush",
    emoji: "⚡",
    colors: ["#FFC46B", "#FF8A1C"],
    goal: 60,
    value: (s) => s.best["tap-rush"] ?? 0,
  },
  {
    id: "combo-king",
    title: "Combo King",
    desc: "Hit a 20 combo in Tap Rush",
    emoji: "🔥",
    colors: ["#FF9A8B", "#FF4D4D"],
    goal: 20,
    value: (s) => s.records.rushCombo ?? 0,
  },
  {
    id: "sharp-mind",
    title: "Sharp Mind",
    desc: "Clear Memory Flip in 14 moves or fewer",
    emoji: "🧠",
    colors: ["#FFB3D6", "#FF5FA2"],
    goal: 14,
    lower: true,
    value: (s) => s.best.memory,
  },
  {
    id: "fusion-512",
    title: "Big Fusion",
    desc: "Make a 512 tile in Fusion",
    emoji: "🔮",
    colors: ["#7FF0C3", "#1FBF7A"],
    goal: 512,
    value: (s) => s.records.fusionTile ?? 0,
  },
  {
    id: "streak-3",
    title: "On Fire",
    desc: "Play 3 days in a row",
    emoji: "📅",
    colors: ["#FFD966", "#FF9F1C"],
    goal: 3,
    value: (s) => s.bestStreak,
  },
  {
    id: "level-5",
    title: "Silver Explorer",
    desc: "Reach level 5",
    emoji: "🥈",
    colors: ["#E3E8F0", "#9AA7BD"],
    goal: 5,
    value: (s) => s.level,
  },
];

/** Progress of one achievement for a state snapshot (state.level must be set). */
export function progressOf(a, state) {
  const v = a.value(state);
  if (a.lower) {
    const done = v != null && v <= a.goal;
    return { done, ratio: done ? 1 : v == null ? 0 : Math.min(0.95, a.goal / v), label: v ?? "–" };
  }
  const value = v ?? 0;
  return {
    done: value >= a.goal,
    ratio: Math.min(1, value / a.goal),
    label: `${Math.min(value, a.goal)}/${a.goal}`,
  };
}
