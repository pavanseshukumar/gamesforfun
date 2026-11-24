import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { levelInfo } from "../lib/progress";
import { useGameStore } from "../store/useGameStore";
import { ACHIEVEMENTS, progressOf } from "./achievements";

/** All achievements with live progress, plus how many are earned but unseen. */
export default function useAchievements() {
  const state = useGameStore(
    useShallow((s) => ({
      plays: s.plays,
      best: s.best,
      records: s.records,
      bestStreak: s.bestStreak,
      xp: s.xp,
      seenAwards: s.seenAwards,
    })),
  );

  return useMemo(() => {
    const snapshot = { ...state, level: levelInfo(state.xp).level };
    const list = ACHIEVEMENTS.map((a) => ({ ...a, ...progressOf(a, snapshot) }));
    const earned = list.filter((a) => a.done);
    const unseen = earned.filter((a) => !state.seenAwards.includes(a.id)).length;
    return { list, earned, unseen };
  }, [state]);
}
