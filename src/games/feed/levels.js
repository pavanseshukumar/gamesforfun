/**
 * Feed the Buddies challenge levels. Config keys understood by the game:
 *   duration (s) · seats (2–4) · menu (3–6 snacks) · patience (×) · spawn (×)
 *   doubles (some want two snacks) · lives
 * Metrics: served (buddies fed), score, streak (best run without a miss).
 */
import { FEED_DEFAULTS } from "./logic";

export { FEED_DEFAULTS };

export const FEED_LEVELS = [
  {
    name: "Snack Time",
    goal: "Two hungry buddies, three snacks",
    config: { seats: 2, menu: 3, duration: 45 },
    metric: "served",
    thresholds: [8, 14, 20],
  },
  {
    name: "Full Table",
    goal: "Feed three buddies for 60 s",
    config: {},
    metric: "served",
    thresholds: [12, 20, 28],
  },
  {
    name: "Big Menu",
    goal: "Six snacks to choose from",
    config: { menu: 6 },
    metric: "served",
    thresholds: [10, 18, 26],
  },
  {
    name: "Hungry Crowd",
    goal: "Buddies won't wait long",
    config: { patience: 0.7 },
    metric: "served",
    thresholds: [10, 17, 24],
  },
  {
    name: "Combo Plates",
    goal: "Some buddies want two snacks",
    config: { doubles: true },
    metric: "score",
    thresholds: [250, 400, 550],
  },
  {
    name: "Rush Hour",
    goal: "Seats fill up fast for 45 s",
    config: { spawn: 1.7, duration: 45 },
    metric: "served",
    thresholds: [10, 17, 24],
  },
  {
    name: "One Chance",
    goal: "One heart: don't let anyone leave hungry",
    config: { lives: 1 },
    metric: "served",
    thresholds: [8, 15, 22],
  },
  {
    name: "Streak Chef",
    goal: "Feed buddies in a row without a mistake",
    config: { menu: 5 },
    metric: "streak",
    thresholds: [8, 14, 20],
  },
  {
    name: "Four Seats",
    goal: "A bigger table and a bigger menu",
    config: { seats: 4, menu: 6 },
    metric: "served",
    thresholds: [12, 20, 28],
  },
  {
    name: "Head Chef",
    goal: "Four seats, combo plates, impatient buddies",
    config: { seats: 4, menu: 6, doubles: true, patience: 0.85 },
    metric: "score",
    thresholds: [150, 260, 380],
  },
];
