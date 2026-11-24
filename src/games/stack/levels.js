/**
 * Stack Tower challenge levels. Config keys understood by the game:
 *   speedScale (block speed ×) · baseScale (starting width ×)
 *   grow (perfect streaks grow the block back)
 * Metrics: height, perfects (total), perfectRun (best streak), score.
 */
export const STACK_DEFAULTS = { speedScale: 1, baseScale: 1, grow: true };

export const STACK_LEVELS = [
  {
    name: "First Floors",
    goal: "Build a tower",
    config: {},
    metric: "height",
    thresholds: [8, 12, 16],
  },
  {
    name: "Speedy",
    goal: "Blocks slide 40% faster",
    config: { speedScale: 1.4 },
    metric: "height",
    thresholds: [6, 10, 14],
  },
  {
    name: "Narrow Base",
    goal: "Start with a thin block",
    config: { baseScale: 0.6 },
    metric: "height",
    thresholds: [6, 10, 14],
  },
  {
    name: "Perfect Streak",
    goal: "Land perfect drops in a row",
    config: {},
    metric: "perfectRun",
    thresholds: [3, 5, 8],
  },
  {
    name: "No Regrowth",
    goal: "Perfects won't grow your block back",
    config: { grow: false },
    metric: "height",
    thresholds: [8, 12, 16],
  },
  {
    name: "Fast Lane",
    goal: "Blocks fly 70% faster",
    config: { speedScale: 1.7 },
    metric: "height",
    thresholds: [5, 8, 12],
  },
  { name: "Skyline", goal: "Go tall!", config: {}, metric: "height", thresholds: [15, 22, 30] },
  {
    name: "Precision",
    goal: "Collect perfect drops",
    config: {},
    metric: "perfects",
    thresholds: [5, 8, 12],
  },
  {
    name: "Skinny",
    goal: "A very thin start — grow it back",
    config: { baseScale: 0.45 },
    metric: "height",
    thresholds: [6, 9, 12],
  },
  {
    name: "Tower of Fame",
    goal: "Fast, narrow and tall",
    config: { speedScale: 1.3, baseScale: 0.7 },
    metric: "height",
    thresholds: [12, 18, 25],
  },
];
