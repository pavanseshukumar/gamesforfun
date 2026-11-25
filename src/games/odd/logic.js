/**
 * Odd One Out rules. Every round deals four cards; exactly one is different.
 * Modes (unlocked as the player scores):
 *   shade — four colour swatches, one a slightly different shade
 *   buddy — four mascots, one different (another mascot, a hat, then a face)
 *   ink   — four colour words; three share an ink colour, one doesn't
 *   word  — the same word four times in different inks, except one word
 *   match — only one word is written in its own colour
 * The word modes are a Stroop test: what a word says fights with how it looks.
 * Pure functions; `rand` is any () => [0, 1) generator.
 */

export const COLOURS = [
  { name: "RED", hex: "#F03B3B" },
  { name: "BLUE", hex: "#2F6FF0" },
  { name: "GREEN", hex: "#1FA857" },
  { name: "YELLOW", hex: "#E8A800" },
  { name: "PURPLE", hex: "#8A4DF0" },
  { name: "PINK", hex: "#F0509E" },
  { name: "ORANGE", hex: "#F27A12" },
];

export const MODES = ["shade", "buddy", "ink", "word", "match"];

export const PROMPTS = {
  shade: "Tap the different shade",
  buddy: "Tap the buddy who's different",
  ink: "Tap the one in a different colour",
  word: "Tap the different word",
  match: "Tap the word that matches its colour",
};

/** Correct answers needed to reach each tier, and what each tier deals. */
export const TIER_AT = [0, 5, 12, 20, 30];
const TIER_MODES = [
  ["shade", "buddy"],
  ["shade", "buddy", "ink"],
  ["shade", "buddy", "ink", "word"],
  ["shade", "buddy", "ink", "word", "match"],
  ["shade", "buddy", "ink", "word", "match"],
];
/** How far the odd shade's lightness is from the others, by tier. */
const SHADE_GAP = [20, 15, 11, 8, 6];

export const tierFor = (correct) => TIER_AT.filter((need) => correct >= need).length - 1;

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

/** n distinct items from list. */
function pickMany(rand, list, n) {
  const pool = [...list];
  const out = [];
  while (out.length < n) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

const VARIANTS = ["zip", "bloop", "gloop", "pip", "sunny"];
const HATS = ["party", "cap", "beanie", "crown", "tophat"];

function shadeRound(rand, tier, scale) {
  const hue = Math.floor(rand() * 360);
  const sat = 70 + Math.floor(rand() * 20);
  const light = 48 + Math.floor(rand() * 10);
  const gap = Math.max(3, Math.round(SHADE_GAP[tier] * scale));
  const oddLight = light + (rand() < 0.5 ? -gap : gap);
  const base = `hsl(${hue}, ${sat}%, ${light}%)`;
  const odd = `hsl(${hue}, ${sat}%, ${oddLight}%)`;
  return { same: { kind: "swatch", colour: base }, odd: { kind: "swatch", colour: odd } };
}

function buddyRound(rand, tier) {
  const variant = pick(rand, VARIANTS);
  const plain = { kind: "buddy", variant, mood: "happy", outfit: null };
  if (tier === 0) {
    // A different mascot altogether.
    const other = pick(
      rand,
      VARIANTS.filter((v) => v !== variant),
    );
    return { same: plain, odd: { ...plain, variant: other } };
  }
  if (tier <= 2) {
    // Same mascot, one wears a hat the others don't (or a different hat).
    const [hatA, hatB] = pickMany(rand, HATS, 2);
    const withHat = rand() < 0.5;
    const same = { ...plain, outfit: withHat ? { hat: hatA } : null };
    return { same, odd: { ...plain, outfit: { hat: withHat ? hatB : hatA } } };
  }
  // Hardest: same mascot and outfit, a different face.
  const [moodA, moodB] = pickMany(rand, ["happy", "wow", "cheer", "cool"], 2);
  const outfit = rand() < 0.5 ? { hat: pick(rand, HATS) } : null;
  return { same: { ...plain, mood: moodA, outfit }, odd: { ...plain, mood: moodB, outfit } };
}

/** Word cards: { kind: "word", word, ink } with names/hexes from COLOURS. */
function inkRound(rand) {
  const [shared, oddInk] = pickMany(rand, COLOURS, 2);
  // Words are colour names chosen to clash: never the card's own ink.
  const words = pickMany(
    rand,
    COLOURS.filter((c) => c !== shared),
    3,
  );
  const sameCards = words.map((w) => ({ kind: "word", word: w.name, ink: shared.hex }));
  const oddWord = pick(
    rand,
    COLOURS.filter((c) => c !== oddInk),
  );
  return { sameCards, odd: { kind: "word", word: oddWord.name, ink: oddInk.hex } };
}

function wordRound(rand) {
  const [word, oddWord] = pickMany(rand, COLOURS, 2);
  const inks = pickMany(
    rand,
    COLOURS.filter((c) => c !== word && c !== oddWord),
    4,
  );
  const sameCards = inks.slice(0, 3).map((i) => ({ kind: "word", word: word.name, ink: i.hex }));
  return { sameCards, odd: { kind: "word", word: oddWord.name, ink: inks[3].hex } };
}

function matchRound(rand) {
  const match = pick(rand, COLOURS);
  const sameCards = [];
  while (sameCards.length < 3) {
    const [w, i] = pickMany(rand, COLOURS, 2); // word and ink always differ
    sameCards.push({ kind: "word", word: w.name, ink: i.hex });
  }
  return { sameCards, odd: { kind: "word", word: match.name, ink: match.hex } };
}

/**
 * Deals one round.
 * @param {number} tier difficulty 0–4
 * @param {() => number} rand
 * @param {{ modes?: string[] | null, shadeScale?: number }} [opts]
 * @returns {{ mode: string, prompt: string, cards: object[], answer: number }}
 */
export function makeRound(tier, rand, { modes = null, shadeScale = 1 } = {}) {
  const t = Math.max(0, Math.min(4, tier));
  const mode = pick(rand, modes?.length ? modes : TIER_MODES[t]);
  let sameCards;
  let odd;
  if (mode === "shade" || mode === "buddy") {
    const r = mode === "shade" ? shadeRound(rand, t, shadeScale) : buddyRound(rand, t);
    sameCards = [r.same, r.same, r.same];
    odd = r.odd;
  } else {
    const r =
      mode === "ink" ? inkRound(rand) : mode === "word" ? wordRound(rand) : matchRound(rand);
    sameCards = r.sameCards;
    odd = r.odd;
  }
  const answer = Math.floor(rand() * 4);
  const cards = [...sameCards];
  cards.splice(answer, 0, odd);
  return { mode, prompt: PROMPTS[mode], cards, answer };
}

/** Points for a correct answer: the streak raises a multiplier up to ×4. */
export const multiplierFor = (streak) => Math.min(4, 1 + Math.floor(streak / 5));
