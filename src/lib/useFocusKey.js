import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

/**
 * Returns a number that changes every time the screen gains focus. Use it as a
 * `key` so tab screens replay their entrance animations on each visit.
 */
export default function useFocusKey() {
  const [key, setKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setKey((k) => k + 1);
    }, []),
  );
  return key;
}
