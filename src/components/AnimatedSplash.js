import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { BACKDROPS, display } from "../theme";
import Mascot from "./Mascot";

const CREW = ["bloop", "pip", "zip", "gloop", "sunny"];
export const SPLASH_MS = 1900;

/**
 * Branded launch screen shown over the app while it starts. It picks up from
 * the native splash (same yellow), pops the mascot crew in, fills a loading
 * bar, then fades away. `done` starts the fade-out.
 */
export default function AnimatedSplash({ done }) {
  const bar = useSharedValue(0);
  const title = useSharedValue(0);

  useEffect(() => {
    title.set(withDelay(150, withSpring(1, { damping: 11, stiffness: 140 })));
    bar.set(withTiming(1, { duration: SPLASH_MS - 200, easing: Easing.out(Easing.cubic) }));
  }, [bar, title]);

  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: [{ scale: 0.7 + 0.3 * title.value }],
  }));

  if (done) return null;
  return (
    <Animated.View
      exiting={FadeOut.duration(350)}
      style={[StyleSheet.absoluteFill, { zIndex: 50 }]}
    >
      <LinearGradient
        colors={BACKDROPS.welcome}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          {CREW.map((v, i) => (
            <Animated.View
              key={v}
              entering={ZoomIn.delay(120 + i * 110)
                .springify()
                .damping(9)}
              style={{ marginHorizontal: -4 }}
            >
              <Mascot
                variant={v}
                size={i === 2 ? 96 : 66}
                mood={i === 2 ? "cheer" : "happy"}
                delay={i * 200}
              />
            </Animated.View>
          ))}
        </View>
        <Animated.View style={[{ marginTop: 18, alignItems: "center" }, titleStyle]}>
          <Text style={[display(64), { lineHeight: 66, textAlign: "center" }]}>GAMES</Text>
          <Text style={[display(34), { lineHeight: 38, textAlign: "center" }]}>FOR FUN</Text>
        </Animated.View>
        <View
          style={{
            marginTop: 28,
            width: 160,
            height: 10,
            borderRadius: 5,
            backgroundColor: "rgba(20,20,20,0.12)",
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={[{ height: "100%", borderRadius: 5, backgroundColor: "#141414" }, barStyle]}
          />
        </View>
      </View>
    </Animated.View>
  );
}
