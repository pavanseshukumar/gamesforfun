import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { EMPTY_OUTFIT } from "../games/wardrobe";
import { dayKey, levelInfo } from "../lib/progress";

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

const FRESH_STATS = {
  best: {}, // { [gameId]: number }
  plays: {}, // { [gameId]: number }
  records: {}, // personal maxima used by achievements, e.g. { rushCombo: 22 }
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayDay: null,
  seenAwards: [],
  daily: {}, // { [YYYY-MM-DD]: moves } — first solve of each daily puzzle
  levels: {}, // { [gameId]: { [levelNumber]: { stars, score } } } — best per level
};

/**
 * Global app state: player profile, progression and settings.
 * Persisted to AsyncStorage (localStorage on web).
 */
export const useGameStore = create(
  persist(
    (set, get) => ({
      ...FRESH_STATS,
      name: "Player",
      avatar: "zip",
      outfit: EMPTY_OUTFIT, // Dress-Up: { hat, face, neck } item ids or null
      haptics: true,
      sound: true,
      controls: { colorCatch: "tilt" }, // "tilt" | "drag"

      /**
       * Records a finished round.
       * @returns {{ isNewBest: boolean, xpGained: number, levelUp: number | null }}
       */
      recordGame: (
        gameId,
        score,
        { lowerIsBetter = false, xp = 10, records = {}, countsForBest = true } = {},
      ) => {
        const s = get();
        const prev = s.best[gameId];
        // A zero in a points game is never a record worth celebrating, and
        // challenge-level rounds (different rules) never touch the endless best.
        const counts = countsForBest && (lowerIsBetter || score > 0);
        const isNewBest = counts && (prev == null || (lowerIsBetter ? score < prev : score > prev));

        const today = dayKey();
        let streak = s.streak;
        if (s.lastPlayDay !== today) streak = s.lastPlayDay === yesterdayKey() ? streak + 1 : 1;

        const nextRecords = { ...s.records };
        for (const [key, value] of Object.entries(records)) {
          // "min:" keys keep the lowest value, everything else the highest.
          const keepMin = key.startsWith("min:");
          const old = nextRecords[key];
          if (old == null || (keepMin ? value < old : value > old)) nextRecords[key] = value;
        }

        const before = levelInfo(s.xp).level;
        const after = levelInfo(s.xp + xp).level;

        set({
          plays: { ...s.plays, [gameId]: (s.plays[gameId] ?? 0) + 1 },
          best: isNewBest ? { ...s.best, [gameId]: score } : s.best,
          records: nextRecords,
          xp: s.xp + xp,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          lastPlayDay: today,
        });
        return { isNewBest, xpGained: xp, levelUp: after > before ? after : null };
      },

      /** Stores the first solve of a daily puzzle; later solves that day don't count. */
      recordDaily: (day, moves) => {
        if (get().daily[day] != null) return false;
        set((s) => ({ daily: { ...s.daily, [day]: moves } }));
        return true;
      },

      /** Keeps the best stars/score per level. Returns the previous best stars. */
      recordLevel: (gameId, n, stars, score) => {
        const prev = get().levels?.[gameId]?.[n];
        const next = {
          stars: Math.max(stars, prev?.stars ?? 0),
          score: Math.max(score, prev?.score ?? 0),
        };
        set((s) => ({
          levels: { ...s.levels, [gameId]: { ...(s.levels?.[gameId] ?? {}), [n]: next } },
        }));
        return { prevStars: prev?.stars ?? 0 };
      },

      setControl: (game, mode) => set((s) => ({ controls: { ...s.controls, [game]: mode } })),
      markAwardsSeen: (ids) => set({ seenAwards: ids }),
      setName: (name) => set({ name }),
      setAvatar: (avatar) => set({ avatar }),
      /** Puts an item on (or takes the slot off with null). */
      setOutfitItem: (slot, id) =>
        set((s) => ({ outfit: { ...EMPTY_OUTFIT, ...s.outfit, [slot]: id } })),
      setHaptics: (haptics) => set({ haptics }),
      setSound: (sound) => set({ sound }),
      resetStats: () => set({ ...FRESH_STATS }),
    }),
    {
      name: "gamesforfun-v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
