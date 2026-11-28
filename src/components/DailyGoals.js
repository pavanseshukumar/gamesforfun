import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { router } from "expo-router";

import { BONUS_XP, GOAL_XP, goalPlay, goalProgress, goalsFor } from "../games/goals";
import { getGame } from "../games/registry";
import { haptic } from "../lib/haptics";
import { dayKey } from "../lib/progress";
import { sfx } from "../lib/sound";
import { useGameStore } from "../store/useGameStore";
import { cardShadow, INK } from "../theme";
import PressableScale from "./PressableScale";

const PINK = "#FF4FA0";

function ClaimButton({ label, onPress }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.07, { duration: 600 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={style}>
        <View style={{ backgroundColor: PINK }} className="rounded-full px-3 py-1.5">
          <Text className="font-body-black text-xs text-white">{label}</Text>
        </View>
      </Animated.View>
    </PressableScale>
  );
}

/** Jumps straight into a game that moves this goal on. */
function PlayButton({ play }) {
  const game = getGame(play.gameId);
  return (
    <PressableScale
      onPress={() => {
        haptic.tap();
        sfx("select");
        router.push(play.route);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Play ${game.title}`}
    >
      <View
        style={{ borderColor: PINK }}
        className="mt-1 flex-row items-center rounded-full border-2 bg-white px-2.5 py-1"
      >
        <Ionicons name="play" size={11} color={PINK} />
        <Text className="ml-1 font-body-black text-xs" style={{ color: PINK }}>
          Play
        </Text>
      </View>
    </PressableScale>
  );
}

function GoalRow({ goal, progress, claimed, onClaim, play }) {
  const done = progress >= goal.target;
  const ratio = Math.min(1, progress / goal.target);
  return (
    <View className="flex-row items-center py-2">
      <View
        className="h-10 w-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: claimed ? "#E7F8EE" : "#FFF0F7" }}
      >
        {claimed ? (
          <Ionicons name="checkmark" size={20} color="#1FB865" />
        ) : (
          <Text style={{ fontSize: 18 }}>{goal.emoji}</Text>
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text
          numberOfLines={2}
          className={`font-body-bold text-sm ${claimed ? "text-ink-mute" : "text-ink"}`}
        >
          {goal.text}
        </Text>
        {!claimed && (
          <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F3EEF6]">
            <View
              style={{
                width: `${Math.round(ratio * 100)}%`,
                height: "100%",
                borderRadius: 99,
                backgroundColor: done ? "#1FB865" : PINK,
              }}
            />
          </View>
        )}
      </View>
      <View className="ml-3 items-end" style={{ minWidth: 64 }}>
        {claimed ? (
          <Text className="font-body-bold text-xs text-ink-mute">+{GOAL_XP} XP</Text>
        ) : done ? (
          <ClaimButton label={`Claim +${GOAL_XP}`} onPress={onClaim} />
        ) : (
          <>
            <Text className="font-body-black text-xs text-ink">
              {Math.min(progress, goal.target)}/{goal.target}
            </Text>
            <PlayButton play={play} />
          </>
        )}
      </View>
    </View>
  );
}

/** Home card: today's three goals, claim buttons and the all-three bonus. */
export default function DailyGoals() {
  const day = dayKey();
  const goals = useMemo(() => goalsFor(day), [day]);
  const stats = useGameStore((s) => s.goalStats);
  const claims = useGameStore((s) => s.goalClaims);
  const claimGoal = useGameStore((s) => s.claimGoal);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(id);
  }, [toast]);

  const today = claims?.day === day ? claims : null;
  const claimedIds = today?.ids ?? [];
  const claimedCount = claimedIds.length;
  const bonusReady = claimedCount === goals.length && !today?.bonus;

  const claim = (id) => {
    const res = claimGoal(id);
    if (!res) return;
    haptic.success();
    sfx(res.levelUp ? "levelup" : "star");
    setToast(
      res.levelUp
        ? `+${res.xpGained} XP · Level ${res.levelUp}!`
        : `+${res.xpGained} XP${id === "bonus" ? " bonus!" : ""}`,
    );
  };

  return (
    <View style={cardShadow} className="rounded-[28px] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-body-black text-base text-ink">{"Today's goals"}</Text>
          <Text className="font-body text-xs text-ink-mute">New goals every day</Text>
        </View>
        <View className="flex-row items-center">
          {toast && (
            <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
              <View className="mr-2 rounded-full bg-[#E7F8EE] px-2.5 py-1">
                <Text className="font-body-black text-xs text-[#1FB865]">{toast}</Text>
              </View>
            </Animated.View>
          )}
          <View className="rounded-full bg-ink px-3 py-1">
            <Text className="font-body-black text-xs text-white">
              {claimedCount}/{goals.length}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-2">
        {goals.map((g) => (
          <GoalRow
            key={g.id}
            goal={g}
            progress={goalProgress(g, stats, day)}
            claimed={claimedIds.includes(g.id)}
            onClaim={() => claim(g.id)}
            play={goalPlay(g, stats, day)}
          />
        ))}
      </View>

      <View
        className="mt-2 flex-row items-center rounded-2xl px-3 py-2.5"
        style={{ backgroundColor: today?.bonus ? "#E7F8EE" : "#FFF6E0" }}
      >
        <Text style={{ fontSize: 16 }}>{today?.bonus ? "🎉" : "🎁"}</Text>
        <Text className="ml-2 flex-1 font-body-bold text-xs text-ink">
          {today?.bonus
            ? "All done for today: bonus claimed!"
            : `Finish all 3 for a +${BONUS_XP} XP bonus`}
        </Text>
        {bonusReady ? (
          <ClaimButton label={`Claim +${BONUS_XP}`} onPress={() => claim("bonus")} />
        ) : (
          !today?.bonus && <Ionicons name="lock-closed" size={14} color={INK} />
        )}
      </View>
    </View>
  );
}
