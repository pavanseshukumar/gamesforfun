import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

import Confetti from "./Confetti";
import PressableScale from "./PressableScale";

/**
 * Overlay shown when a round ends. Mount it conditionally; it animates itself
 * in and out.
 */
export default function GameOverModal({
  title = "Game over",
  emoji = "🎉",
  score,
  unit,
  best,
  isNewBest,
  colors,
  onPlayAgain,
  extra,
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(6,5,18,0.78)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 50,
      }}
    >
      {isNewBest && <Confetti />}

      <Animated.View
        entering={ZoomIn.springify().damping(13).stiffness(180)}
        style={{ width: "100%", maxWidth: 360 }}
      >
        <View className="overflow-hidden rounded-[32px] border border-white/10 bg-ink-800">
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 28, alignItems: "center" }}
          >
            <Text style={{ fontSize: 56 }}>{emoji}</Text>
            <Text className="mt-2 text-2xl font-black text-white">{title}</Text>
          </LinearGradient>

          <View className="items-center px-6 pb-6 pt-5">
            {isNewBest && (
              <Animated.View entering={ZoomIn.delay(250).springify()}>
                <View className="mb-3 rounded-full bg-gold px-4 py-1">
                  <Text className="text-xs font-black uppercase tracking-widest text-ink">
                    New best!
                  </Text>
                </View>
              </Animated.View>
            )}

            <Text className="text-6xl font-black text-white">{score}</Text>
            <Text className="text-sm font-semibold uppercase tracking-widest text-mist">
              {unit}
            </Text>
            {best != null && !isNewBest && (
              <Text className="mt-2 text-sm text-mist-300">
                Best: {best} {unit}
              </Text>
            )}
            {extra}

            <PressableScale onPress={onPlayAgain} style={{ width: "100%", marginTop: 24 }}>
              <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 18, paddingVertical: 16, alignItems: "center" }}
              >
                <Text className="text-base font-black text-white">Play again</Text>
              </LinearGradient>
            </PressableScale>

            <PressableScale onPress={() => router.back()} style={{ width: "100%", marginTop: 10 }}>
              <View className="items-center rounded-[18px] bg-white/10 py-4">
                <Text className="text-base font-bold text-white">Back to games</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
