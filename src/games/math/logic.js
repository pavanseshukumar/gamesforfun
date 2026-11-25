/**
 * Quick Math rules: question generation by difficulty tier, sneaky wrong
 * answers, timing and scoring. Pure functions; `rand` defaults to Math.random.
 */

export const TIERS = [
  { name: "Warm-up", ops: ["+"], max: 10 },
  { name: "Plus & minus", ops: ["+", "−"], max: 20 },
  { name: "Times tables", ops: ["+", "−", "×"], max: 10 },
  { name: "Division", ops: ["×", "÷", "+", "−"], max: 12 },
  { name: "Big numbers", ops: ["+", "−", "×", "÷"], max: 25 },
];

/** Correct answers needed to reach each tier. */
export const TIER_AT = [0, 6, 14, 24, 36];

export const tierFor = (correct) => {
  let t = 0;
  TIER_AT.forEach((need, i) => {
    if (correct >= need) t = i;
  });
  return t;
};

const int = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

function compute(a, op, b) {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return a / b;
    default:
      throw new Error(op);
  }
}

/** A believable wrong answer for `a op b` (never the true answer, never negative). */
export function sneakyWrong(a, op, b, truth, rand = Math.random) {
  const candidates = [truth + 1, truth - 1, truth + 2, truth - 2, truth + 10, truth - 10];
  // Swapped digits (e.g. 54 for 45).
  if (truth >= 10) candidates.push(Number(String(truth).split("").reverse().join("")));
  // The answer for a different operation (e.g. 7 + 8 shown as 56).
  if (op === "+") candidates.push(a * b);
  if (op === "×") candidates.push(a + b);
  if (op === "−") candidates.push(a + b);
  if (op === "÷") candidates.push(a - b);
  const ok = [...new Set(candidates)].filter((v) => v !== truth && v >= 0 && Number.isInteger(v));
  return ok[Math.floor(rand() * ok.length)];
}

/**
 * Makes a question for a tier. Returns { a, op, b, shown, truth, isTrue, text }.
 * About half the time the shown answer is true. `custom` ({ ops, max })
 * overrides the tier, e.g. times-tables-only practice levels.
 */
export function makeQuestion(tier, rand = Math.random, custom = null) {
  const { ops, max } = custom?.ops
    ? { max: 10, ...custom }
    : TIERS[Math.min(tier, TIERS.length - 1)];
  const op = ops[Math.floor(rand() * ops.length)];
  let a;
  let b;
  if (op === "×") {
    a = int(rand, 2, Math.min(max, 12));
    b = int(rand, 2, Math.min(max, 12));
  } else if (op === "÷") {
    // Build from a product so the division is always exact.
    b = int(rand, 2, Math.min(max, 12));
    a = b * int(rand, 2, Math.min(max, 12));
  } else if (op === "−") {
    a = int(rand, 1, max);
    b = int(rand, 0, a); // never negative
  } else {
    a = int(rand, 1, max);
    b = int(rand, 1, max);
  }
  const truth = compute(a, op, b);
  const isTrue = rand() < 0.5;
  const shown = isTrue ? truth : sneakyWrong(a, op, b, truth, rand);
  return { a, op, b, truth, shown, isTrue, text: `${a} ${op} ${b} = ${shown}` };
}

/** Seconds allowed per card: generous at first, snappier as you go. */
export const cardTime = (correct) => Math.max(1.6, 4 - correct * 0.06);

/** Streak multiplier: ×1, then +1 every 5 in a row, up to ×4. */
export const multiplierFor = (streak) => Math.min(4, 1 + Math.floor(streak / 5));
