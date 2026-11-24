/**
 * Word Pop rules: letter supply, scoring and dictionary lookups.
 * "Qu" travels as one bubble (two letters), as in many word games.
 */
import WORDS from "./words";

let dictionary = null;
/** Lazily builds the word set on first use (~34k words). */
export function isWord(word) {
  if (!dictionary) dictionary = new Set(WORDS.split(" "));
  return dictionary.has(word.toLowerCase());
}

export const LETTER_POINTS = {
  a: 1,
  e: 1,
  i: 1,
  o: 1,
  u: 1,
  l: 1,
  n: 1,
  s: 1,
  t: 1,
  r: 1,
  d: 2,
  g: 2,
  b: 3,
  c: 3,
  m: 3,
  p: 3,
  h: 3,
  f: 4,
  v: 4,
  w: 4,
  y: 4,
  k: 4,
  j: 6,
  x: 6,
  qu: 8,
  z: 8,
};

// How often each letter appears in the bubble stream (roughly English frequency).
const WEIGHTS = {
  e: 12,
  a: 9,
  i: 9,
  o: 8,
  n: 6,
  r: 6,
  t: 6,
  l: 4,
  s: 4,
  u: 4,
  d: 4,
  g: 3,
  b: 2,
  c: 2,
  m: 2,
  p: 2,
  f: 2,
  h: 2,
  v: 2,
  w: 2,
  y: 2,
  k: 1,
  j: 1,
  x: 1,
  qu: 1,
  z: 1,
};
const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const TOTAL = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

export const isVowel = (letter) => VOWELS.has(letter);

/**
 * Picks the next bubble letter. Keeps at least ~38% vowels on screen so
 * there is always something to spell.
 */
export function nextLetter(onScreen, rand = Math.random) {
  const vowels = onScreen.filter(isVowel).length;
  if (onScreen.length >= 3 && vowels / onScreen.length < 0.38) {
    const v = ["a", "e", "i", "o", "u", "e", "a"];
    return v[Math.floor(rand() * v.length)];
  }
  let roll = rand() * TOTAL;
  for (const [letter, weight] of Object.entries(WEIGHTS)) {
    roll -= weight;
    if (roll < 0) return letter;
  }
  return "e";
}

/** Word length in letters ("qu" counts as two). */
export const wordLength = (letters) => letters.join("").length;

const MULTIPLIER = { 3: 1, 4: 1.5, 5: 2, 6: 2.5, 7: 3, 8: 4 };

/** Points for a word: letter values × a length bonus, doubled by a golden bubble. */
export function wordScore(letters, golden = false) {
  const len = wordLength(letters);
  if (len < 3) return 0;
  const base = letters.reduce((sum, l) => sum + (LETTER_POINTS[l] ?? 1), 0);
  const mult = MULTIPLIER[Math.min(len, 8)];
  return Math.round(base * mult * (golden ? 2 : 1));
}

/** True when the word uses one of the rare letters. */
export const hasRareLetter = (letters) => letters.some((l) => ["j", "x", "qu", "z"].includes(l));

/** Validates a selection: 3–8 letters and in the dictionary. */
export function checkWord(letters) {
  const word = letters.join("");
  if (word.length < 3) return { ok: false, reason: "short", word };
  if (word.length > 8) return { ok: false, reason: "long", word };
  return { ok: isWord(word), reason: isWord(word) ? null : "unknown", word };
}
