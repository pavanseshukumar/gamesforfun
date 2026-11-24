import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import PressableScale from "./PressableScale";

function FloatingEmoji({ emoji, delay }) {
  const t = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => {
      t.set(
        withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    }, delay);
    return () => clearTimeout(id);
  }, [t, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * t.value }, { rotate: `${(t.value - 0.5) * 10}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
    </Animated.View>
  );
}

export default function GameCard({ game, index, best, plays }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(150 + index * 110)
        .springify()
        .damping(15)}
    >
      <PressableScale onPress={() => router.push(game.route)} scaleTo={0.96}>
        <LinearGradient
          colors={game.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 20, overflow: "hidden" }}
        >
          {/* Soft highlight in the corner gives the card some depth. */}
          <View
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          />
          <View className="flex-row items-center">
            <View className="mr-4 h-20 w-20 items-center justify-center rounded-3xl bg-white/20">
              <FloatingEmoji emoji={game.emoji} delay={index * 300} />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-black text-white">{game.title}</Text>
              <Text className="mt-1 text-sm leading-5 text-white/85">{game.tagline}</Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-row gap-2">
              <View className="rounded-full bg-black/20 px-3 py-1">
                <Text className="text-xs font-bold text-white">
                  🏆 {best != null ? `${best} ${game.unit}` : "No best yet"}
                </Text>
              </View>
              {plays > 0 && (
                <View className="rounded-full bg-black/20 px-3 py-1">
                  <Text className="text-xs font-bold text-white">{plays} played</Text>
                </View>
              )}
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
              <Ionicons name="play" size={16} color={game.accent} style={{ marginLeft: 2 }} />
            </View>
          </View>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}
