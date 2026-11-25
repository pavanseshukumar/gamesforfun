import {
  checkWord,
  hasRareLetter,
  isWord,
  LETTER_POINTS,
  nextLetter,
  wordLength,
  wordScore,
} from "../src/games/wordpop/logic";
import { createRng } from "../src/lib/random";

describe("Dictionary", () => {
  test("knows everyday words in both spellings", () => {
    ["cat", "quiz", "pizza", "oxygen", "color", "colour", "jump"].forEach((w) =>
      expect(isWord(w)).toBe(true),
    );
  });

  test("is case-insensitive and rejects junk", () => {
    expect(isWord("ZeBrA")).toBe(true);
    expect(isWord("xyz")).toBe(false);
    expect(isWord("")).toBe(false);
  });

  test("slurs and strong profanity never count", () => {
    ["fuck", "shitty", "bitches", "whore", "faggot", "rapist"].forEach((w) =>
      expect(isWord(w)).toBe(false),
    );
  });

  test("the filter leaves innocent lookalikes alone", () => {
    ["spice", "spicy", "cocoon", "raccoon", "grape", "shiitake"].forEach((w) =>
      expect(isWord(w)).toBe(true),
    );
  });
});

describe("Scoring", () => {
  test("every letter has a value, rare letters are worth more", () => {
    expect(LETTER_POINTS.e).toBe(1);
    expect(LETTER_POINTS.z).toBeGreaterThan(LETTER_POINTS.k);
  });

  test("qu counts as two letters", () => {
    expect(wordLength(["qu", "i", "z"])).toBe(4);
    expect(checkWord(["qu", "i", "z"])).toMatchObject({ ok: true, word: "quiz" });
  });

  test("longer words get a bigger multiplier, golden doubles", () => {
    expect(wordScore(["c", "a", "t"])).toBe(5); // (3+1+1) × 1
    expect(wordScore(["c", "a", "t", "s"])).toBe(9); // (3+1+1+1) × 1.5
    expect(wordScore(["c", "a", "t"], true)).toBe(10);
    expect(wordScore(["a", "t"])).toBe(0);
  });

  test("rare letters are detected", () => {
    expect(hasRareLetter(["j", "a", "m"])).toBe(true);
    expect(hasRareLetter(["c", "a", "t"])).toBe(false);
  });

  test("checkWord explains why a selection fails", () => {
    expect(checkWord(["a", "t"]).reason).toBe("short");
    expect(checkWord(["x", "q", "t"]).reason).toBe("unknown");
  });
});

describe("Letter supply", () => {
  test("only ever produces scoreable letters", () => {
    const rand = createRng(1);
    for (let i = 0; i < 2000; i++) expect(LETTER_POINTS[nextLetter([], rand)]).toBeDefined();
  });

  test("tops up vowels when the screen runs dry", () => {
    const rand = createRng(2);
    for (let i = 0; i < 100; i++)
      expect(["a", "e", "i", "o", "u"]).toContain(nextLetter(["t", "r", "s", "n", "k"], rand));
  });

  test("overall stream is roughly a third vowels", () => {
    const rand = createRng(3);
    const screen = [];
    let vowels = 0;
    for (let i = 0; i < 3000; i++) {
      const l = nextLetter(screen.slice(-14), rand);
      screen.push(l);
      if ("aeiou".includes(l)) vowels++;
    }
    expect(vowels / 3000).toBeGreaterThan(0.35);
    expect(vowels / 3000).toBeLessThan(0.55);
  });
});
