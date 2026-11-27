/**
 * Memory Flip rules, kept free of React so tests can drive them.
 * Every deck hides one golden pair; matching it, or every third match in a
 * row, earns a Peek (a one-second look at every face-down card).
 */

/** Card symbols and the pastel each one's face is printed on. */
export const SYMBOLS = [
  { emoji: "🍕", tint: "#FFE1C7" },
  { emoji: "🚀", tint: "#D9E4FF" },
  { emoji: "🎸", tint: "#FFD6E0" },
  { emoji: "🦊", tint: "#FFE4CC" },
  { emoji: "🌈", tint: "#E9DDFF" },
  { emoji: "🍩", tint: "#FFDDEE" },
  { emoji: "⚽", tint: "#DDF5E4" },
  { emoji: "🐙", tint: "#FFD9D3" },
  { emoji: "🌵", tint: "#DDF7D2" },
  { emoji: "🎈", tint: "#FFD8D8" },
  { emoji: "🍉", tint: "#D8F5DF" },
  { emoji: "🦄", tint: "#F2DDFF" },
  { emoji: "🐢", tint: "#D6F3EC" },
  { emoji: "🍔", tint: "#FFEBC2" },
];

export const PEEK_EVERY = 3; // matches in a row per earned Peek
export const MAX_PEEKS = 3;
export const PEEK_MS = 1100;

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let deckId = 0;
/**
 * A shuffled deck of `pairs` pairs; one random pair is golden.
 * @returns {{ key: string, symbol: number, emoji: string, tint: string, golden: boolean,
 *            flipped: boolean, matched: boolean }[]}
 */
export function newDeck(pairs, rand = Math.random) {
  deckId++;
  const picks = shuffle(
    SYMBOLS.map((_, i) => i),
    rand,
  ).slice(0, pairs);
  const golden = picks[Math.floor(rand() * picks.length)];
  return shuffle([...picks, ...picks], rand).map((symbol, i) => ({
    key: `${deckId}-${i}`,
    symbol,
    emoji: SYMBOLS[symbol].emoji,
    tint: SYMBOLS[symbol].tint,
    golden: symbol === golden,
    flipped: false,
    matched: false,
  }));
}

/**
 * What a match is worth. `streak` is the run of matches including this one.
 * @returns {{ peek: boolean, label: string }}
 */
export function matchReward(streak, golden) {
  const peek = golden || streak % PEEK_EVERY === 0;
  let label = streak >= 2 ? `Combo ×${streak}` : "Match!";
  if (streak >= 5) label = `Combo ×${streak} 🔥`;
  if (golden) label = "Golden pair! ✨";
  return { peek, label };
}

/** XP for a cleared endless deck: fewer moves and longer combos earn more. */
export function xpFor(moves, pairs, bestStreak) {
  return 10 + Math.max(0, 48 - (moves - pairs) * 3) + bestStreak * 2;
}
