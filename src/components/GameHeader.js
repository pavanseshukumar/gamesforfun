import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { cardShadow, display } from "../theme";
import { IconButton } from "./Buttons";
import PopNumber from "./PopNumber";

/** Top bar shared by every game: back button, big title, live score and best. */
export default function GameHeader({ title, score, scoreLabel = "Score", best, right }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <IconButton
          icon="chevron-back"
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
        <Text style={display(30)}>{title}</Text>
        {right ?? <View style={{ width: 48 }} />}
      </View>

      <View className="flex-row gap-3 px-5">
        <View style={cardShadow} className="flex-1 rounded-3xl bg-white px-4 py-3">
          <Text className="font-body-bold text-[11px] uppercase tracking-[2px] text-ink-mute">
            {scoreLabel}
          </Text>
          <PopNumber value={score} style={display(34)} />
        </View>
        <View className="flex-1 rounded-3xl bg-white/50 px-4 py-3">
          <Text className="font-body-bold text-[11px] uppercase tracking-[2px] text-ink-mute">
            Best
          </Text>
          <Text style={display(34)}>{best ?? "–"}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
