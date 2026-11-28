/**
 * Fishing Fun challenge levels. Config keys understood by the game:
 *   duration (s) · rareBoost · junk · windowScale · nibbles · waitScale
 * Metrics: score, fish (caught, boots don't count), rare (puffer or better).
 */
import { FISHING_DEFAULTS } from "./logic";

export { FISHING_DEFAULTS };

export const FISHING_LEVELS = [
  {
    name: "First Cast",
    goal: "Catch fish for 45 seconds",
    config: { duration: 45, nibbles: 0.5 },
    metric: "fish",
    thresholds: [3, 5, 7],
  },
  {
    name: "Nibble Trouble",
    goal: "Lots of fake nibbles: wait for the dive!",
    config: { nibbles: 2 },
    metric: "fish",
    thresholds: [4, 6, 9],
  },
  {
    name: "Rare Waters",
    goal: "Rare fish swim here",
    config: { rareBoost: 3 },
    metric: "rare",
    thresholds: [2, 4, 6],
  },
  {
    name: "Boot Pond",
    goal: "Watch out: this pond is full of boots",
    config: { junk: 3 },
    metric: "score",
    thresholds: [60, 120, 200],
  },
  {
    name: "Quick Fish",
    goal: "Fish bite fast and fight hard",
    config: { waitScale: 0.6, windowScale: 0.8 },
    metric: "fish",
    thresholds: [5, 8, 12],
  },
  {
    name: "Golden Hour",
    goal: "Lots of rare fish, but less time to react",
    config: { rareBoost: 4, windowScale: 0.85, duration: 60 },
    metric: "score",
    thresholds: [100, 180, 280],
  },
  {
    name: "Sleepy Pond",
    goal: "Slow bites, so be patient",
    config: { waitScale: 1.6, nibbles: 1.5 },
    metric: "fish",
    thresholds: [3, 5, 7],
  },
  {
    name: "Big Catch",
    goal: "90 seconds to fill the bucket",
    config: { duration: 90 },
    metric: "score",
    thresholds: [100, 220, 360],
  },
  {
    name: "Master Angler",
    goal: "Fast fish, lots of nibbles, rare catches",
    config: { rareBoost: 2.5, nibbles: 1.8, windowScale: 0.75 },
    metric: "score",
    thresholds: [100, 200, 320],
  },
];
