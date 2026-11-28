/**
 * Pattern Parade challenge levels. Config keys understood by the game:
 *   pads (3–6) · startLength · stepMs · speedUp · lives · reverse · shuffle · fresh
 * Metrics: rounds (cleared), longest (longest dance repeated), score.
 */
import { PARADE_DEFAULTS } from "./logic";

export { PARADE_DEFAULTS };

export const PARADE_LEVELS = [
  {
    name: "Warm-up",
    goal: "Three buddies, a slow dance",
    config: { pads: 3, stepMs: 700, lives: 2 },
    metric: "rounds",
    thresholds: [3, 5, 7],
  },
  {
    name: "Four Friends",
    goal: "Repeat the dance as it grows",
    config: {},
    metric: "rounds",
    thresholds: [3, 6, 9],
  },
  {
    name: "Quickstep",
    goal: "A faster dance that speeds up",
    config: { stepMs: 420, speedUp: 0.06 },
    metric: "rounds",
    thresholds: [3, 5, 8],
  },
  {
    name: "Big Stage",
    goal: "Five buddies to remember",
    config: { pads: 5 },
    metric: "rounds",
    thresholds: [3, 5, 8],
  },
  {
    name: "Backwards",
    goal: "Repeat each dance in reverse",
    config: { reverse: true, lives: 2 },
    metric: "rounds",
    thresholds: [2, 4, 6],
  },
  {
    name: "Long Start",
    goal: "The first dance is already 5 steps",
    config: { startLength: 5, lives: 2 },
    metric: "longest",
    thresholds: [6, 8, 10],
  },
  {
    name: "Musical Chairs",
    goal: "The buddies swap places every round",
    config: { shuffle: true, lives: 2 },
    metric: "rounds",
    thresholds: [2, 4, 7],
  },
  {
    name: "Fresh Moves",
    goal: "A brand-new dance every round",
    config: { fresh: true, lives: 2 },
    metric: "rounds",
    thresholds: [2, 4, 6],
  },
  {
    name: "Full Party",
    goal: "Six buddies on stage",
    config: { pads: 6, lives: 2 },
    metric: "score",
    thresholds: [20, 45, 75],
  },
  {
    name: "Dance Master",
    goal: "Fast, five buddies, one chance",
    config: { pads: 5, stepMs: 450, speedUp: 0.05 },
    metric: "longest",
    thresholds: [5, 8, 11],
  },
];
