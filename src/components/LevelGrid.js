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

/** The level to play next: the first unlocked level without a star (null when all are cleared). */
export function nextLevel(count, progress) {
  for (let n = 1; n <= count; n++) {
    const unlocked = n === 1 || progress[n - 1]?.stars > 0;
    if (unlocked && !(progress[n]?.stars > 0)) return n;
  }
  return null;
}

/**
 * Grid of numbered level cards with stars. A level unlocks once the one
 * before it has at least one star. `progress` is { [levelNumber]: { stars } }.
 * The next level to play is ringed in the game's `accent` with a PLAY tag;
 * perfect 3-star levels turn gold.
 */
export default function LevelGrid({ levels, progress, onPick, accent = "#141414" }) {
  const next = nextLevel(levels.length, progress);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {levels.map((lvl, i) => {
        const n = i + 1;
        const stars = progress[n]?.stars ?? 0;
        const locked = n > 1 && !(progress[n - 1]?.stars > 0);
        const isNext = n === next;
        const perfect = stars === 3;
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
                style={[
                  cardShadow,
                  {
                    opacity: locked ? 0.55 : 1,
                    borderWidth: 3,
                    borderColor: isNext ? accent : perfect ? "#FFC83D" : "transparent",
                    backgroundColor: perfect ? "#FFF8DC" : "#FFFFFF",
                  },
                ]}
                className="items-center rounded-3xl px-2 pb-3 pt-2"
              >
                {locked ? (
                  <View className="h-[46px] items-center justify-center">
                    <Ionicons name="lock-closed" size={24} color="#9A98A8" />
                  </View>
                ) : (
                  <Text style={[display(40), isNext && { color: accent }]}>{n}</Text>
                )}
                <Text numberOfLines={1} className="font-body-bold text-[11px] text-ink-mute">
                  {lvl.name}
                </Text>
                <View className="mt-1">
                  <Stars count={stars} size={13} />
                </View>
                {isNext && (
                  <View
                    style={{ backgroundColor: accent, position: "absolute", top: -9 }}
                    className="flex-row items-center rounded-full px-2.5 py-0.5"
                  >
                    <Ionicons name="play" size={9} color="#FFFFFF" />
                    <Text className="ml-0.5 font-body-black text-[10px] text-white">PLAY</Text>
                  </View>
                )}
              </View>
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}
