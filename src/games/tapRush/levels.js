/**
 * Tap Rush challenge levels. Config keys understood by the game:
 *   duration (s) · lifeScale (orb lifetime ×) · sizeScale (orb size ×)
 *   goldenRate (0–1) · maxOnScreen · suddenDeath (a miss ends the round)
 * Metrics: score, combo (best combo), hits.
 */
export const TAP_RUSH_DEFAULTS = {
  duration: 30,
  lifeScale: 1,
  sizeScale: 1,
  goldenRate: 0.08,
  maxOnScreen: 4,
  suddenDeath: false,
};

export const TAP_RUSH_LEVELS = [
  {
    name: "Warm-up",
    goal: "Score points in 30 seconds",
    config: {},
    metric: "score",
    thresholds: [15, 25, 35],
  },
  {
    name: "Quick Hands",
    goal: "Only 20 seconds on the clock",
    config: { duration: 20 },
    metric: "score",
    thresholds: [12, 20, 28],
  },
  {
    name: "Gold Rush",
    goal: "Lots of golden orbs — grab them!",
    config: { goldenRate: 0.3 },
    metric: "score",
    thresholds: [40, 60, 80],
  },
  {
    name: "Blink",
    goal: "Orbs fade twice as fast",
    config: { lifeScale: 0.55 },
    metric: "score",
    thresholds: [15, 25, 35],
  },
  {
    name: "Combo Class",
    goal: "Build the longest combo you can",
    config: {},
    metric: "combo",
    thresholds: [10, 18, 25],
  },
  {
    name: "Crowded",
    goal: "Up to 7 orbs at once",
    config: { maxOnScreen: 7 },
    metric: "score",
    thresholds: [35, 50, 65],
  },
  {
    name: "Tiny Orbs",
    goal: "Small targets need sharp aim",
    config: { sizeScale: 0.65 },
    metric: "score",
    thresholds: [15, 25, 35],
  },
  {
    name: "Sudden Death",
    goal: "One miss and it's over",
    config: { suddenDeath: true, duration: 45 },
    metric: "hits",
    thresholds: [10, 20, 30],
  },
  {
    name: "Sprint",
    goal: "15 seconds, as many as you can",
    config: { duration: 15 },
    metric: "score",
    thresholds: [10, 16, 22],
  },
  {
    name: "Grand Rush",
    goal: "45 seconds of fast, tiny orbs",
    config: { duration: 45, lifeScale: 0.8, sizeScale: 0.8, maxOnScreen: 5 },
    metric: "score",
    thresholds: [50, 75, 100],
  },
];
