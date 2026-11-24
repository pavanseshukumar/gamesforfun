import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { cardShadow, display } from "../theme";
import PressableScale from "./PressableScale";

/** Three stars, with the unearned ones faded. */
export function Stars({ count, size = 18 }) {
  return (
    <View className="flex-row">
      {[0, 1, 2].map((i) => (
        <Text key={i} style={{ fontSize: size, opacity: i < count ? 1 : 0.25 }}>
          ⭐
        </Text>
      ))}
    </View>
  );
}

/** Total stars earned across a game's levels. */
export const totalStars = (progress) =>
  Object.values(progress).reduce((sum, l) => sum + (l.stars ?? 0), 0);

/**
 * Grid of numbered level cards with stars. A level unlocks once the one
 * before it has at least one star. `progress` is { [levelNumber]: { stars } }.
 */
export default function LevelGrid({ levels, progress, onPick }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {levels.map((lvl, i) => {
        const n = i + 1;
        const stars = progress[n]?.stars ?? 0;
        const locked = n > 1 && !(progress[n - 1]?.stars > 0);
        return (
          <Animated.View
            key={n}
            entering={ZoomIn.delay(Math.min(40 * i, 600))
              .springify()
              .damping(13)}
            style={{ width: "30.5%" }}
          >
            <PressableScale
              onPress={() => !locked && onPick(i)}
              disabled={locked}
              accessibilityLabel={`Level ${n}`}
            >
              <View
                style={[cardShadow, { opacity: locked ? 0.55 : 1 }]}
                className="items-center rounded-3xl bg-white px-2 pb-3 pt-2"
              >
                {locked ? (
                  <View className="h-[46px] items-center justify-center">
                    <Ionicons name="lock-closed" size={24} color="#9A98A8" />
                  </View>
                ) : (
                  <Text style={display(40)}>{n}</Text>
                )}
                <Text numberOfLines={1} className="font-body-bold text-[11px] text-ink-mute">
                  {lvl.name}
                </Text>
                <View className="mt-1">
                  <Stars count={stars} size={13} />
                </View>
              </View>
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}
