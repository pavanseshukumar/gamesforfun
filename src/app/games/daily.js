import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";

import { GhostButton, IconButton, PrimaryButton } from "../../components/Buttons";
import Confetti from "../../components/Confetti";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import { MASCOTS } from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import PuzzleArt from "../../components/PuzzleArt";
import {
  BLANK,
  dailyXp,
  isSolved,
  mascotOfDay,
  SIZE,
  slide,
  todaysBoard,
} from "../../games/daily/logic";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { dayKey } from "../../lib/progress";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display, INK } from "../../theme";

const GAME = getGame("daily");
const GAP = 6;
const TILE_SPRING = { damping: 18, stiffness: 260, mass: 0.6 };

function useCountdownToMidnight() {
  const calc = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const secs = Math.max(0, Math.floor((next - now) / 1000));
    const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
    const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

/** The last 7 days with a tick for each solved daily. */
function WeekStrip({ daily, today }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: "narrow" }) };
  });
  return (
    <View className="flex-row justify-between">
      {days.map((d) => {
        const done = daily[d.key] != null;
        const isToday = d.key === today;
        return (
          <View key={d.key} className="items-center">
            <Text className="mb-1 font-body-bold text-[11px] text-ink-mute">{d.label}</Text>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: done ? INK : "#F1EEFF",
                borderWidth: isToday ? 2 : 0,
                borderColor: INK,
              }}
            >
              <Text className={`font-body-black text-sm ${done ? "text-white" : "text-ink-mute"}`}>
                {done ? "✓" : "·"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Tile({ id, index, tile, variant, boardInner, showNumber, onPress }) {
  const cell = tile + GAP;
  const x = useSharedValue((index % SIZE) * cell);
  const y = useSharedValue(Math.floor(index / SIZE) * cell);

  useEffect(() => {
    x.set(withSpring((index % SIZE) * cell, TILE_SPRING));
    y.set(withSpring(Math.floor(index / SIZE) * cell, TILE_SPRING));
  }, [index, cell, x, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  // Where this piece of the picture lives in the solved image.
  const homeC = id % SIZE;
  const homeR = Math.floor(id / SIZE);

  return (
    <Animated.View style={[{ position: "absolute", width: tile, height: tile }, style]}>
      <PressableScale onPress={onPress} scaleTo={0.93} hapticFeedback={false}>
        <View style={{ width: tile, height: tile, borderRadius: 14, overflow: "hidden" }}>
          <View style={{ position: "absolute", left: -homeC * cell, top: -homeR * cell }}>
            <PuzzleArt variant={variant} size={boardInner} />
          </View>
          {showNumber && (
            <View className="absolute left-1.5 top-1.5 h-6 min-w-6 items-center justify-center rounded-full bg-white/90 px-1">
              <Text className="font-body-black text-[11px] text-ink">{id + 1}</Text>
            </View>
          )}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export default function DailyPuzzle() {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 40, 400);
  const boardInner = boardSize - 2 * 8; // board has 8px padding
  const tile = (boardInner - GAP * (SIZE - 1)) / SIZE;

  const today = dayKey();
  const variant = useMemo(() => mascotOfDay(today), [today]);
  const mascotGame = useMemo(() => ({ ...GAME, mascot: variant }), [variant]);
  const countdown = useCountdownToMidnight();

  const daily = useGameStore((s) => s.daily);
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const recordDaily = useGameStore((s) => s.recordDaily);
  const solvedToday = daily[today];

  const [phase, setPhase] = useState("intro"); // intro | playing | solved
  const [board, setBoard] = useState(() => todaysBoard(today));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showNumbers, setShowNumbers] = useState(true);
  const [result, setResult] = useState(null);
  const [practice, setPractice] = useState(false);
  const started = phase === "playing" && moves > 0;

  // The clock starts on the first move and stops when the picture is complete.
  useEffect(() => {
    if (!started) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started]);

  const start = () => {
    setPractice(solvedToday != null);
    setBoard(todaysBoard(today));
    setMoves(0);
    setSeconds(0);
    setResult(null);
    setPhase("playing");
  };

  const tap = (index) => {
    if (phase !== "playing") return;
    const next = slide(board, index);
    if (!next) {
      haptic.select();
      return;
    }
    haptic.tap();
    sfx("slide");
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);

    if (isSolved(next)) {
      setPhase("solved");
      haptic.success();
      sfx("solved");
      let outcome = { isNewBest: false, xpGained: 0, levelUp: null };
      if (!practice) {
        outcome = recordGame(GAME.id, nextMoves, { lowerIsBetter: true, xp: dailyXp(nextMoves) });
        recordDaily(today, nextMoves);
      }
      setTimeout(() => setResult(outcome), 1500);
    }
  };

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (phase === "intro") {
    return (
      <GradientScreen theme="daily" edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View className="flex-row items-center justify-between">
            <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
            <View className="rounded-full bg-white/70 px-4 py-2">
              <Text className="font-body-bold text-xs text-ink">{dateLabel}</Text>
            </View>
            <View style={{ width: 48 }} />
          </View>

          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <Text style={[display(64), { textAlign: "center", marginTop: 16 }]}>Daily puzzle</Text>
          </Animated.View>
          <Text className="text-center font-body-bold text-base text-ink-soft">
            Today starring {MASCOTS[variant].name}! Same puzzle for everyone.
          </Text>

          <Animated.View
            entering={FadeInUp.delay(150).springify()}
            style={{ alignItems: "center", marginTop: 20 }}
          >
            <View
              style={[
                { borderRadius: 32, overflow: "hidden", borderWidth: 6, borderColor: "#FFFFFF" },
                cardShadow,
              ]}
            >
              <PuzzleArt
                variant={variant}
                size={Math.min(width - 100, 280)}
                animated
                mood="cheer"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <View style={cardShadow} className="mt-6 rounded-[28px] bg-white p-5">
              {solvedToday != null ? (
                <>
                  <Text className="font-body-black text-lg text-ink">
                    ✅ Solved today in {solvedToday} moves
                  </Text>
                  <Text className="mt-1 font-body-semi text-sm text-ink-mute">
                    Next puzzle in {countdown}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="font-body-black text-lg text-ink">Rebuild the picture</Text>
                  <Text className="mt-1 font-body text-sm leading-5 text-ink-mute">
                    Tap a tile next to the gap to slide it. Your first solve today counts for XP and
                    your streak. Fewer moves, more XP!
                  </Text>
                </>
              )}
              <View className="mt-5">
                <WeekStrip daily={daily} today={today} />
              </View>
            </View>
          </Animated.View>

          <View style={{ marginTop: 22 }}>
            {solvedToday != null ? (
              <GhostButton title="Practice again" onPress={start} />
            ) : (
              <PrimaryButton title="Start puzzle" icon="extension-puzzle" onPress={start} />
            )}
          </View>
        </ScrollView>
      </GradientScreen>
    );
  }

  return (
    <GradientScreen theme="daily" edges={["top", "bottom"]}>
      <GameHeader
        title={practice ? "Practice" : "Daily"}
        score={moves}
        scoreLabel="Moves"
        best={best}
        right={
          <IconButton
            icon={showNumbers ? "eye" : "eye-off"}
            label={showNumbers ? "Hide numbers" : "Show numbers"}
            onPress={() => setShowNumbers((v) => !v)}
          />
        }
      />

      <View className="mt-4 flex-row items-center justify-between px-5">
        <Text className="font-body-black text-sm text-ink">
          ⏱ {mm}:{ss}
        </Text>
        <View className="flex-row items-center">
          <Text className="mr-2 font-body-bold text-xs text-ink-soft">Goal</Text>
          <View
            style={{ borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "#fff" }}
          >
            <PuzzleArt variant={variant} size={52} />
          </View>
        </View>
      </View>

      <View className="flex-1 items-center justify-center">
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <View
            style={[
              {
                width: boardSize,
                height: boardSize,
                padding: 8,
                borderRadius: 26,
                backgroundColor: "rgba(255,255,255,0.6)",
                borderWidth: 2,
                borderColor: "#FFFFFF",
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              {board.map((id, index) =>
                id === BLANK ? null : (
                  <Tile
                    key={id}
                    id={id}
                    index={index}
                    tile={tile}
                    variant={variant}
                    boardInner={boardInner}
                    showNumber={showNumbers && phase === "playing"}
                    onPress={() => tap(index)}
                  />
                ),
              )}
              {phase === "solved" && (
                <Animated.View
                  entering={FadeIn.duration(500)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  <PuzzleArt variant={variant} size={boardInner} animated mood="cheer" />
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>
        {phase === "solved" && <Confetti />}
      </View>

      {result && (
        <GameOverModal
          mood="success"
          title={practice ? "Practice solved!" : "Puzzle solved!"}
          game={mascotGame}
          score={moves}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              Time: {mm}:{ss} · next puzzle in {countdown}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
