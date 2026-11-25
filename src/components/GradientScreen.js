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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BACKDROPS } from "../theme";

/** Soft white bubble that drifts up and down forever. */
function Bubble({ size, top, left, delay, opacity = 0.35 }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true),
      ),
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -18 * t.value }, { scale: 0.92 + 0.12 * t.value }],
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
          backgroundColor: "#FFFFFF",
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Full-screen bright gradient with drifting bubbles and safe-area padding.
 * `theme` is a key of BACKDROPS (home, profile, tap-rush, …).
 */
export default function GradientScreen({ theme = "home", children, edges = ["top"] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={BACKDROPS[theme] ?? BACKDROPS.home}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Bubble size={180} top={-60} left={-70} delay={0} opacity={0.25} />
        <Bubble size={90} top={140} left={300} delay={900} />
        <Bubble size={46} top={420} left={24} delay={1600} opacity={0.4} />
        <Bubble size={130} top={620} left={250} delay={600} opacity={0.3} />
      </View>
      <View
        style={{
          flex: 1,
          paddingTop: edges.includes("top") ? insets.top : 0,
          paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
        }}
      >
        {children}
      </View>
    </View>
  );
}
