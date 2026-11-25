import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

import { cardShadow, display } from "../theme";
import Mascot from "./Mascot";
import PressableScale from "./PressableScale";

/** Tall carousel card for the home screen: numbered art tile + info. */
export default function GameCard({ game, index, best, width }) {
  return (
    <Animated.View
      entering={FadeInRight.delay(200 + index * 120)
        .springify()
        .damping(16)}
    >
      <PressableScale onPress={() => router.push(game.route)} scaleTo={0.96}>
        <View
          style={[{ width, borderRadius: 30, backgroundColor: "#FFFFFF", padding: 10 }, cardShadow]}
        >
          <LinearGradient
            colors={game.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 168,
              borderRadius: 22,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                position: "absolute",
                right: -30,
                top: -30,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: "rgba(255,255,255,0.22)",
              }}
            />
            <Text
              style={[
                display(86),
                { position: "absolute", left: 12, top: -6, color: "#FFFFFF", opacity: 0.95 },
              ]}
            >
              {index + 1}
            </Text>
            <View style={{ marginBottom: -6, marginLeft: 36 }}>
              {/* Only the first cards bob: off-screen ones stay still to keep Home light. */}
              <Mascot variant={game.mascot} size={124} delay={index * 350} animated={index < 3} />
            </View>
          </LinearGradient>

          <View className="px-2 pb-1 pt-3">
            <Text className="font-body-black text-xl text-ink">{game.title}</Text>
            <Text className="mt-0.5 font-body text-[13px] text-ink-mute">{game.tagline}</Text>
            <View className="mt-3 flex-row items-center justify-between">
              <View className="flex-row items-center rounded-full bg-[#F3F3F6] px-3 py-1.5">
                <Text className="font-body-bold text-xs text-ink">
                  🏆 {best != null ? `${best} ${game.unit}` : "No record"}
                </Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-ink">
                <Ionicons name="play" size={16} color="#fff" style={{ marginLeft: 2 }} />
              </View>
            </View>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}
