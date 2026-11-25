import { useEffect, useState } from "react";

import { useGameStore } from "../store/useGameStore";

/** True once the saved progress has been loaded from storage. */
export default function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useGameStore.persist.hasHydrated());
  useEffect(() => useGameStore.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated || useGameStore.persist.hasHydrated();
}
