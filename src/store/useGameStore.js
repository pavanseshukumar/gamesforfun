import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { BONUS_XP, GOAL_XP, goalsFor, isDone, trackGoals } from "../games/goals";
import { LEGACY_BUDDIES } from "../games/buddies";
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
  lastPlayed: {}, // { [gameId]: timestamp } — for "recently played" sorting
  goalStats: null, // today's activity for daily goals (see games/goals.js)
  goalClaims: { day: null, ids: [], bonus: false }, // goals already cashed in today
  goalsDone: 0, // lifetime goals claimed (unlocks some Dress-Up items)
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
      avatar: "mochi",
      onboarded: false, // false until the intro screens are finished
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
          goalStats: trackGoals(s.goalStats, { type: "round", gameId, score, records }, today),
          lastPlayed: { ...(s.lastPlayed ?? {}), [gameId]: Date.now() },
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
        set((s) => ({
          daily: { ...s.daily, [day]: moves },
          goalStats: trackGoals(s.goalStats, { type: "daily" }, dayKey()),
        }));
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
          goalStats: trackGoals(s.goalStats, { type: "level", stars }, dayKey()),
        }));
        return { prevStars: prev?.stars ?? 0 };
      },

      /**
       * Cashes in one of today's finished goals (or the all-three bonus with
       * id "bonus"). Returns { xpGained, levelUp } or null if not claimable.
       */
      claimGoal: (id) => {
        const s = get();
        const today = dayKey();
        const claims =
          s.goalClaims?.day === today ? s.goalClaims : { day: today, ids: [], bonus: false };
        const goals = goalsFor(today);
        let xp = 0;
        let nextClaims = claims;
        if (id === "bonus") {
          if (claims.bonus || claims.ids.length < goals.length) return null;
          xp = BONUS_XP;
          nextClaims = { ...claims, bonus: true };
        } else {
          const goal = goals.find((g) => g.id === id);
          if (!goal || claims.ids.includes(id) || !isDone(goal, s.goalStats, today)) return null;
          xp = GOAL_XP;
          nextClaims = { ...claims, ids: [...claims.ids, id] };
        }
        const before = levelInfo(s.xp).level;
        const after = levelInfo(s.xp + xp).level;
        set({
          xp: s.xp + xp,
          goalClaims: nextClaims,
          goalsDone: (s.goalsDone ?? 0) + (id === "bonus" ? 0 : 1),
        });
        return { xpGained: xp, levelUp: after > before ? after : null };
      },

      setControl: (game, mode) => set((s) => ({ controls: { ...s.controls, [game]: mode } })),
      markAwardsSeen: (ids) => set({ seenAwards: ids }),
      setName: (name) => set({ name }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setAvatar: (avatar) => set({ avatar }),
      /** Puts an item on (or takes the slot off with null). */
      setOutfitItem: (slot, id) =>
        set((s) => ({ outfit: { ...EMPTY_OUTFIT, ...s.outfit, [slot]: id } })),
      setHaptics: (haptics) => set({ haptics }),
      setSound: (sound) => set({ sound }),
      resetStats: () => set({ ...FRESH_STATS }),
    }),
    {
      // The storage key keeps the app's original name: changing it would wipe saved progress.
      name: "gamesforfun-v1",
      // v1: the first cast (Zip, Bloop, Gloop, Pip, Sunny) became ten new buddies.
      version: 1,
      migrate: (saved, version) => {
        if (version < 1 && saved?.avatar in LEGACY_BUDDIES) {
          return { ...saved, avatar: LEGACY_BUDDIES[saved.avatar] };
        }
        return saved;
      },
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
