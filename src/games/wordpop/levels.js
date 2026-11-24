/**
 * Word Pop challenge levels. Config keys understood by the game:
 *   duration (s) · minLength (shortest word accepted) · goldenRate
 *   riseScale (bubble rise time ×; lower = faster) · maxBubbles
 * Metrics: score, words (words found), longest (letters in the longest word).
 */
export const WORD_POP_DEFAULTS = {
  duration: 90,
  minLength: 3,
  goldenRate: 0.06,
  riseScale: 1,
  maxBubbles: 15,
};

export const WORD_POP_LEVELS = [
  {
    name: "First Words",
    goal: "Find words in 90 seconds",
    config: {},
    metric: "words",
    thresholds: [4, 7, 10],
  },
  {
    name: "Four or More",
    goal: "Only words of 4+ letters count",
    config: { minLength: 4 },
    metric: "score",
    thresholds: [30, 60, 90],
  },
  {
    name: "Golden Letters",
    goal: "Lots of golden bubbles",
    config: { goldenRate: 0.25 },
    metric: "score",
    thresholds: [60, 100, 140],
  },
  {
    name: "Quick Round",
    goal: "Just 45 seconds",
    config: { duration: 45 },
    metric: "score",
    thresholds: [30, 55, 80],
  },
  {
    name: "Long Words",
    goal: "Spell the longest word you can",
    config: {},
    metric: "longest",
    thresholds: [5, 6, 7],
  },
  {
    name: "Fast Bubbles",
    goal: "Letters rise much faster",
    config: { riseScale: 0.6 },
    metric: "score",
    thresholds: [30, 60, 90],
  },
  {
    name: "Word Count",
    goal: "Find as many words as you can",
    config: {},
    metric: "words",
    thresholds: [8, 12, 16],
  },
  {
    name: "Five or More",
    goal: "Only words of 5+ letters count",
    config: { minLength: 5 },
    metric: "score",
    thresholds: [25, 50, 80],
  },
  {
    name: "Bubble Bath",
    goal: "A screen full of letters",
    config: { maxBubbles: 22 },
    metric: "score",
    thresholds: [60, 100, 140],
  },
  {
    name: "Word Wizard",
    goal: "Two minutes, 4+ letters, quicker bubbles",
    config: { duration: 120, minLength: 4, riseScale: 0.8 },
    metric: "score",
    thresholds: [80, 130, 180],
  },
];
