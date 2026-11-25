import { Accelerometer } from "expo-sensors";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSharedValue } from "react-native-reanimated";

/**
 * Sideways tilt of the phone as a shared value: roughly -1 (tilted left) to
 * 1 (tilted right), smoothed. Readable from worklets every frame.
 *
 * Android reports the reaction to gravity, iOS and web report gravity itself,
 * so Android's axis is flipped to make "right edge down" positive everywhere.
 */
export default function useTilt(enabled) {
  const tilt = useSharedValue(0);
  const [available, setAvailable] = useState(null); // null = still checking

  useEffect(() => {
    if (!enabled) return undefined;
    let sub;
    let cancelled = false;
    const sign = Platform.OS === "android" ? -1 : 1;

    Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (cancelled) return;
        setAvailable(ok);
        if (!ok) return;
        if (Platform.OS !== "web") Accelerometer.setUpdateInterval(16);
        sub = Accelerometer.addListener(({ x }) => {
          const raw = Math.max(-1, Math.min(1, x * sign));
          // Light low-pass filter so the player glides instead of jittering.
          tilt.set(tilt.get() * 0.6 + raw * 0.4);
        });
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });

    return () => {
      cancelled = true;
      sub?.remove();
      tilt.set(0);
    };
  }, [enabled, tilt]);

  return { tilt, available };
}
