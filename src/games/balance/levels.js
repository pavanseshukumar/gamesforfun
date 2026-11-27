/**
 * Balance Buddy challenge levels. Config keys (see world.js BALANCE_DEFAULTS):
 *   duration (s, 0 = endless) · dropScale · boxScale · starRate · wind · plankScale
 * Metrics: seconds (survived), stars (collected), score (seconds + 5 per star).
 */
import { BALANCE_DEFAULTS } from "./world";

export { BALANCE_DEFAULTS };

export const BALANCE_LEVELS = [
  {
    name: "First Wobble",
    goal: "Keep Bolt on the seesaw for 30 s",
    config: { duration: 30 },
    metric: "seconds",
    thresholds: [10, 20, 30],
  },
  {
    name: "Star Catcher",
    goal: "Roll Bolt into the falling stars",
    config: { duration: 45, starRate: 1.8 },
    metric: "stars",
    thresholds: [2, 4, 6],
  },
  {
    name: "Crate Rain",
    goal: "Crates fall twice as often",
    config: { duration: 45, dropScale: 1.7 },
    metric: "seconds",
    thresholds: [15, 30, 45],
  },
  {
    name: "Big Boxes",
    goal: "Heavier crates tip the seesaw harder",
    config: { duration: 45, boxScale: 1.4 },
    metric: "seconds",
    thresholds: [15, 30, 45],
  },
  {
    name: "Breezy",
    goal: "A gusty wind pushes Bolt around",
    config: { duration: 45, wind: 0.7 },
    metric: "seconds",
    thresholds: [15, 30, 45],
  },
  {
    name: "Short Plank",
    goal: "Less room to roll",
    config: { duration: 45, plankScale: 0.75 },
    metric: "seconds",
    thresholds: [15, 30, 45],
  },
  {
    name: "Star Storm",
    goal: "Lots of stars, lots of crates",
    config: { duration: 60, starRate: 2.4, dropScale: 1.3 },
    metric: "stars",
    thresholds: [4, 7, 10],
  },
  {
    name: "Gusty Day",
    goal: "Wind and crates together",
    config: { duration: 60, wind: 1.1, dropScale: 1.2 },
    metric: "seconds",
    thresholds: [20, 40, 60],
  },
  {
    name: "Tiny Plank",
    goal: "A short plank and big crates",
    config: { duration: 60, plankScale: 0.65, boxScale: 1.2 },
    metric: "seconds",
    thresholds: [20, 40, 60],
  },
  {
    name: "Storm Balance",
    goal: "Survive the storm and grab stars",
    config: { duration: 90, dropScale: 1.6, wind: 1, plankScale: 0.8 },
    metric: "score",
    thresholds: [40, 80, 115],
  },
];
