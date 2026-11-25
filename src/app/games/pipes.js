import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { IconButton } from "../../components/Buttons";
import Confetti from "../../components/Confetti";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import LevelsHeader from "../../components/LevelsHeader";
import LevelGrid, { Stars, totalStars } from "../../components/LevelGrid";
import { getLevels, LEVEL_NAMES } from "../../games/pipes/levels";
import { E, flow, N, rotate, S, starsFor, W } from "../../games/pipes/logic";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("pipes");
// Stable fallback: a fresh {} per render would make the store selector loop forever.
const NO_PROGRESS = {};
const GAP = 3;
const DRY = "#B9B3CC";
const DRY_DARK = "#9B94B3";
const WATER = "#2F9BFF";
const WATER_LIGHT = "#8FD0FF";

/** Pipe arms for a mask, drawn in a 100×100 tile. */
function PipeShape({ mask, color, inner }) {
  const arm = { [N]: "M50 50 V0", [E]: "M50 50 H100", [S]: "M50 50 V100", [W]: "M50 50 H0" };
  const d = [N, E, S, W]
    .filter((dir) => mask & dir)
    .map((dir) => arm[dir])
    .join(" ");
  return (
    <G>
      <Path d={d} stroke={color} strokeWidth={30} strokeLinecap="butt" fill="none" />
      <Circle cx={50} cy={50} r={15} fill={color} />
      <Path d={d} stroke={inner} strokeWidth={10} strokeLinecap="butt" fill="none" opacity={0.7} />
      <Circle cx={50} cy={50} r={5} fill={inner} opacity={0.7} />
    </G>
  );
}

function Tap() {
  return (
    <G>
      <Rect x={26} y={30} width={48} height={40} rx={12} fill="#3F6DFF" />
      <Rect x={40} y={16} width={20} height={16} rx={4} fill="#2557D6" />
      <Rect x={28} y={10} width={44} height={10} rx={5} fill="#FF5C8A" />
      <Path d="M50 52 Q42 62 50 68 Q58 62 50 52 Z" fill="#BFE6FF" />
    </G>
  );
}

function Flower({ wet }) {
  const petal = wet ? "#FF6FB1" : "#D9D3E6";
  return (
    <G>
      <Path d="M50 50 L50 80" stroke={wet ? "#2BC46E" : "#B5C9B9"} strokeWidth={6} />
      {[0, 72, 144, 216, 288].map((a) => (
        <Circle
          key={a}
          cx={50 + 15 * Math.cos(((a - 90) * Math.PI) / 180)}
          cy={42 + 15 * Math.sin(((a - 90) * Math.PI) / 180)}
          r={wet ? 11 : 8}
          fill={petal}
        />
      ))}
      <Circle cx={50} cy={42} r={wet ? 10 : 7} fill={wet ? "#FFD43B" : "#E9E4F2"} />
    </G>
  );
}

function Tile({ base, turns, size, wetOrder, kind, locked, onPress }) {
  const angle = useSharedValue(turns * 90);
  const wet = useSharedValue(wetOrder >= 0 ? 1 : 0);

  useEffect(() => {
    angle.set(withSpring(turns * 90, { damping: 14, stiffness: 220 }));
  }, [turns, angle]);
  useEffect(() => {
    // Water runs outward from the tap: each pipe fills a beat after the one before.
    wet.set(
      wetOrder >= 0 ? withDelay(wetOrder * 28, withTiming(1, { duration: 140 })) : withTiming(0),
    );
  }, [wetOrder, wet]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  const water = useAnimatedStyle(() => ({ opacity: wet.value }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        kind === "tap"
          ? "Water tap"
          : kind === "flower"
            ? "Flower"
            : locked
              ? "Bolted pipe"
              : "Pipe"
      }
      style={{ width: size, height: size }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: locked ? "#E4DEF0" : kind === "pipe" ? "#F4F1FA" : "#E3F4FF",
          overflow: "hidden",
        }}
      >
        <Animated.View style={[{ position: "absolute", width: size, height: size }, spin]}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <PipeShape mask={base} color={DRY} inner={DRY_DARK} />
          </Svg>
          <Animated.View style={[{ position: "absolute", width: size, height: size }, water]}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
              <PipeShape mask={base} color={WATER} inner={WATER_LIGHT} />
            </Svg>
          </Animated.View>
        </Animated.View>
        {(kind !== "pipe" || locked) && (
          <Svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={{ position: "absolute" }}
            pointerEvents="none"
          >
            {kind === "tap" && <Tap />}
            {kind === "flower" && <Flower wet={wetOrder >= 0} />}
            {locked &&
              [
                [14, 14],
                [86, 14],
                [14, 86],
                [86, 86],
              ].map(([x, y]) => <Circle key={`${x}${y}`} cx={x} cy={y} r={6} fill="#8A7FA8" />)}
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

export default function PipeFlow() {
  const levels = useMemo(() => getLevels(), []);
  const progress = useGameStore((s) => s.levels?.[GAME.id] ?? NO_PROGRESS);
  const recordLevel = useGameStore((s) => s.recordLevel);
  const recordGame = useGameStore((s) => s.recordGame);

  const [levelIdx, setLevelIdx] = useState(null); // null = level select
  const [turns, setTurns] = useState([]);
  const [taps, setTaps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [result, setResult] = useState(null);
  const [area, setArea] = useState(null);

  const level = levelIdx == null ? null : levels[levelIdx];
  const n = levelIdx == null ? 0 : levelIdx + 1;
  const hasNext = levelIdx != null && levelIdx < levels.length - 1;
  const running = level != null && !solved && taps > 0;

  const masks = useMemo(
    () => (level ? level.start.map((m, i) => rotate(m, turns[i] ?? 0)) : []),
    [level, turns],
  );
  // BFS order of the water, so tiles can fill one after another.
  const wetOrder = useMemo(() => {
    if (!level) return [];
    const order = new Array(masks.length).fill(-1);
    [...flow(level.cols, level.rows, masks, level.source)].forEach((cell, k) => {
      order[cell] = k;
    });
    return order;
  }, [level, masks]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const startLevel = useCallback(
    (i) => {
      setLevelIdx(i);
      setTurns(new Array(levels[i].start.length).fill(0));
      setTaps(0);
      setSeconds(0);
      setSolved(false);
      setResult(null);
      sfx("go");
    },
    [levels],
  );

  const tap = (i) => {
    if (solved) return;
    if (i === level.source || i === level.flower || level.locked.has(i)) {
      haptic.select();
      return;
    }
    haptic.tap();
    sfx("flip");
    const nextTurns = turns.map((t, k) => (k === i ? t + 1 : t));
    const nextTaps = taps + 1;
    setTurns(nextTurns);
    setTaps(nextTaps);

    const nextMasks = level.start.map((m, k) => rotate(m, nextTurns[k]));
    if (!flow(level.cols, level.rows, nextMasks, level.source).has(level.flower)) return;

    setSolved(true);
    haptic.success();
    sfx("solved");
    const stars = starsFor(nextTaps, level.par);
    const score = Math.max(1, 1000 * stars - nextTaps * 5 - seconds);
    const { prevStars } = recordLevel(GAME.id, n, stars, score);
    const total = totalStars(useGameStore.getState().levels[GAME.id]);
    const gained = Math.max(0, stars - prevStars);
    const outcome = recordGame(GAME.id, total, { xp: 10 + gained * 12 });
    setTimeout(
      () =>
        setResult({
          stars,
          isNewBest: stars > prevStars,
          xpGained: outcome.xpGained,
          levelUp: outcome.levelUp,
        }),
      1500,
    );
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
            blurb="Tap pipes to turn them and lead the water from the tap to the flower."
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

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  const tile = area
    ? Math.floor(
        Math.min(
          (area.w - 12 - GAP * (level.cols - 1)) / level.cols,
          (area.h - 12 - GAP * (level.rows - 1)) / level.rows,
          84,
        ),
      )
    : 0;

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={`Level ${n}`}
        score={taps}
        scoreLabel="Taps"
        best={progress[n]?.stars ? "⭐".repeat(progress[n].stars) : undefined}
      />

      <View className="mt-4 flex-row items-center justify-between px-5">
        <View>
          <Text className="font-body-black text-sm text-ink">
            ⏱ {mm}:{ss}
          </Text>
          <Text className="font-body-bold text-xs text-ink-soft">
            {level.name} · par {level.par} taps
          </Text>
        </View>
        {level.locked.size > 0 && (
          <View className="rounded-full bg-white px-3 py-1.5">
            <Text className="font-body-bold text-xs text-ink">
              🔩 Bolted pipes are already right
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
                  padding: 6,
                  borderRadius: 18,
                  backgroundColor: "#FFFFFF",
                  width: tile * level.cols + GAP * (level.cols - 1) + 12,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: GAP,
                },
                cardShadow,
              ]}
            >
              {level.start.map((base, i) => (
                <Tile
                  key={i}
                  base={base}
                  turns={turns[i] ?? 0}
                  size={tile}
                  wetOrder={wetOrder[i]}
                  kind={i === level.source ? "tap" : i === level.flower ? "flower" : "pipe"}
                  locked={level.locked.has(i)}
                  onPress={() => tap(i)}
                />
              ))}
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
          title="The flower is watered!"
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
                {taps} taps (par {level.par}) · {mm}:{ss}
              </Text>
            </View>
          }
        />
      )}
    </GradientScreen>
  );
}
