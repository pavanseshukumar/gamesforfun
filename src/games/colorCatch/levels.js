/**
 * Color Catch challenge levels. Config keys understood by the game:
 *   lives · duration (s, 0 = until out of hearts) · switchEvery (s)
 *   speedScale · spawnScale (time between drops ×) · targetShare (0–1)
 *   powerups (shield / slow-mo drops) · colors (2–4 colours in play)
 * Metrics: score, catches (right-colour catches), switches.
 */
export const COLOR_CATCH_DEFAULTS = {
  lives: 3,
  duration: 0,
  switchEvery: 8,
  speedScale: 1,
  spawnScale: 1,
  targetShare: 0.45,
  powerups: true,
  colors: 4,
};

export const COLOR_CATCH_LEVELS = [
  {
    name: "Catch!",
    goal: "Catch the right colour",
    config: {},
    metric: "score",
    thresholds: [10, 20, 30],
  },
  {
    name: "Two Colours",
    goal: "Only two colours — easy to tell apart",
    config: { colors: 2 },
    metric: "score",
    thresholds: [15, 25, 40],
  },
  {
    name: "Speed Drops",
    goal: "Drops fall 40% faster",
    config: { speedScale: 1.4 },
    metric: "score",
    thresholds: [10, 18, 28],
  },
  {
    name: "Switch It Up",
    goal: "The target changes every 4 seconds",
    config: { switchEvery: 4 },
    metric: "switches",
    thresholds: [5, 8, 12],
  },
  {
    name: "Downpour",
    goal: "So many drops!",
    config: { spawnScale: 0.6 },
    metric: "score",
    thresholds: [20, 35, 50],
  },
  {
    name: "One Heart",
    goal: "A single mistake ends it",
    config: { lives: 1 },
    metric: "score",
    thresholds: [8, 15, 25],
  },
  {
    name: "Rainbow Rain",
    goal: "Few drops are your colour — be patient",
    config: { targetShare: 0.25 },
    metric: "catches",
    thresholds: [8, 15, 22],
  },
  {
    name: "Minute Rush",
    goal: "Score as much as you can in 60 s",
    config: { duration: 60 },
    metric: "score",
    thresholds: [20, 35, 50],
  },
  {
    name: "No Power-ups",
    goal: "No shields, no slow-mo",
    config: { powerups: false },
    metric: "score",
    thresholds: [15, 25, 35],
  },
  {
    name: "Storm",
    goal: "Fast, busy and always switching",
    config: { speedScale: 1.3, spawnScale: 0.7, switchEvery: 6 },
    metric: "score",
    thresholds: [20, 32, 45],
  },
];
