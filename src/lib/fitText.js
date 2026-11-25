/**
 * Sizing for big Anton headlines (always uppercase). `adjustsFontSizeToFit`
 * doesn't work on web and can shrink text to nothing on Android, so headlines
 * that include the player's name are sized from an estimate of their width.
 * Ratios are Anton's advance widths per 1px of font size, measured in a browser.
 */
const WIDE = new Set(["M", "W"]);
const NARROW = new Set(["I", "J", "1", "!", ".", ",", "'", ":"]);

export function textWidth(text, size) {
  let units = 0;
  for (const ch of text.toUpperCase()) {
    if (ch === " ") units += 0.22;
    else if (WIDE.has(ch)) units += 0.72;
    else if (NARROW.has(ch)) units += 0.26;
    else units += 0.49;
  }
  return units * size;
}

/** Largest size (≤ max) at which `text` fits in `width`, with a small safety margin. */
export const fitSize = (text, width, max) =>
  Math.floor(Math.min(max, (width * 0.94) / Math.max(textWidth(text, 1), 0.01)));

/**
 * "Hey {name}!" on one line when it stays big; otherwise a smaller "Hey" with
 * the name on its own line, as large as fits.
 * @returns {{ text: string, size: number }[]}
 */
export function greetingLines(name, width, { max = 84, minOneLine = 56 } = {}) {
  const who = (name || "").trim() || "Player";
  const one = fitSize(`Hey ${who}!`, width, max);
  if (one >= minOneLine) return [{ text: `Hey ${who}!`, size: one }];
  return [
    { text: "Hey", size: Math.min(44, max) },
    { text: `${who}!`, size: fitSize(`${who}!`, width, max) },
  ];
}
