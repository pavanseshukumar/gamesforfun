import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { IconButton } from "../../components/Buttons";
import GameTile from "../../components/GameTile";
import GradientScreen from "../../components/GradientScreen";
import PressableScale from "../../components/PressableScale";
import { arrange, progressFor, SORTS, totalLevelCount } from "../../games/library";
import { ARCADE, CATEGORIES } from "../../games/registry";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAP = 14;
const FILTERS = [{ id: "all", label: "All", emoji: "✨" }, ...CATEGORIES];

function Chip({ label, active, onPress }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <View
        style={active ? undefined : cardShadow}
        className={`rounded-full px-4 py-2 ${active ? "bg-ink" : "bg-white"}`}
      >
        <Text className={`font-body-bold text-sm ${active ? "text-white" : "text-ink"}`}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

/** The full game library: every game in a grid, with filters, sorting and progress. */
export default function AllGames() {
  const { width } = useWindowDimensions();
  const best = useGameStore((s) => s.best);
  const plays = useGameStore((s) => s.plays);
  const levels = useGameStore((s) => s.levels);
  const lastPlayed = useGameStore((s) => s.lastPlayed);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("order");

  const state = useMemo(
    () => ({ best, plays, levels, lastPlayed }),
    [best, plays, levels, lastPlayed],
  );
  const games = arrange(ARCADE, state, { category, sort });
  const inner = Math.min(width, 560) - 40;
  const tileW = (inner - GAP) / 2;

  const totals = ARCADE.reduce(
    (t, g) => {
      const p = progressFor(g, state);
      return { stars: t.stars + p.stars, max: t.max + p.maxStars };
    },
    { stars: 0, max: 0 },
  );

  return (
    <GradientScreen theme="home" edges={["top"]}>
      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <Text style={display(30)}>All games</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mt-1 font-body-bold text-sm text-ink-soft">
          {ARCADE.length} games · {totalLevelCount(ARCADE)} levels · ⭐ {totals.stars}/{totals.max}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14, flexGrow: 0, alignSelf: "stretch" }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 8 }}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.id}
              label={`${f.emoji} ${f.label}`}
              active={category === f.id}
              onPress={() => setCategory(f.id)}
            />
          ))}
        </ScrollView>

        <View style={{ width: inner }} className="mt-3 flex-row items-center justify-between">
          <Text className="font-body-bold text-xs text-ink-mute">
            {games.length} {games.length === 1 ? "game" : "games"}
          </Text>
          <View className="flex-row rounded-full bg-white/70 p-1">
            {SORTS.map((s) => {
              const on = s.id === sort;
              return (
                <PressableScale
                  key={s.id}
                  onPress={() => setSort(s.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <View className={`rounded-full px-3 py-1 ${on ? "bg-white" : ""}`}>
                    <Text className={`font-body-bold text-xs ${on ? "text-ink" : "text-ink-mute"}`}>
                      {s.label}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <Animated.View
          key={`${category}-${sort}`}
          entering={FadeIn.duration(200)}
          style={{ width: inner, flexDirection: "row", flexWrap: "wrap", gap: GAP, marginTop: 12 }}
        >
          {games.map((g, i) => (
            <Animated.View
              key={g.id}
              entering={ZoomIn.delay(Math.min(i * 45, 400))
                .springify()
                .damping(14)}
            >
              <GameTile game={g} progress={progressFor(g, state)} width={tileW} />
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </GradientScreen>
  );
}
