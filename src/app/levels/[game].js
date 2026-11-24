import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { IconButton } from "../../components/Buttons";
import LevelGrid, { totalStars } from "../../components/LevelGrid";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import { challengesFor } from "../../games/challenges";
import { getGame } from "../../games/registry";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const NO_PROGRESS = {};

/** Level select for any arcade game with challenge levels. */
export default function ChallengeLevels() {
  const { game: gameId } = useLocalSearchParams();
  const game = getGame(gameId);
  const levels = challengesFor(gameId) ?? [];
  const progress = useGameStore((s) => s.levels?.[gameId] ?? NO_PROGRESS);

  if (!game) return null;
  return (
    <GradientScreen theme={game.id} edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <Text style={display(30)}>Levels</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Animated.View entering={FadeInDown.springify()}>
          <View
            style={cardShadow}
            className="mb-5 flex-row items-center rounded-[28px] bg-white p-4"
          >
            <Mascot variant={game.mascot} size={70} mood="cheer" />
            <View className="ml-3 flex-1">
              <Text style={display(30)}>{game.title}</Text>
              <Text className="font-body text-xs leading-4 text-ink-mute">
                Special challenges with their own rules. Clear one to unlock the next!
              </Text>
            </View>
            <View className="items-center">
              <Text style={display(26)}>{totalStars(progress)}</Text>
              <Text className="font-body-bold text-[10px] text-ink-mute">
                / {levels.length * 3} ⭐
              </Text>
            </View>
          </View>
        </Animated.View>
        <LevelGrid
          levels={levels}
          progress={progress}
          onPick={(i) => router.push(`/games/${game.id}?level=${i + 1}`)}
        />
      </ScrollView>
    </GradientScreen>
  );
}
