import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Global app state: per-game best scores and play counts, plus settings.
 * Persisted to AsyncStorage (localStorage on web).
 */
export const useGameStore = create(
  persist(
    (set, get) => ({
      best: {}, // { [gameId]: number }
      plays: {}, // { [gameId]: number }
      haptics: true,

      /** Records a finished game. Returns true when it is a new best. */
      recordGame: (gameId, score, { lowerIsBetter = false } = {}) => {
        const prev = get().best[gameId];
        // A zero in a points game is never a record worth celebrating.
        const counts = lowerIsBetter || score > 0;
        const isBest = counts && (prev == null || (lowerIsBetter ? score < prev : score > prev));
        set((s) => ({
          plays: { ...s.plays, [gameId]: (s.plays[gameId] ?? 0) + 1 },
          best: isBest ? { ...s.best, [gameId]: score } : s.best,
        }));
        return isBest;
      },

      setHaptics: (haptics) => set({ haptics }),
      resetStats: () => set({ best: {}, plays: {} }),
    }),
    {
      name: "gamesforfun-v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
