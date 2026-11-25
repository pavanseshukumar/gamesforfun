import { Text, View } from "react-native";

import { targetsText } from "../games/challenges";
import { useGameStore } from "../store/useGameStore";
import { GhostButton } from "./Buttons";
import GameOverModal from "./GameOverModal";
import { Stars, totalStars } from "./LevelGrid";

const NO_PROGRESS = {};

/** Goal card shown on a game's start panel while playing a level. */
export function ChallengeGoal({ level, n }) {
  return (
    <View className="mt-3 w-full items-center rounded-3xl bg-white px-4 py-3">
      <Text className="font-body-bold text-[11px] uppercase tracking-[2px] text-ink-mute">
        Level {n} · {level.name}
      </Text>
      <Text className="mt-1 text-center font-body-black text-base text-ink">{level.goal}</Text>
      <Text className="mt-1 font-body-semi text-xs text-ink-soft">{targetsText(level)}</Text>
    </View>
  );
}

/** "Levels · 12/30 ⭐" button for a game's start panel. */
export function LevelsButton({ gameId, count, onPress, style }) {
  const progress = useGameStore((s) => s.levels?.[gameId] ?? NO_PROGRESS);
  return (
    <GhostButton
      title={`Levels · ${totalStars(progress)}/${count * 3} ⭐`}
      onPress={onPress}
      style={style}
    />
  );
}

/** End-of-level sheet: stars, Next / Try again, back to the level list. */
export function ChallengeResult({ game, challenge, result, unit }) {
  const { level, hasNext } = challenge;
  const cleared = result.cleared;
  return (
    <GameOverModal
      title={cleared ? "Level cleared!" : "Not quite!"}
      game={{ ...game, unit: "stars" }}
      score={result.stars}
      best={undefined}
      result={result}
      mood={cleared ? "success" : "fail"}
      primaryLabel={cleared ? (hasNext ? "Next level" : "Play again") : "Try again"}
      primaryIcon={cleared && hasNext ? "arrow-forward" : "refresh"}
      onPlayAgain={cleared && hasNext ? challenge.goNext : challenge.retry}
      secondaryLabel="All levels"
      onSecondary={challenge.toList}
      extra={
        <View className="mt-2 items-center">
          <Stars count={result.stars} size={26} />
          <Text className="mt-1 text-center font-body-semi text-sm text-ink-mute">
            {level.name}
            {Number.isFinite(result.value) ? `: ${result.value} ${unit}` : ""}
          </Text>
          <Text className="mt-0.5 text-center font-body text-xs text-ink-mute">
            {targetsText(level)}
          </Text>
          {!cleared && (
            <Text className="mt-1 text-center font-body text-xs text-ink-mute">
              Goal: {level.goal}
            </Text>
          )}
        </View>
      }
    />
  );
}
