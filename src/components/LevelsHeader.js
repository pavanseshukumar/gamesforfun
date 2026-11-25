import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { cardShadow, display } from "../theme";
import Mascot from "./Mascot";

/** Top card of every level select: mascot, title, blurb and star progress in the game's colour. */
export default function LevelsHeader({ game, blurb, stars, max }) {
  const ratio = max ? Math.min(1, stars / max) : 0;
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <View style={cardShadow} className="mb-5 rounded-[28px] bg-white p-4">
        <View className="flex-row items-center">
          <Mascot variant={game.mascot} size={70} mood="cheer" />
          <View className="ml-3 flex-1">
            <Text style={display(30)} numberOfLines={1}>
              {game.title}
            </Text>
            <Text className="font-body text-xs leading-4 text-ink-mute">{blurb}</Text>
          </View>
          <View className="items-center">
            <Text style={display(26)}>{stars}</Text>
            <Text className="font-body-bold text-[10px] text-ink-mute">/ {max} ⭐</Text>
          </View>
        </View>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1EEF6]">
          <View
            style={{
              width: `${Math.round(ratio * 100)}%`,
              height: "100%",
              borderRadius: 99,
              backgroundColor: game.accent,
            }}
          />
        </View>
      </View>
    </Animated.View>
  );
}
