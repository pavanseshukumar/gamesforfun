/**
 * Bounce Buddy challenge levels. Config keys understood by the game:
 *   speedScale · widthScale (platform size ×) · starRate · cloudRate
 *   springRate · cloudsFrom (first height with clouds) · timeLimit (s, 0 = none)
 * Metrics: height, score, perfects.
 */
export const BOUNCE_DEFAULTS = {
  speedScale: 1,
  widthScale: 1,
  starRate: 0.14,
  cloudRate: 0.12,
  springRate: 0.08,
  cloudsFrom: 6,
  timeLimit: 0,
};

export const BOUNCE_LEVELS = [
  {
    name: "Hop Hop",
    goal: "Climb as high as you can",
    config: {},
    metric: "height",
    thresholds: [8, 14, 20],
  },
  {
    name: "Star Field",
    goal: "Lots of star platforms — score big",
    config: { starRate: 0.4 },
    metric: "score",
    thresholds: [30, 50, 70],
  },
  {
    name: "Wide Steps",
    goal: "Roomy platforms, climb high",
    config: { widthScale: 1.3 },
    metric: "height",
    thresholds: [12, 20, 28],
  },
  {
    name: "Cloud Nine",
    goal: "Clouds melt — keep hopping!",
    config: { cloudRate: 0.35, cloudsFrom: 1 },
    metric: "height",
    thresholds: [8, 12, 18],
  },
  {
    name: "Perfect Bun",
    goal: "Land dead-centre as often as you can",
    config: {},
    metric: "perfects",
    thresholds: [3, 6, 10],
  },
  {
    name: "Quick Steps",
    goal: "Platforms slide 40% faster",
    config: { speedScale: 1.4 },
    metric: "height",
    thresholds: [8, 12, 16],
  },
  {
    name: "Spring Fling",
    goal: "Springs everywhere — bounce for points",
    config: { springRate: 0.4 },
    metric: "score",
    thresholds: [25, 40, 60],
  },
  {
    name: "Thirty Seconds",
    goal: "Climb as high as you can in 30 s",
    config: { timeLimit: 30 },
    metric: "height",
    thresholds: [10, 15, 20],
  },
  {
    name: "Narrow Ledges",
    goal: "Small platforms need precise hops",
    config: { widthScale: 0.7 },
    metric: "height",
    thresholds: [6, 10, 14],
  },
  {
    name: "Sky Marathon",
    goal: "Fast platforms and clouds, all the way up",
    config: { speedScale: 1.2, cloudRate: 0.2, cloudsFrom: 3 },
    metric: "height",
    thresholds: [15, 25, 35],
  },
];
