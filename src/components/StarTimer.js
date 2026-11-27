import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { fmtTime, starTimes } from "../games/timeStars";
import { haptic } from "../lib/haptics";
import { sfx } from "../lib/sound";
import { cardShadow } from "../theme";

const GOLD = "#FFB800";

function Star({ lit, index }) {
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.set(
      withSequence(
        withTiming(1.4, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 260, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
  }, [lit, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ marginRight: index < 2 ? 2 : 0 }, style]}>
      <Ionicons name={lit ? "star" : "star-outline"} size={20} color={lit ? GOLD : "#C9C2D6"} />
    </Animated.View>
  );
}

/**
 * The level clock for time-starred games: three stars that drop away as the
 * star times pass, and a bar draining toward the next drop.
 * @param {{ seconds: number, goal: number, running: boolean }} props
 */
export default function StarTimer({ seconds, goal, running }) {
  const [three, two] = starTimes(goal);
  const stars = seconds <= three ? 3 : seconds <= two ? 2 : 1;
  const limit = stars === 3 ? three : stars === 2 ? two : null;
  const left = limit == null ? 0 : limit - seconds;
  const frac = limit == null ? 0 : Math.max(0, left / goal);

  const fill = useSharedValue(1);
  useEffect(() => {
    // Glide to where the bar will be a second from now, so it drains smoothly.
    const target = running && limit != null ? Math.max(0, (left - 1) / goal) : frac;
    fill.set(withTiming(target, { duration: running ? 1000 : 250, easing: Easing.linear }));
  }, [fill, frac, goal, left, limit, running]);
  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  // A star slipping away gets a little warning.
  const prev = useRef(stars);
  useEffect(() => {
    if (stars < prev.current) {
      sfx("warn");
      haptic.error();
    }
    prev.current = stars;
  }, [stars]);

  const warn = limit != null && left <= 5;
  return (
    <View style={cardShadow} className="rounded-3xl bg-white px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {[0, 1, 2].map((i) => (
            <Star key={i} index={i} lit={i < stars} />
          ))}
          <Text className="ml-2 font-body-bold text-xs text-ink-soft">
            {limit == null ? "Finish to earn ★" : `${stars}★ within ${fmtTime(limit)}`}
          </Text>
        </View>
        <Text className={`font-body-black text-xs ${warn ? "text-[#E5484D]" : "text-ink"}`}>
          {limit == null ? "" : `${fmtTime(left)} left`}
        </Text>
      </View>
      <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#F1ECF6]">
        <Animated.View
          style={[
            {
              height: "100%",
              borderRadius: 999,
              backgroundColor: warn ? "#FF6B6B" : stars === 3 ? GOLD : "#FFA14D",
            },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}
