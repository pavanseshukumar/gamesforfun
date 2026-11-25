import { useEffect, useRef } from "react";
import { Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { BOUNCY } from "../lib/motion";

/** Text that does a quick "pop" every time its value changes. */
export default function PopNumber({ value, style, className }) {
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.set(withSequence(withTiming(1.3, { duration: 80 }), withSpring(1, BOUNCY)));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Text className={className} style={style}>
        {value}
      </Text>
    </Animated.View>
  );
}
