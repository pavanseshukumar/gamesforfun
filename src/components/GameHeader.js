import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import PopNumber from "./PopNumber";
import PressableScale from "./PressableScale";

/** Top bar shared by every game: back button, title, live score and best. */
export default function GameHeader({ title, accent, score, scoreLabel = "Score", best, right }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </View>
        </PressableScale>

        <Text className="text-lg font-extrabold tracking-wide text-white">{title}</Text>

        {right ?? <View className="h-11 w-11" />}
      </View>

      <View className="flex-row gap-3 px-4">
        <View className="flex-1 rounded-2xl bg-white/10 px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-widest text-mist">
            {scoreLabel}
          </Text>
          <PopNumber value={score} className="text-3xl font-black" style={{ color: accent }} />
        </View>
        <View className="flex-1 rounded-2xl bg-white/5 px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-widest text-mist">Best</Text>
          <Text className="text-3xl font-black text-white">{best ?? "–"}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
