import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { cardShadow } from "../theme";
import Mascot from "./Mascot";
import PressableScale from "./PressableScale";

/** Compact library card: game art on top, title, best and star progress below. */
export default function GameTile({ game, progress, width }) {
  const ratio = progress.maxStars ? progress.stars / progress.maxStars : 0;
  return (
    <PressableScale
      onPress={() => router.push(game.route)}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={`Play ${game.title}`}
      style={{ width }}
    >
      <View style={[{ borderRadius: 26, backgroundColor: "#FFFFFF", padding: 8 }, cardShadow]}>
        <LinearGradient
          colors={game.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: width * 0.72,
            borderRadius: 20,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              position: "absolute",
              right: -24,
              top: -24,
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: "rgba(255,255,255,0.22)",
            }}
          />
          <Text style={{ position: "absolute", left: 10, top: 8, fontSize: 20 }}>{game.emoji}</Text>
          {progress.isNew && (
            <View className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5">
              <Text className="font-body-black text-[10px] text-ink">NEW</Text>
            </View>
          )}
          <View style={{ marginBottom: -5 }}>
            <Mascot variant={game.mascot} size={width * 0.5} animated={false} />
          </View>
        </LinearGradient>

        <View className="px-1.5 pb-1 pt-2.5">
          <Text numberOfLines={1} className="font-body-black text-[15px] text-ink">
            {game.title}
          </Text>
          <Text numberOfLines={1} className="font-body text-[11px] text-ink-mute">
            {game.tagline}
          </Text>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="font-body-bold text-[11px] text-ink">
              🏆 {progress.best != null ? `${progress.best} ${game.unit}` : "–"}
            </Text>
            <Text className="font-body-bold text-[11px] text-ink">
              ⭐ {progress.stars}/{progress.maxStars}
            </Text>
          </View>
          <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F1EEF6]">
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
      </View>
    </PressableScale>
  );
}
