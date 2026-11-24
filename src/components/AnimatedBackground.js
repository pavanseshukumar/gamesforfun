import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

function Blob({ color, size, top, left, duration, delay = 0, drift = 40 }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
      ),
    );
  }, [t, duration, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (t.value - 0.5) * drift * 2 },
      { translateY: (0.5 - t.value) * drift },
      { scale: 0.9 + t.value * 0.25 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.22,
        },
        style,
      ]}
    />
  );
}

/** Slow-drifting glow blobs behind every screen. Purely decorative. */
export default function AnimatedBackground({ tint = "#6D5BFF", secondTint = "#FF5FA2" }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["#0B0A1A", "#141236", "#0B0A1A"]} style={StyleSheet.absoluteFill} />
      <Blob color={tint} size={320} top={-80} left={-120} duration={7000} />
      <Blob color={secondTint} size={260} top={260} left={180} duration={9000} delay={600} />
      <Blob color="#22C9A8" size={220} top={560} left={-60} duration={8000} delay={1200} />
    </View>
  );
}
