import { starsFor } from "../src/games/challenges";
import { BURROW_LEVELS } from "../src/games/burrow/levels";
import {
  BURROW_DEFAULTS,
  clueFor,
  COMBO_WINDOW,
  depthConfig,
  DIRECTION_SETS,
  hintCell,
  lineCells,
  makePuzzle,
  MAX_COMBO,
  nextCombo,
  THEMES,
  timeBonus,
  wordAt,
  wordPoints,
} from "../src/games/burrow/logic";

const stepOf = (size, cells) => {
  if (cells.length < 2) return [0, 0];
  const d = cells[1] - cells[0];
  const dx = (cells[1] % size) - (cells[0] % size);
  return [dx, (d - dx) / size];
};

describe("Kit's Burrow puzzles", () => {
  test("themes hold enough short words", () => {
    for (const words of Object.values(THEMES)) {
      expect(words.filter((w) => w.length <= 5).length).toBeGreaterThanOrEqual(8);
      words.forEach((w) => expect(w).toMatch(/^[A-Z]+$/));
    }
  });

  test.each(BURROW_LEVELS.map((l, i) => [i + 1, l]))(
    "level %i builds a fair puzzle for any seed",
    (n, level) => {
      const cfg = { ...BURROW_DEFAULTS, ...level.config };
      const dirs = DIRECTION_SETS[cfg.dirs].map((d) => d.join());
      for (let seed = 1; seed <= 25; seed++) {
        const p = makePuzzle(cfg, seed * 7 + n);
        expect(p.grid).toHaveLength(cfg.size * cfg.size);
        p.grid.forEach((ch) => expect(ch).toMatch(/^[A-Z]$/));
        expect(p.words).toHaveLength(cfg.words);
        if (cfg.theme) expect(p.theme).toBe(cfg.theme);
        p.words.forEach(({ word, cells }) => {
          expect(THEMES[p.theme]).toContain(word);
          expect(cells.map((i) => p.grid[i]).join("")).toBe(word);
          // A straight line in one of the level's directions.
          expect(dirs).toContain(stepOf(cfg.size, cells).join());
          expect(lineCells(cfg.size, cells[0], cells.at(-1))).toEqual(cells);
          expect(wordAt(p, cells)).toBe(word);
        });
      }
    },
  );

  test("the same seed gives the same burrow", () => {
    expect(makePuzzle({}, 42)).toEqual(makePuzzle({}, 42));
  });
});

describe("Kit's Burrow swipes", () => {
  test("a wobbly swipe snaps to the nearest straight line", () => {
    // 6×6: from (0,0) toward (4,1) snaps to the row.
    expect(lineCells(6, 0, 10)).toEqual([0, 1, 2, 3, 4]);
    // toward (3,3): the diagonal.
    expect(lineCells(6, 0, 21)).toEqual([0, 7, 14, 21]);
    // straight up from (2,5).
    expect(lineCells(6, 32, 2)).toEqual([32, 26, 20, 14, 8, 2]);
    expect(lineCells(6, 7, 7)).toEqual([7]);
  });

  test("words count read either way, but only once and only on their own cells", () => {
    const p = makePuzzle({ size: 6, words: 4 }, 3);
    const { word, cells } = p.words[0];
    expect(wordAt(p, [...cells].reverse())).toBe(word);
    expect(wordAt(p, cells, [word])).toBeNull();
    expect(wordAt(p, cells.slice(0, -1))).toBeNull();
  });

  test("scoring: 10 per letter, doubled for treasure, times the combo; 2 per second left", () => {
    expect(wordPoints("FOX")).toBe(30);
    expect(wordPoints("FOX", { treasure: true })).toBe(60);
    expect(wordPoints("FOX", { treasure: true, combo: 3 })).toBe(180);
    expect(timeBonus(12.4)).toBe(24);
    expect(timeBonus(-3)).toBe(0);
  });
});

describe("Kit's Burrow extras", () => {
  test("every burrow hides one of its own words as the treasure", () => {
    for (let seed = 1; seed < 20; seed++) {
      const p = makePuzzle({}, seed);
      expect(p.words.map((w) => w.word)).toContain(p.treasure);
    }
  });

  test("quick finds build a combo up to the cap; slow ones reset it", () => {
    expect(nextCombo(1, Infinity)).toBe(1);
    expect(nextCombo(1, COMBO_WINDOW)).toBe(2);
    expect(nextCombo(2, 1)).toBe(3);
    expect(nextCombo(MAX_COMBO, 1)).toBe(MAX_COMBO);
    expect(nextCombo(3, COMBO_WINDOW + 0.1)).toBe(1);
  });

  test("Kit sniffs out the first letter of the shortest word left, then the next", () => {
    const p = makePuzzle({ words: 5 }, 8);
    const shortest = [...p.words].sort((a, b) => a.word.length - b.word.length)[0];
    const first = hintCell(p);
    expect(first).toBe(shortest.cells[0]);
    const second = hintCell(p, [], [first]);
    expect(second).not.toBe(first);
    expect(p.words.map((w) => w.cells[0])).toContain(second);
    expect(
      hintCell(
        p,
        p.words.map((w) => w.word),
      ),
    ).toBe(-1);
  });

  test("mystery clues show the first letter and the length", () => {
    expect(clueFor("SHARK", true)).toBe("S • • • •");
    expect(clueFor("SHARK", false)).toBe("SHARK");
  });

  test("Dig Deeper burrows grow, twist and always build", () => {
    let prev = depthConfig(0);
    for (let d = 1; d < 12; d++) {
      const cfg = depthConfig(d);
      expect(cfg.size).toBeGreaterThanOrEqual(prev.size);
      expect(cfg.words).toBeGreaterThanOrEqual(prev.words);
      expect(cfg.words).toBeLessThanOrEqual(cfg.size + 1);
      for (let seed = 1; seed <= 5; seed++)
        expect(makePuzzle(cfg, seed * 13 + d).words).toHaveLength(cfg.words);
      prev = cfg;
    }
    expect(depthConfig(0).dirs).toBe("easy");
    expect(depthConfig(6).dirs).toBe("all");
  });
});

describe("Kit's Burrow levels", () => {
  test.each(BURROW_LEVELS.map((l, i) => [i + 1, l]))("level %i is winnable", (n, level) => {
    const cfg = { ...BURROW_DEFAULTS, ...level.config };
    const p = makePuzzle(cfg, n);
    // A player who finds every word, taking 4 s a word.
    const seconds = p.words.length * 4;
    const score =
      p.words.reduce((s, w) => s + wordPoints(w.word), 0) + timeBonus(cfg.duration - seconds);
    expect(starsFor(level, { found: p.words.length, score, seconds })).toBe(3);
    // And someone who finds only some words still gets a star on found-word levels.
    if (level.metric === "found") {
      expect(
        starsFor(level, { found: Math.ceil(p.words.length / 2), score: 0, seconds: Infinity }),
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
