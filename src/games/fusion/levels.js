/**
 * Fusion goal levels. Config keys understood by the game:
 *   goalTile (level ends as soon as this tile is made) · moveLimit (0 = none)
 * Metrics: moves (to reach the goal — lower is better), score, maxTile.
 *
 * Every merge-to-N needs about N / 2.2 spawned tiles (one per move), so a
 * 128 tile can't take fewer than ~58 moves; thresholds leave room above that.
 */
export const FUSION_DEFAULTS = { goalTile: 0, moveLimit: 0 };

export const FUSION_LEVELS = [
  {
    name: "First Fusion",
    goal: "Make a 64 tile in few moves",
    config: { goalTile: 64 },
    metric: "moves",
    lower: true,
    thresholds: [70, 50, 40],
  },
  {
    name: "One-Two-Eight",
    goal: "Make a 128 tile",
    config: { goalTile: 128 },
    metric: "moves",
    lower: true,
    thresholds: [130, 100, 80],
  },
  {
    name: "Short on Moves",
    goal: "Score big in only 60 moves",
    config: { moveLimit: 60 },
    metric: "score",
    thresholds: [300, 450, 600],
  },
  {
    name: "Two-Five-Six",
    goal: "Make a 256 tile",
    config: { goalTile: 256 },
    metric: "moves",
    lower: true,
    thresholds: [250, 190, 160],
  },
  {
    name: "Quick Sixty-Four",
    goal: "Make 64 within 70 moves",
    config: { goalTile: 64, moveLimit: 70 },
    metric: "moves",
    lower: true,
    thresholds: [70, 52, 42],
  },
  {
    name: "Score Sprint",
    goal: "Score as much as you can in 100 moves",
    config: { moveLimit: 100 },
    metric: "score",
    thresholds: [600, 900, 1200],
  },
  {
    name: "Big Tile",
    goal: "Grow the biggest tile you can",
    config: {},
    metric: "maxTile",
    thresholds: [128, 256, 512],
  },
  {
    name: "Five-Twelve",
    goal: "Make a 512 tile",
    config: { goalTile: 512 },
    metric: "moves",
    lower: true,
    thresholds: [400, 330, 280],
  },
  {
    name: "Tight Budget",
    goal: "Biggest tile within 150 moves",
    config: { moveLimit: 150 },
    metric: "maxTile",
    thresholds: [64, 128, 256],
  },
  {
    name: "Grand Fusion",
    goal: "Make a 1024 tile",
    config: { goalTile: 1024 },
    metric: "moves",
    lower: true,
    thresholds: [800, 650, 560],
  },
];
