import { useMemo } from "react";

import { useGameStore } from "../store/useGameStore";
import { playerStats, wornOutfit } from "./wardrobe";

/** The player's buddy outfit plus the stats that unlock items. */
export default function useOutfit() {
  const outfit = useGameStore((s) => s.outfit);
  const xp = useGameStore((s) => s.xp);
  const levels = useGameStore((s) => s.levels);
  const bestStreak = useGameStore((s) => s.bestStreak);
  const plays = useGameStore((s) => s.plays);
  const goalsDone = useGameStore((s) => s.goalsDone ?? 0);
  const stats = useMemo(
    () => playerStats({ xp, levels, bestStreak, plays, goalsDone }),
    [xp, levels, bestStreak, plays, goalsDone],
  );
  const worn = useMemo(() => wornOutfit(outfit, stats), [outfit, stats]);
  return { outfit: worn, stats };
}
