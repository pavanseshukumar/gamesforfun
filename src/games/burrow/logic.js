/**
 * Kit's Burrow: a word search. Words from a theme hide in a letter grid in
 * straight lines; swipe across one to dig it up. React-free and seeded, so
 * the tests check every level's puzzle.
 */
import { createRng, hashString } from "../../lib/random";

export const THEMES = {
  Animals: [
    "FOX",
    "CAT",
    "DOG",
    "OWL",
    "FROG",
    "BEAR",
    "DUCK",
    "LION",
    "BUNNY",
    "PANDA",
    "TIGER",
    "KOALA",
    "ZEBRA",
    "MOUSE",
    "SHEEP",
    "HORSE",
  ],
  Snacks: [
    "PIE",
    "JAM",
    "BUN",
    "CAKE",
    "PEAR",
    "MILK",
    "RICE",
    "APPLE",
    "MANGO",
    "PIZZA",
    "BREAD",
    "HONEY",
    "GRAPE",
    "LEMON",
    "TOAST",
    "COOKIE",
  ],
  Colours: [
    "RED",
    "TAN",
    "BLUE",
    "PINK",
    "GOLD",
    "GREEN",
    "BROWN",
    "BLACK",
    "WHITE",
    "LILAC",
    "CORAL",
    "PEACH",
    "AMBER",
    "YELLOW",
    "PURPLE",
    "ORANGE",
  ],
  Garden: [
    "BUD",
    "BEE",
    "SUN",
    "LEAF",
    "SEED",
    "ROSE",
    "TREE",
    "MOSS",
    "TULIP",
    "DAISY",
    "PLANT",
    "GRASS",
    "BLOOM",
    "PETAL",
    "WORM",
    "SNAIL",
  ],
  Playtime: [
    "TOY",
    "BALL",
    "KITE",
    "GAME",
    "DRUM",
    "SLIDE",
    "SWING",
    "BLOCK",
    "PUZZLE",
    "DANCE",
    "SKIP",
    "JUMP",
    "RACE",
    "HIDE",
    "SEEK",
    "TAG",
  ],
  Ocean: [
    "SEA",
    "EEL",
    "FISH",
    "WAVE",
    "CRAB",
    "SHELL",
    "WHALE",
    "CORAL",
    "SHARK",
    "SQUID",
    "SAND",
    "BOAT",
    "REEF",
    "SEAL",
    "TIDE",
    "PEARL",
  ],
};

/** The eight straight directions [dx, dy]. */
const RIGHT = [1, 0];
const DOWN = [0, 1];
const DOWN_RIGHT = [1, 1];
const UP_RIGHT = [1, -1];
export const DIRECTION_SETS = {
  easy: [RIGHT, DOWN],
  diag: [RIGHT, DOWN, DOWN_RIGHT, UP_RIGHT],
  all: [RIGHT, DOWN, DOWN_RIGHT, UP_RIGHT, [-1, 0], [0, -1], [-1, -1], [-1, 1]],
};

export const BURROW_DEFAULTS = {
  size: 6, // grid is size × size
  words: 5, // words hidden
  dirs: "easy", // easy (→ ↓), diag (adds diagonals), all (also backwards)
  duration: 90, // seconds (0 = no clock)
  theme: null, // a THEMES key, or null for a random theme
};

const LETTERS = "AAABCDEEEEFGHIIIKLMNOOOPRRSSTTUUWY";

/**
 * Builds a seeded puzzle.
 * @returns {{ size, theme, grid: string[], words: { word, cells: number[] }[] }}
 */
export function makePuzzle(cfg = BURROW_DEFAULTS, seed = 1) {
  const c = { ...BURROW_DEFAULTS, ...cfg };
  for (let attempt = 0; attempt < 40; attempt++) {
    const rand = createRng(hashString(`burrow:${seed}:${attempt}`));
    const themeNames = Object.keys(THEMES);
    const theme = c.theme ?? themeNames[Math.floor(rand() * themeNames.length)];
    const pool = THEMES[theme].filter((w) => w.length <= c.size);
    // Longer words first: they're the hardest to fit.
    const picks = shuffle(pool, rand)
      .slice(0, c.words)
      .sort((a, b) => b.length - a.length);
    if (picks.length < c.words) continue;
    const grid = new Array(c.size * c.size).fill("");
    const words = [];
    let ok = true;
    for (const word of picks) {
      const placed = place(grid, c.size, word, DIRECTION_SETS[c.dirs], rand);
      if (!placed) {
        ok = false;
        break;
      }
      words.push({ word, cells: placed });
    }
    if (!ok) continue;
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i]) grid[i] = LETTERS[Math.floor(rand() * LETTERS.length)];
    }
    // Reject grids where a word can be read in more than one place.
    if (words.some(({ word }) => countMatches(grid, c.size, word) !== 1)) continue;
    return { size: c.size, theme, grid, words };
  }
  throw new Error("could not build a burrow puzzle");
}

function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function place(grid, size, word, dirs, rand) {
  const spots = [];
  for (const [dx, dy] of dirs) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const ex = x + dx * (word.length - 1);
        const ey = y + dy * (word.length - 1);
        if (ex < 0 || ey < 0 || ex >= size || ey >= size) continue;
        const cells = [];
        let fits = true;
        let overlap = 0;
        for (let k = 0; k < word.length; k++) {
          const i = (y + dy * k) * size + (x + dx * k);
          if (grid[i] && grid[i] !== word[k]) {
            fits = false;
            break;
          }
          if (grid[i]) overlap++;
          cells.push(i);
        }
        if (fits && overlap < word.length) spots.push(cells);
      }
    }
  }
  if (!spots.length) return null;
  const cells = spots[Math.floor(rand() * spots.length)];
  cells.forEach((i, k) => {
    grid[i] = word[k];
  });
  return cells;
}

/** How many straight lines (any direction) spell `word`. */
function countMatches(grid, size, word) {
  let n = 0;
  for (const [dx, dy] of DIRECTION_SETS.all) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let k = 0;
        for (; k < word.length; k++) {
          const cx = x + dx * k;
          const cy = y + dy * k;
          if (cx < 0 || cy < 0 || cx >= size || cy >= size) break;
          if (grid[cy * size + cx] !== word[k]) break;
        }
        if (k === word.length) n++;
      }
    }
  }
  return n;
}

/**
 * Cells on the straight line from `from` toward `to`, snapped to the nearest
 * of the eight directions (so a slightly wobbly swipe still works).
 */
export function lineCells(size, from, to) {
  const fx = from % size;
  const fy = Math.floor(from / size);
  const dx = (to % size) - fx;
  const dy = Math.floor(to / size) - fy;
  if (!dx && !dy) return [from];
  const angle = Math.atan2(dy, dx);
  const step = Math.round(angle / (Math.PI / 4));
  const sx = Math.round(Math.cos((step * Math.PI) / 4));
  const sy = Math.round(Math.sin((step * Math.PI) / 4));
  const len = Math.max(Math.abs(dx), Math.abs(dy));
  const cells = [];
  for (let k = 0; k <= len; k++) {
    const x = fx + sx * k;
    const y = fy + sy * k;
    if (x < 0 || y < 0 || x >= size || y >= size) break;
    cells.push(y * size + x);
  }
  return cells;
}

/** The hidden word these cells spell (either way round), or null. */
export function wordAt(puzzle, cells, found = []) {
  const text = cells.map((i) => puzzle.grid[i]).join("");
  const back = [...text].reverse().join("");
  const hit = puzzle.words.find(
    ({ word, cells: wc }) =>
      !found.includes(word) &&
      (word === text || word === back) &&
      wc.length === cells.length &&
      (wc.every((c, k) => c === cells[k]) || wc.every((c, k) => c === cells[cells.length - 1 - k])),
  );
  return hit ? hit.word : null;
}

/** Points for a word: 10 per letter. */
export const wordPoints = (word) => word.length * 10;

/** Bonus for clearing the grid with time to spare. */
export const timeBonus = (secondsLeft) => Math.max(0, Math.round(secondsLeft)) * 2;
