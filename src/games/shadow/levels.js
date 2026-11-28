/**
 * Shadow Match challenge levels. Config keys understood by the game:
 *   duration (s) · options (3, 4 or 6) · startTier (0–3) · penalty (s per miss) · suddenDeath
 * Metrics: score (with streak multiplier), correct, streak (best run).
 */
import { SHADOW_DEFAULTS } from "./logic";

export { SHADOW_DEFAULTS };

export const SHADOW_LEVELS = [
  {
    name: "Who's That?",
    goal: "Three choices: which buddy made the shadow?",
    config: { options: 3, duration: 45 },
    metric: "correct",
    thresholds: [6, 10, 14],
  },
  {
    name: "Hat Shadows",
    goal: "Same buddy, different hats",
    config: { startTier: 1, duration: 45 },
    metric: "correct",
    thresholds: [6, 10, 14],
  },
  {
    name: "Strike a Pose",
    goal: "Hats or arms in the air?",
    config: { startTier: 2, duration: 45 },
    metric: "correct",
    thresholds: [5, 9, 13],
  },
  {
    name: "Shadow Streak",
    goal: "Get as many in a row as you can",
    config: {},
    metric: "streak",
    thresholds: [4, 8, 12],
  },
  {
    name: "Six Suspects",
    goal: "Six buddies to choose from",
    config: { options: 6 },
    metric: "score",
    thresholds: [12, 22, 34],
  },
  {
    name: "Tricky Tails",
    goal: "Under a hat, only tails give it away",
    config: { startTier: 3 },
    metric: "correct",
    thresholds: [6, 11, 16],
  },
  {
    name: "Quick Eyes",
    goal: "30 seconds, misses cost 5 s",
    config: { duration: 30, penalty: 5 },
    metric: "score",
    thresholds: [5, 13, 22],
  },
  {
    name: "Sudden Shadow",
    goal: "One wrong answer ends it",
    config: { suddenDeath: true, duration: 90 },
    metric: "correct",
    thresholds: [4, 9, 15],
  },
  {
    name: "Shadow Master",
    goal: "Six choices, hardest shadows",
    config: { options: 6, startTier: 3, duration: 60 },
    metric: "score",
    thresholds: [10, 20, 32],
  },
];
