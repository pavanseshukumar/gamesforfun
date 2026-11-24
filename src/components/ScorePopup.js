import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { display } from "../theme";

/**
 * "+N" text that floats up and fades, with an expanding ring burst behind it.
 * Mount it at (x, y) and remove it after ~700ms.
 */
export default function ScorePopup({ x, y, text, color, textColor }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const textStyle = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ translateY: -60 * t.value }, { scale: 0.8 + 0.5 * Math.min(1, t.value * 3) }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - t.value),
    transform: [{ scale: 0.4 + t.value * 1.6 }],
  }));
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - 60, top: y - 50 }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 10,
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 4,
            borderColor: color,
          },
          burstStyle,
        ]}
      />
      <Animated.View
        style={[
          { width: 120, height: 100, alignItems: "center", justifyContent: "center" },
          textStyle,
        ]}
      >
        <Text style={[display(text.length > 4 ? 22 : 30), textColor ? { color: textColor } : null]}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}
