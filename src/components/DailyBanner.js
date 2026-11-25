import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { mascotOfDay } from "../games/daily/logic";
import { dayKey } from "../lib/progress";
import { useGameStore } from "../store/useGameStore";
import { cardShadow } from "../theme";
import { MASCOTS } from "./Mascot";
import PressableScale from "./PressableScale";
import PuzzleArt from "./PuzzleArt";

/** Home-screen card for today's puzzle, with a tick once it's solved. */
export default function DailyBanner() {
  const today = dayKey();
  const solved = useGameStore((s) => s.daily[today]);
  const variant = mascotOfDay(today);

  return (
    <PressableScale onPress={() => router.push("/games/daily")} scaleTo={0.97}>
      <LinearGradient
        colors={["#8C7BFF", "#5B4BE0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          { borderRadius: 28, padding: 14, flexDirection: "row", alignItems: "center" },
          cardShadow,
        ]}
      >
        <View
          style={{ borderRadius: 18, overflow: "hidden", borderWidth: 3, borderColor: "#FFFFFF" }}
        >
          <PuzzleArt variant={variant} size={74} />
        </View>
        <View className="ml-4 flex-1">
          <Text className="font-body-bold text-xs uppercase tracking-[2px] text-white/80">
            Today&apos;s puzzle
          </Text>
          <Text className="mt-0.5 font-body-black text-lg text-white">
            {solved != null ? `Solved in ${solved} moves` : `Help ${MASCOTS[variant].name}!`}
          </Text>
          <Text className="font-body text-xs text-white/80">
            {solved != null ? "New picture tomorrow" : "One new picture puzzle a day"}
          </Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <Ionicons
            name={solved != null ? "checkmark" : "play"}
            size={20}
            color="#5B4BE0"
            style={{ marginLeft: solved != null ? 0 : 2 }}
          />
        </View>
      </LinearGradient>
    </PressableScale>
  );
}
