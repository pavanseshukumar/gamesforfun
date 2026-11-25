import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const COLORS = ["#FFC94D", "#FF6B5B", "#A26BFA", "#22C9A8", "#3B82F6", "#F25FB4"];

function Piece({ angle, distance, color, size, delay, spin }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) })));
  }, [p, delay]);

  const style = useAnimatedStyle(() => {
    const d = distance * p.value;
    return {
      opacity: 1 - p.value * p.value,
      transform: [
        { translateX: Math.cos(angle) * d },
        { translateY: Math.sin(angle) * d + p.value * p.value * 160 },
        { rotate: `${spin * p.value}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size * 0.5,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** A one-shot burst of confetti from the centre of its parent. */
export default function Confetti({ count = 36 }) {
  // Random layout is generated once, on mount.
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      key: i,
      angle: Math.random() * Math.PI * 2,
      distance: 90 + Math.random() * 170,
      color: COLORS[i % COLORS.length],
      size: 8 + Math.random() * 8,
      delay: Math.random() * 120,
      spin: (Math.random() - 0.5) * 900,
    })),
  );

  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      {pieces.map(({ key, ...p }) => (
        <Piece key={key} {...p} />
      ))}
    </View>
  );
}
