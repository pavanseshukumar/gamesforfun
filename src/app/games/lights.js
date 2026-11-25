import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { IconButton } from "../../components/Buttons";
import Confetti from "../../components/Confetti";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import LevelGrid, { Stars, totalStars } from "../../components/LevelGrid";
import LevelsHeader from "../../components/LevelsHeader";
import { getLevels, LEVEL_NAMES } from "../../games/lights/levels";
import {
  affected,
  cellCount,
  isSolved,
  litCount,
  remainingTaps,
  starsFor,
  tap as tapBoard,
} from "../../games/lights/logic";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("lights");
// Stable fallback: a fresh {} per render would make the store selector loop forever.
const NO_PROGRESS = {};
const GAP = 6;

/** One lamp: a dark tile with a glowing layer that fades in when lit. */
function Lamp({ lit, size, delay, hinted, onPress, index }) {
  const glow = useSharedValue(lit ? 1 : 0);
  const pop = useSharedValue(1);
  const ring = useSharedValue(0);
  const wasLit = useRef(lit);

  useEffect(() => {
    // Only lamps that actually flipped animate.
    if (wasLit.current === lit) return;
    wasLit.current = lit;
    glow.set(withDelay(delay, withTiming(lit ? 1 : 0, { duration: 160 })));
    pop.set(
      withDelay(
        delay,
        withSequence(withTiming(0.88, { duration: 70 }), withSpring(1, { damping: 9 })),
      ),
    );
  }, [lit, delay, glow, pop]);
  useEffect(() => {
    ring.set(hinted ? withRepeat(withTiming(1, { duration: 650 }), -1, true) : withTiming(0));
  }, [hinted, ring]);

  const tileStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Lamp ${index + 1}, ${lit ? "on" : "off"}`}
      style={{ width: size, height: size }}
    >
      <Animated.View style={[{ width: size, height: size }, tileStyle]}>
        <View
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: size * 0.26,
            backgroundColor: "#2E2A5E",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: size * 0.22,
              height: size * 0.22,
              borderRadius: size,
              backgroundColor: "#4A4590",
            }}
          />
        </View>
        <Animated.View
          style={[
            {
              position: "absolute",
              inset: 0,
              borderRadius: size * 0.26,
              backgroundColor: "#FFD43B",
              borderWidth: size * 0.08,
              borderColor: "#FFF3A6",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#FFC300",
              shadowOpacity: 0.7,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
            },
            glowStyle,
          ]}
        >
          <View
            style={{
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size,
              backgroundColor: "#FFFBE0",
            }}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              inset: -4,
              borderRadius: size * 0.3,
              borderWidth: 4,
              borderColor: "#FF6FB1",
            },
            ringStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function LightItUp() {
  const levels = useMemo(() => getLevels(), []);
  const progress = useGameStore((s) => s.levels?.[GAME.id] ?? NO_PROGRESS);
  const recordLevel = useGameStore((s) => s.recordLevel);
  const recordGame = useGameStore((s) => s.recordGame);

  const [levelIdx, setLevelIdx] = useState(null); // null = level select
  const [board, setBoard] = useState([]);
  const [tapsMade, setTapsMade] = useState([]); // every tap, in order
  const [lastTap, setLastTap] = useState(-1);
  const [hint, setHint] = useState(-1);
  const [hints, setHints] = useState(0);
  const [solved, setSolved] = useState(false);
  const [result, setResult] = useState(null);
  const [area, setArea] = useState(null);

  const level = levelIdx == null ? null : levels[levelIdx];
  const n = levelIdx == null ? 0 : levelIdx + 1;
  const hasNext = levelIdx != null && levelIdx < levels.length - 1;

  const startLevel = useCallback(
    (i) => {
      setLevelIdx(i);
      setBoard(levels[i].start);
      setTapsMade([]);
      setLastTap(-1);
      setHint(-1);
      setHints(0);
      setSolved(false);
      setResult(null);
      sfx("go");
    },
    [levels],
  );

  const press = (i) => {
    if (solved || board[i] === null) return;
    const next = tapBoard(level.cols, level.rows, board, i);
    const nextTaps = [...tapsMade, i];
    haptic.tap();
    sfx("switch");
    setBoard(next);
    setTapsMade(nextTaps);
    setLastTap(i);
    if (hint === i) setHint(-1);
    if (!isSolved(next)) return;

    setSolved(true);
    haptic.success();
    sfx("solved");
    const stars = starsFor(nextTaps.length, level.par, hints);
    const score = Math.max(1, 1000 * stars - nextTaps.length * 10 - hints * 100);
    const { prevStars } = recordLevel(GAME.id, n, stars, score);
    const total = totalStars(useGameStore.getState().levels[GAME.id]);
    const gained = Math.max(0, stars - prevStars);
    const outcome = recordGame(GAME.id, total, { xp: 10 + gained * 12 });
    setTimeout(
      () =>
        setResult({
          stars,
          taps: nextTaps.length,
          isNewBest: stars > prevStars,
          xpGained: outcome.xpGained,
          levelUp: outcome.levelUp,
        }),
      1400,
    );
  };

  const showHint = () => {
    if (solved) return;
    const left = remainingTaps(level.scramble, tapsMade);
    if (!left.length) return;
    setHint(left[0]);
    setHints((h) => h + 1);
    sfx("star");
  };

  if (level == null) {
    return (
      <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text style={display(30)}>Levels</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <LevelsHeader
            game={GAME}
            blurb="Tap a lamp to flip it and its neighbours. Light up every lamp!"
            stars={totalStars(progress)}
            max={levels.length * 3}
          />
          <LevelGrid
            levels={LEVEL_NAMES}
            progress={progress}
            onPick={startLevel}
            accent={GAME.accent}
          />
        </ScrollView>
      </GradientScreen>
    );
  }

  const tile = area
    ? Math.floor(
        Math.min(
          (area.w - 24 - GAP * (level.cols - 1)) / level.cols,
          (area.h - 24 - GAP * (level.rows - 1)) / level.rows,
          78,
        ),
      )
    : 0;
  const flipped = lastTap >= 0 ? new Set(affected(level.cols, level.rows, board, lastTap)) : null;
  const lit = litCount(board);
  const total = cellCount(board);

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={`Level ${n}`}
        score={tapsMade.length}
        scoreLabel="Taps"
        best={progress[n]?.stars ? "⭐".repeat(progress[n].stars) : undefined}
        right={<IconButton icon="bulb-outline" label="Hint" onPress={showHint} />}
      />

      <View className="mt-4 flex-row items-center justify-between px-5">
        <View>
          <Text className="font-body-black text-sm text-ink">
            💡 {lit} / {total} lit
          </Text>
          <Text className="font-body-bold text-xs text-ink-soft">
            {level.name} · par {level.par} taps
          </Text>
        </View>
        {hints > 0 && (
          <View className="rounded-full bg-white px-3 py-1.5">
            <Text className="font-body-bold text-xs text-ink">
              {hints} hint{hints > 1 ? "s" : ""} · max 2 ⭐
            </Text>
          </View>
        )}
      </View>

      <View
        style={{
          flex: 1,
          margin: 16,
          marginTop: 10,
          alignItems: "center",
          justifyContent: "center",
        }}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {tile > 0 && (
          <Animated.View entering={ZoomIn.springify().damping(14)} key={levelIdx}>
            <View
              style={[
                {
                  padding: 12,
                  borderRadius: 24,
                  backgroundColor: "#1E1B45",
                  width: tile * level.cols + GAP * (level.cols - 1) + 24,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: GAP,
                },
                cardShadow,
              ]}
            >
              {board.map((cell, i) =>
                cell === null ? (
                  <View key={i} style={{ width: tile, height: tile }} />
                ) : (
                  <Lamp
                    key={i}
                    index={i}
                    lit={cell}
                    size={tile}
                    // The tapped lamp flips first, its neighbours a beat later.
                    delay={flipped?.has(i) && i !== lastTap ? 70 : 0}
                    hinted={hint === i}
                    onPress={() => press(i)}
                  />
                ),
              )}
            </View>
          </Animated.View>
        )}
        {solved && <Confetti />}
      </View>

      <View className="flex-row justify-center gap-3 pb-4">
        <IconButton icon="grid-outline" label="All levels" onPress={() => setLevelIdx(null)} />
        <IconButton icon="refresh" label="Restart level" onPress={() => startLevel(levelIdx)} />
      </View>

      {result && (
        <GameOverModal
          title="Lights on!"
          game={GAME}
          score={result.stars}
          best={progress[n]?.stars}
          result={result}
          mood="success"
          primaryLabel={hasNext ? "Next level" : "Play again"}
          primaryIcon={hasNext ? "arrow-forward" : "refresh"}
          onPlayAgain={() => startLevel(hasNext ? levelIdx + 1 : levelIdx)}
          secondaryLabel="All levels"
          onSecondary={() => setLevelIdx(null)}
          extra={
            <View className="mt-2 items-center">
              <Stars count={result.stars} size={26} />
              <Text className="mt-1 font-body-semi text-sm text-ink-mute">
                {result.taps} taps (par {level.par})
                {hints ? ` · ${hints} hint${hints > 1 ? "s" : ""}` : ""}
              </Text>
            </View>
          }
        />
      )}
    </GradientScreen>
  );
}
