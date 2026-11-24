import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { haptic } from "../lib/haptics";
import { SPRING } from "../lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that springs down when touched and fires a light haptic. */
export default function PressableScale({
  children,
  onPress,
  style,
  scaleTo = 0.94,
  hapticFeedback = true,
  disabled,
  ...rest
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={() => {
        scale.set(withSpring(scaleTo, SPRING));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, SPRING));
      }}
      onPress={(e) => {
        if (hapticFeedback) haptic.tap();
        onPress?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
