import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

/** Rounded progress bar that springs to `ratio` (0–1) on mount and on change. */
export default function XpBar({
  ratio,
  colors = ["#FFD43B", "#FF9F1C"],
  height = 14,
  track = "#F1F1F4",
}) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(
      withDelay(
        250,
        withSpring(Math.max(0.04, Math.min(1, ratio)), { damping: 18, stiffness: 90 }),
      ),
    );
  }, [ratio, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%" }, style]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: height }}
        />
      </Animated.View>
    </View>
  );
}
