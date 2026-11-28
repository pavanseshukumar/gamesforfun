/**
 * Where's Pom? challenge levels. Config keys understood by the game:
 *   duration (s) · crowd · growth · maxCrowd · disguise (0–1) · bushes · wander · penalty
 *   missions (["one", "many", "hat"]) · themes (["park", "beach", "snow", "night"]) · bonus (0–1)
 * Metrics: found (scenes completed), score.
 */
import { SPOT_DEFAULTS } from "./logic";

export { SPOT_DEFAULTS };

export const SPOT_LEVELS = [
  {
    name: "Picnic",
    goal: "A small crowd: find who's asked for",
    config: { crowd: 6, growth: 1, duration: 45, missions: ["one"], themes: ["park"] },
    metric: "found",
    thresholds: [5, 8, 11],
  },
  {
    name: "Beach Day",
    goal: "Spot buddies on the sand",
    config: { themes: ["beach"], missions: ["one"] },
    metric: "found",
    thresholds: [5, 9, 13],
  },
  {
    name: "Twins & Triplets",
    goal: "Find every one of them!",
    config: { missions: ["many"], themes: ["park", "snow"] },
    metric: "found",
    thresholds: [4, 7, 10],
  },
  {
    name: "Hat Hunt",
    goal: "Find the buddy in the right hat",
    config: { missions: ["hat"], disguise: 0.4 },
    metric: "found",
    thresholds: [4, 7, 10],
  },
  {
    name: "Bushy Garden",
    goal: "Buddies peek out from behind bushes",
    config: { bushes: 5, themes: ["park"] },
    metric: "found",
    thresholds: [4, 8, 12],
  },
  {
    name: "Night Watch",
    goal: "Find them as the torch sweeps by",
    config: { themes: ["night"], crowd: 8, growth: 1 },
    metric: "found",
    thresholds: [3, 6, 9],
  },
  {
    name: "Speedy Spotter",
    goal: "Quick finds score big; grab every ⭐",
    config: { duration: 45, bonus: 0.8 },
    metric: "score",
    thresholds: [60, 180, 300],
  },
  {
    name: "On the Move",
    goal: "The buddies won't stand still",
    config: { wander: true },
    metric: "found",
    thresholds: [4, 8, 12],
  },
  {
    name: "Snow Day",
    goal: "A snowy hill full of hats",
    config: { themes: ["snow"], disguise: 0.6, missions: ["one", "hat"] },
    metric: "found",
    thresholds: [4, 7, 10],
  },
  {
    name: "Carnival",
    goal: "Every mission, every place, all at once",
    config: { disguise: 0.5, bushes: 3, wander: true, duration: 75 },
    metric: "found",
    thresholds: [4, 8, 12],
  },
];
