import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { IconButton } from "../../components/Buttons";
import LevelsHeader from "../../components/LevelsHeader";
import LevelGrid, { totalStars } from "../../components/LevelGrid";
import GradientScreen from "../../components/GradientScreen";
import { challengesFor } from "../../games/challenges";
import { getGame } from "../../games/registry";
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

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
        <LevelsHeader
          game={game}
          blurb="Special challenges with their own rules. Clear one to unlock the next!"
          stars={totalStars(progress)}
          max={levels.length * 3}
        />
        <LevelGrid
          levels={levels}
          progress={progress}
          accent={game.accent}
          onPick={(i) => router.push(`/games/${game.id}?level=${i + 1}`)}
        />
      </ScrollView>
    </GradientScreen>
  );
}
