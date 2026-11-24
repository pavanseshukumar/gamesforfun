import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo } from "react";

import { useGameStore } from "../store/useGameStore";
import { challengesFor, starsFor } from "./challenges";

/**
 * Challenge-level support for an arcade game screen. When the route has
 * `?level=n`, returns that level's definition and helpers to finish it;
 * otherwise `level` is null and the game runs its normal endless mode.
 */
export default function useChallenge(gameId) {
  const params = useLocalSearchParams();
  const list = challengesFor(gameId);
  const n = list && params.level ? Number(params.level) : null;
  const level = n && list[n - 1] ? list[n - 1] : null;
  const recordLevel = useGameStore((s) => s.recordLevel);
  const recordGame = useGameStore((s) => s.recordGame);

  /** Judges a finished round. Returns the result for the result sheet. */
  const complete = useCallback(
    (stats, records = {}) => {
      const stars = starsFor(level, stats);
      const raw = stats[level.metric] ?? 0;
      const score = Number.isFinite(raw) ? Math.round(raw) : raw; // Infinity = goal not reached
      const { prevStars } =
        stars > 0
          ? recordLevel(
              gameId,
              n,
              stars,
              Math.round(stats.score ?? (Number.isFinite(score) ? score : 0)),
            )
          : { prevStars: 0 };
      const gained = Math.max(0, stars - prevStars);
      const outcome = recordGame(gameId, stats.score ?? 0, {
        xp: 5 + gained * 10,
        records,
        countsForBest: false,
      });
      return {
        stars,
        cleared: stars > 0,
        value: score,
        isNewBest: stars > prevStars,
        xpGained: outcome.xpGained,
        levelUp: outcome.levelUp,
      };
    },
    [gameId, level, n, recordGame, recordLevel],
  );

  return useMemo(
    () => ({
      level,
      n,
      hasNext: level != null && n < list.length,
      count: list?.length ?? 0,
      complete,
      goNext: () => router.replace(`/games/${gameId}?level=${n + 1}`),
      retry: () => router.replace(`/games/${gameId}?level=${n}`),
      toList: () => router.replace(`/levels/${gameId}`),
      openLevels: () => router.push(`/levels/${gameId}`),
    }),
    [complete, gameId, level, list, n],
  );
}
