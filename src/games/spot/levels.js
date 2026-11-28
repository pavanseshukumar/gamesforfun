/**
 * Where's Pom? challenge levels. Config keys understood by the game:
 *   duration (s) · crowd · growth · maxCrowd · disguise (0–1) · bushes · wander · penalty
 * Metrics: found (buddies found), score.
 */
import { SPOT_DEFAULTS } from "./logic";

export { SPOT_DEFAULTS };

export const SPOT_LEVELS = [
  {
    name: "Picnic",
    goal: "A small crowd: find who's asked for",
    config: { crowd: 6, growth: 1, duration: 45 },
    metric: "found",
    thresholds: [5, 8, 11],
  },
  {
    name: "Busy Park",
    goal: "The crowd grows every time",
    config: {},
    metric: "found",
    thresholds: [5, 9, 13],
  },
  {
    name: "Hat Party",
    goal: "Everyone's wearing hats: ears are hidden!",
    config: { disguise: 0.8 },
    metric: "found",
    thresholds: [4, 7, 10],
  },
  {
    name: "Bushy Garden",
    goal: "Buddies peek out from behind bushes",
    config: { bushes: 5 },
    metric: "found",
    thresholds: [4, 8, 12],
  },
  {
    name: "Speedy Spotter",
    goal: "Quick finds score big",
    config: { duration: 45 },
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
    name: "Big Crowd",
    goal: "Start with 20 buddies",
    config: { crowd: 20, growth: 2, duration: 60 },
    metric: "found",
    thresholds: [4, 7, 10],
  },
  {
    name: "Careful Taps",
    goal: "Wrong taps cost 6 seconds",
    config: { penalty: 6, disguise: 0.4 },
    metric: "score",
    thresholds: [90, 170, 260],
  },
  {
    name: "Carnival",
    goal: "Hats, bushes and wandering crowds",
    config: { disguise: 0.6, bushes: 4, wander: true, duration: 75 },
    metric: "found",
    thresholds: [4, 8, 12],
  },
];
