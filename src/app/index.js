import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import GameCard from "../components/GameCard";
import PressableScale from "../components/PressableScale";
import Screen from "../components/Screen";
import { GAMES } from "../games/registry";
import { useGameStore } from "../store/useGameStore";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const best = useGameStore((s) => s.best);
  const plays = useGameStore((s) => s.plays);
  const totalPlays = Object.values(plays).reduce((a, b) => a + b, 0);
  const bestsSet = Object.keys(best).length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <View className="mb-6 mt-2 flex-row items-start justify-between">
            <View>
              <Text className="text-sm font-semibold text-mist">{greeting()} 👋</Text>
              <Text className="mt-1 text-4xl font-black text-white">Games</Text>
              <Text className="text-4xl font-black text-gold">for fun.</Text>
            </View>
            <PressableScale
              onPress={() => router.push("/settings")}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Ionicons name="settings-sharp" size={22} color="#fff" />
              </View>
            </PressableScale>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(100).duration(500)}>
          <View className="mb-6 flex-row gap-3">
            <View className="flex-1 rounded-3xl border border-white/10 bg-white/5 p-4">
              <Text className="text-3xl font-black text-white">{totalPlays}</Text>
              <Text className="text-xs font-semibold uppercase tracking-widest text-mist">
                Games played
              </Text>
            </View>
            <View className="flex-1 rounded-3xl border border-white/10 bg-white/5 p-4">
              <Text className="text-3xl font-black text-white">
                {bestsSet}
                <Text className="text-lg text-mist">/{GAMES.length}</Text>
              </Text>
              <Text className="text-xs font-semibold uppercase tracking-widest text-mist">
                Records set
              </Text>
            </View>
          </View>
        </Animated.View>

        <Text className="mb-3 text-xs font-bold uppercase tracking-[3px] text-mist-500">
          Pick a game
        </Text>

        <View className="gap-4">
          {GAMES.map((game, i) => (
            <GameCard
              key={game.id}
              game={game}
              index={i}
              best={best[game.id]}
              plays={plays[game.id] ?? 0}
            />
          ))}

          <Animated.View entering={FadeInDown.delay(150 + GAMES.length * 110).springify()}>
            <View className="items-center rounded-[28px] border border-dashed border-white/15 p-6">
              <Text style={{ fontSize: 28 }}>🎲</Text>
              <Text className="mt-2 font-bold text-white">More games coming soon</Text>
              <Text className="mt-1 text-center text-xs text-mist">
                Word games, reflex challenges and a daily puzzle are next.
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </Screen>
  );
}
