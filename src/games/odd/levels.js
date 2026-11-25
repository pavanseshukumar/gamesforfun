/**
 * Odd One Out challenge levels. Config keys understood by the game:
 *   duration (s) · modes (which round types; null = unlock by tier) · startTier
 *   shadeScale (<1 makes shades subtler) · penalty (s lost per miss) · suddenDeath
 * Metrics: score (with streak multiplier), correct, streak (best run).
 */
export const ODD_DEFAULTS = {
  duration: 60,
  modes: null,
  startTier: 0,
  shadeScale: 1,
  penalty: 3,
  suddenDeath: false,
};

export const ODD_LEVELS = [
  {
    name: "Spot It",
    goal: "Shades and buddies only",
    config: { duration: 45, modes: ["shade", "buddy"] },
    metric: "score",
    thresholds: [10, 18, 26],
  },
  {
    name: "Colour Clash",
    goal: "Find the one in a different colour — ignore the words!",
    config: { duration: 45, modes: ["ink"] },
    metric: "score",
    thresholds: [8, 15, 22],
  },
  {
    name: "Word Trap",
    goal: "Find the different word — ignore the colours!",
    config: { duration: 45, modes: ["word"] },
    metric: "score",
    thresholds: [8, 15, 22],
  },
  {
    name: "True Colours",
    goal: "Find the word that matches its colour",
    config: { duration: 45, modes: ["match"] },
    metric: "score",
    thresholds: [6, 12, 18],
  },
  {
    name: "Fine Shades",
    goal: "Very similar shades",
    config: { duration: 45, modes: ["shade"], shadeScale: 0.6, startTier: 2 },
    metric: "correct",
    thresholds: [6, 11, 16],
  },
  {
    name: "Buddy Check",
    goal: "Spot the buddy with a different face",
    config: { duration: 45, modes: ["buddy"], startTier: 3 },
    metric: "correct",
    thresholds: [6, 11, 16],
  },
  {
    name: "Mind Bender",
    goal: "Every colour-word trick, mixed",
    config: { duration: 60, modes: ["ink", "word", "match"] },
    metric: "score",
    thresholds: [12, 22, 32],
  },
  {
    name: "Speed Round",
    goal: "Everything, in only 30 seconds",
    config: { duration: 30, startTier: 2 },
    metric: "score",
    thresholds: [8, 15, 22],
  },
  {
    name: "Sudden Death",
    goal: "One wrong tap and it's over",
    config: { duration: 120, suddenDeath: true, startTier: 1 },
    metric: "correct",
    thresholds: [8, 16, 25],
  },
  {
    name: "Odd Master",
    goal: "The hardest rounds from the start",
    config: { duration: 60, startTier: 4, shadeScale: 0.8 },
    metric: "streak",
    thresholds: [6, 12, 18],
  },
];
