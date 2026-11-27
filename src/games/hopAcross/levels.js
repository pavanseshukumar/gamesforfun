/**
 * Hop Across challenge levels. Config keys understood by the game:
 *   duration (s, 0 = until you fall in) · speedScale · padScale · sinkScale
 *   flyRate · startRow (start the river at a harder point)
 * Metrics: rows (crossed), flies (eaten), score (rows + 5 per fly).
 */
import { HOP_DEFAULTS } from "./world";

export { HOP_DEFAULTS };

export const HOP_LEVELS = [
  {
    name: "First Hops",
    goal: "Cross as many rows as you can",
    config: { speedScale: 0.8 },
    metric: "rows",
    thresholds: [8, 14, 20],
  },
  {
    name: "Fly Snacks",
    goal: "Eat flies sitting on the pads",
    config: { flyRate: 2.5, duration: 45 },
    metric: "flies",
    thresholds: [3, 5, 8],
  },
  {
    name: "Quick Feet",
    goal: "Cross rows in 30 s",
    config: { duration: 30 },
    metric: "rows",
    thresholds: [10, 16, 22],
  },
  {
    name: "Fast Current",
    goal: "The river runs faster",
    config: { speedScale: 1.3 },
    metric: "rows",
    thresholds: [8, 14, 20],
  },
  {
    name: "Tiny Pads",
    goal: "Smaller lily pads to land on",
    config: { padScale: 0.75 },
    metric: "rows",
    thresholds: [6, 12, 18],
  },
  {
    name: "Sinking Fast",
    goal: "Pads sink twice as quickly",
    config: { sinkScale: 0.55 },
    metric: "rows",
    thresholds: [8, 14, 20],
  },
  {
    name: "Fly Feast",
    goal: "Flies everywhere for 60 s",
    config: { flyRate: 3.5, duration: 60 },
    metric: "flies",
    thresholds: [5, 9, 13],
  },
  {
    name: "Deep River",
    goal: "Start far from the bank",
    config: { startRow: 18 },
    metric: "rows",
    thresholds: [5, 10, 15],
  },
  {
    name: "Rapids",
    goal: "Fast water and small pads",
    config: { speedScale: 1.45, padScale: 0.85 },
    metric: "rows",
    thresholds: [6, 11, 16],
  },
  {
    name: "Marathon",
    goal: "Rows and flies all count",
    config: {},
    metric: "score",
    thresholds: [40, 70, 100],
  },
];
