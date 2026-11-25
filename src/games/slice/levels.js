/**
 * Slice Splash challenge levels. Config keys understood by the game:
 *   lives · duration (s, 0 = until out of hearts) · grumpScale (Grump chance ×)
 *   goldenRate · waveScale (time between waves ×) · sizeBonus (extra bubbles per wave)
 * Metrics: score, combo (best combo), sliced (bubbles sliced).
 */
export const SLICE_DEFAULTS = {
  lives: 3,
  duration: 0,
  grumpScale: 1,
  goldenRate: 0.06,
  waveScale: 1,
  sizeBonus: 0,
};

export const SLICE_LEVELS = [
  {
    name: "First Slices",
    goal: "Slice the jelly bubbles",
    config: {},
    metric: "score",
    thresholds: [10, 20, 30],
  },
  {
    name: "No Grumps",
    goal: "Grump-free — slice everything!",
    config: { grumpScale: 0 },
    metric: "score",
    thresholds: [20, 35, 50],
  },
  {
    name: "Golden Hour",
    goal: "Golden bubbles are everywhere",
    config: { goldenRate: 0.3 },
    metric: "score",
    thresholds: [30, 50, 70],
  },
  {
    name: "Combo Kitchen",
    goal: "Slice many bubbles in one swipe",
    config: { sizeBonus: 1 },
    metric: "combo",
    thresholds: [3, 4, 5],
  },
  {
    name: "Grump Party",
    goal: "Lots of Grumps — slice carefully",
    config: { grumpScale: 2.5 },
    metric: "score",
    thresholds: [10, 20, 30],
  },
  {
    name: "Busy Board",
    goal: "Waves come much faster",
    config: { waveScale: 0.6 },
    metric: "score",
    thresholds: [20, 35, 50],
  },
  {
    name: "One Heart",
    goal: "One mistake ends it",
    config: { lives: 1 },
    metric: "sliced",
    thresholds: [10, 18, 28],
  },
  {
    name: "Minute Mix",
    goal: "60 seconds, five hearts",
    config: { duration: 60, lives: 5 },
    metric: "score",
    thresholds: [25, 40, 60],
  },
  {
    name: "Big Waves",
    goal: "Two extra bubbles every wave",
    config: { sizeBonus: 2 },
    metric: "score",
    thresholds: [25, 40, 55],
  },
  {
    name: "Chef's Special",
    goal: "Fast waves, more Grumps, more gold",
    config: { waveScale: 0.7, grumpScale: 1.5, goldenRate: 0.12 },
    metric: "score",
    thresholds: [25, 40, 60],
  },
];
