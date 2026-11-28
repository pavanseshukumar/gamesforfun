/**
 * Kit's Burrow challenge levels. Config keys understood by the game:
 *   size (grid) · words (hidden) · dirs ("easy" → ↓, "diag", "all" incl. backwards)
 *   duration (s) · theme (a THEMES key)
 * Metrics: found (words), score (10 per letter + 2 per second left), seconds (to clear, lower).
 */
import { BURROW_DEFAULTS } from "./logic";

export { BURROW_DEFAULTS };

export const BURROW_LEVELS = [
  {
    name: "First Dig",
    goal: "Find the animals: across and down only",
    config: { size: 5, words: 4, theme: "Animals", duration: 90 },
    metric: "found",
    thresholds: [2, 3, 4],
  },
  {
    name: "Snack Stash",
    goal: "Five snacks hidden in the burrow",
    config: { words: 5, theme: "Snacks" },
    metric: "found",
    thresholds: [3, 4, 5],
  },
  {
    name: "Speedy Paws",
    goal: "Clear the grid as fast as you can",
    config: { size: 5, words: 4, duration: 120 },
    metric: "seconds",
    lower: true,
    thresholds: [100, 60, 35],
  },
  {
    name: "Slanty Tunnels",
    goal: "Words can run diagonally now",
    config: { dirs: "diag", words: 5, theme: "Garden" },
    metric: "found",
    thresholds: [3, 4, 5],
  },
  {
    name: "Rainbow Room",
    goal: "Six colours in a bigger burrow",
    config: { size: 7, words: 6, dirs: "diag", theme: "Colours", duration: 120 },
    metric: "found",
    thresholds: [3, 5, 6],
  },
  {
    name: "Upside Down",
    goal: "Words can run backwards too!",
    config: { dirs: "all", words: 5, theme: "Ocean", duration: 120 },
    metric: "found",
    thresholds: [3, 4, 5],
  },
  {
    name: "Quick Burrow",
    goal: "Only 45 seconds on the clock",
    config: { size: 5, words: 4, duration: 45 },
    metric: "score",
    thresholds: [60, 120, 190],
  },
  {
    name: "Playground",
    goal: "Seven playtime words, every direction",
    config: { size: 7, words: 7, dirs: "all", theme: "Playtime", duration: 150 },
    metric: "found",
    thresholds: [4, 6, 7],
  },
  {
    name: "Deep Tunnels",
    goal: "An 8×8 burrow with eight words",
    config: { size: 8, words: 8, dirs: "all", duration: 180 },
    metric: "score",
    thresholds: [150, 280, 400],
  },
  {
    name: "Master Digger",
    goal: "Clear a big burrow against the clock",
    config: { size: 8, words: 8, dirs: "all", duration: 240 },
    metric: "seconds",
    lower: true,
    thresholds: [220, 150, 100],
  },
];
