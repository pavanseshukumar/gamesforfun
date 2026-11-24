import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp, FadeOut, ZoomIn } from "react-native-reanimated";

import { display } from "../theme";
import { GhostButton, PrimaryButton } from "./Buttons";
import Confetti from "./Confetti";
import Mascot from "./Mascot";

/**
 * Overlay shown when a round ends. Mount it conditionally; it animates itself
 * in and out. `result` is what useGameStore.recordGame returned.
 */
export default function GameOverModal({
  title = "Game over",
  game,
  score,
  best,
  result,
  onPlayAgain,
  extra,
}) {
  const { isNewBest, xpGained, levelUp } = result;
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
        backgroundColor: "rgba(20,20,30,0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 50,
      }}
    >
      {isNewBest && <Confetti />}

      <Animated.View
        entering={ZoomIn.springify().damping(13).stiffness(170)}
        style={{ width: "100%", maxWidth: 360 }}
      >
        <View style={{ alignItems: "center", marginBottom: -54, zIndex: 2 }}>
          <Mascot variant={game.mascot} size={130} mood={isNewBest ? "cheer" : "wow"} />
        </View>
        <View className="overflow-hidden rounded-[36px] bg-white">
          <LinearGradient
            colors={game.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 64 }}
          />
          <View className="items-center px-6 pb-6 pt-4">
            <Text style={[display(40), { textAlign: "center" }]}>{title}</Text>

            {isNewBest && (
              <Animated.View entering={ZoomIn.delay(250).springify()}>
                <View className="mt-1 rounded-full bg-ink px-4 py-1">
                  <Text className="font-body-black text-xs uppercase tracking-[2px] text-sun">
                    New best!
                  </Text>
                </View>
              </Animated.View>
            )}

            <Text style={[display(72), { marginTop: 4 }]}>{score}</Text>
            <Text className="-mt-1 font-body-bold text-sm uppercase tracking-[3px] text-ink-mute">
              {game.unit}
            </Text>
            {best != null && !isNewBest && (
              <Text className="mt-1 font-body-semi text-sm text-ink-mute">
                Best: {best} {game.unit}
              </Text>
            )}
            {extra}

            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <View className="mt-4 flex-row gap-2">
                <View className="rounded-full bg-[#FFF3C4] px-4 py-1.5">
                  <Text className="font-body-black text-sm text-ink">⭐ +{xpGained} XP</Text>
                </View>
                {levelUp && (
                  <View className="rounded-full bg-[#DDF8C8] px-4 py-1.5">
                    <Text className="font-body-black text-sm text-ink">⬆ Level {levelUp}!</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            <PrimaryButton
              title="Play again"
              icon="refresh"
              onPress={onPlayAgain}
              style={{ alignSelf: "stretch", marginTop: 22 }}
            />
            <GhostButton
              title="Back to games"
              onPress={() => router.back()}
              style={{ alignSelf: "stretch", marginTop: 10 }}
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
