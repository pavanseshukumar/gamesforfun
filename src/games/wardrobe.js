/**
 * Mascot Dress-Up: wearable items for your buddy, unlocked by playing.
 * Items are drawn in components/Mascot.js (`Outfit`); this module holds the
 * catalogue and the unlock rules so the screen and the tests share them.
 */
import { levelInfo } from "../lib/progress";

export const SLOTS = [
  { id: "hat", label: "Hats" },
  { id: "face", label: "Faces" },
  { id: "neck", label: "Neck" },
];

/**
 * need.kind: "level" (player level), "stars" (level stars), "streak" (best streak),
 * "plays" (games played), "goals" (daily goals completed).
 */
export const ITEMS = [
  { id: "party", slot: "hat", name: "Party Hat", need: { kind: "level", n: 2 } },
  { id: "cap", slot: "hat", name: "Cap", need: { kind: "stars", n: 10 } },
  { id: "beanie", slot: "hat", name: "Beanie", need: { kind: "plays", n: 25 } },
  { id: "flowers", slot: "hat", name: "Flower Crown", need: { kind: "stars", n: 30 } },
  { id: "tophat", slot: "hat", name: "Top Hat", need: { kind: "level", n: 5 } },
  { id: "wizard", slot: "hat", name: "Wizard Hat", need: { kind: "stars", n: 60 } },
  { id: "crown", slot: "hat", name: "Crown", need: { kind: "level", n: 8 } },
  { id: "propeller", slot: "hat", name: "Propeller Cap", need: { kind: "goals", n: 3 } },
  { id: "bunny", slot: "hat", name: "Bunny Ears", need: { kind: "goals", n: 9 } },

  { id: "specs", slot: "face", name: "Round Specs", need: { kind: "level", n: 3 } },
  { id: "shades", slot: "face", name: "Shades", need: { kind: "stars", n: 20 } },
  { id: "hearts", slot: "face", name: "Heart Eyes", need: { kind: "streak", n: 3 } },
  { id: "monocle", slot: "face", name: "Monocle", need: { kind: "level", n: 6 } },
  { id: "starry", slot: "face", name: "Star Shades", need: { kind: "stars", n: 45 } },

  { id: "bowtie", slot: "neck", name: "Bow Tie", need: { kind: "plays", n: 10 } },
  { id: "scarf", slot: "neck", name: "Scarf", need: { kind: "stars", n: 15 } },
  { id: "bandana", slot: "neck", name: "Bandana", need: { kind: "streak", n: 5 } },
  { id: "medal", slot: "neck", name: "Gold Medal", need: { kind: "level", n: 7 } },
  { id: "lei", slot: "neck", name: "Flower Lei", need: { kind: "goals", n: 6 } },
];

export const EMPTY_OUTFIT = { hat: null, face: null, neck: null };

export const itemById = (id) => ITEMS.find((i) => i.id === id) ?? null;

/** The numbers unlocks are judged on, from the store's state. */
export function playerStats({ xp = 0, levels = {}, bestStreak = 0, plays = {}, goalsDone = 0 }) {
  let stars = 0;
  for (const game of Object.values(levels ?? {}))
    for (const l of Object.values(game ?? {})) stars += l?.stars ?? 0;
  return {
    level: levelInfo(xp).level,
    stars,
    streak: bestStreak,
    plays: Object.values(plays ?? {}).reduce((a, b) => a + b, 0),
    goals: goalsDone ?? 0,
  };
}

export const isUnlocked = (item, stats) => (stats[item.need.kind] ?? 0) >= item.need.n;

/** Progress toward an item, 0–1. */
export const progressTo = (item, stats) => Math.min(1, (stats[item.need.kind] ?? 0) / item.need.n);

const NEED_TEXT = {
  level: (n) => `Level ${n}`,
  stars: (n) => `${n} ⭐`,
  streak: (n) => `${n}-day streak`,
  plays: (n) => `${n} games`,
  goals: (n) => `${n} daily goals`,
};
export const needText = (need) => NEED_TEXT[need.kind](need.n);

/** Drops anything that isn't a real item (old saves, removed items). */
export function cleanOutfit(outfit) {
  const out = { ...EMPTY_OUTFIT };
  for (const slot of Object.keys(out)) {
    const item = itemById(outfit?.[slot]);
    if (item && item.slot === slot) out[slot] = item.id;
  }
  return out;
}

/** What the buddy actually wears: real items that are still unlocked. */
export function wornOutfit(outfit, stats) {
  const clean = cleanOutfit(outfit);
  for (const slot of Object.keys(clean)) {
    if (clean[slot] && !isUnlocked(itemById(clean[slot]), stats)) clean[slot] = null;
  }
  return clean;
}
