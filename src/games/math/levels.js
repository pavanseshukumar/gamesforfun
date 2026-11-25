/**
 * Quick Math challenge levels. Config keys understood by the game:
 *   duration (s) · ops / max (drill specific operations) · startTier
 *   cardScale (time per card ×) · penalty (s lost per miss) · suddenDeath
 * Metrics: score, correct, streak (best run of right answers).
 */
export const MATH_DEFAULTS = {
  duration: 60,
  ops: null,
  max: 10,
  startTier: 0,
  cardScale: 1,
  penalty: 3,
  suddenDeath: false,
};

export const MATH_LEVELS = [
  {
    name: "Warm-up",
    goal: "Get cards right in 45 s",
    config: { duration: 45 },
    metric: "correct",
    thresholds: [10, 18, 25],
  },
  {
    name: "Plus & Minus",
    goal: "Addition and subtraction up to 20",
    config: { ops: ["+", "−"], max: 20 },
    metric: "score",
    thresholds: [12, 22, 32],
  },
  {
    name: "Times Tables",
    goal: "Only multiplication",
    config: { ops: ["×"], max: 10 },
    metric: "correct",
    thresholds: [8, 14, 20],
  },
  {
    name: "Division",
    goal: "Only division",
    config: { ops: ["÷"], max: 10 },
    metric: "correct",
    thresholds: [8, 14, 20],
  },
  {
    name: "On a Roll",
    goal: "Build the longest streak",
    config: {},
    metric: "streak",
    thresholds: [8, 12, 18],
  },
  {
    name: "Speed Cards",
    goal: "Each card gives you less time",
    config: { cardScale: 0.6 },
    metric: "score",
    thresholds: [15, 25, 35],
  },
  {
    name: "Sudden Death",
    goal: "One wrong answer ends the round",
    config: { suddenDeath: true, duration: 90 },
    metric: "correct",
    thresholds: [10, 20, 30],
  },
  {
    name: "Big Numbers",
    goal: "Start in the big-numbers round",
    config: { startTier: 4 },
    metric: "score",
    thresholds: [12, 22, 32],
  },
  {
    name: "Lightning",
    goal: "Just 30 seconds",
    config: { duration: 30 },
    metric: "score",
    thresholds: [12, 20, 30],
  },
  {
    name: "Math Marathon",
    goal: "90 seconds of quick cards",
    config: { duration: 90, cardScale: 0.8 },
    metric: "score",
    thresholds: [40, 60, 85],
  },
];
