/**
 * Memory Flip challenge levels. Config keys understood by the game:
 *   pairs (6, 8, 10 or 12 — four columns) · peek (s to memorise at the start)
 *   timeLimit (s, 0 = none)
 * Metrics: moves (lower is better), seconds (lower is better), pairs found.
 * A deck of P pairs needs at least P moves, so targets sit above that.
 */
export const MEMORY_DEFAULTS = { pairs: 8, peek: 0, timeLimit: 0 };

export const MEMORY_LEVELS = [
  {
    name: "Small Deck",
    goal: "Clear 6 pairs in few moves",
    config: { pairs: 6 },
    metric: "moves",
    lower: true,
    thresholds: [16, 12, 9],
  },
  {
    name: "Classic",
    goal: "The full 8-pair deck",
    config: {},
    metric: "moves",
    lower: true,
    thresholds: [22, 17, 13],
  },
  {
    name: "Sneak Peek",
    goal: "See every card for 3 s, then match",
    config: { peek: 3 },
    metric: "moves",
    lower: true,
    thresholds: [18, 13, 10],
  },
  {
    name: "Beat the Clock",
    goal: "Clear the deck within 60 s",
    config: { timeLimit: 60 },
    metric: "moves",
    lower: true,
    thresholds: [24, 18, 14],
  },
  {
    name: "Speed Match",
    goal: "Clear the deck as fast as you can",
    config: {},
    metric: "seconds",
    lower: true,
    thresholds: [60, 40, 28],
  },
  {
    name: "Bigger Deck",
    goal: "10 pairs to find",
    config: { pairs: 10 },
    metric: "moves",
    lower: true,
    thresholds: [30, 23, 18],
  },
  {
    name: "Quick Peek",
    goal: "A 2 s peek at 10 pairs",
    config: { pairs: 10, peek: 2 },
    metric: "moves",
    lower: true,
    thresholds: [26, 20, 15],
  },
  {
    name: "Thirty Seconds",
    goal: "Find pairs before time runs out",
    config: { pairs: 8, timeLimit: 30 },
    metric: "pairs",
    thresholds: [4, 6, 8],
  },
  {
    name: "Grand Deck",
    goal: "12 pairs — the biggest deck",
    config: { pairs: 12 },
    metric: "moves",
    lower: true,
    thresholds: [38, 30, 24],
  },
  {
    name: "Memory Master",
    goal: "12 pairs within two minutes",
    config: { pairs: 12, timeLimit: 120 },
    metric: "moves",
    lower: true,
    thresholds: [40, 32, 26],
  },
];
