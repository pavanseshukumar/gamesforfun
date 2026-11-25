import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";

import { IconButton } from "../../components/Buttons";
import Confetti from "../../components/Confetti";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import LevelGrid, { Stars, totalStars } from "../../components/LevelGrid";
import LevelsHeader from "../../components/LevelsHeader";
import Mascot from "../../components/Mascot";
import { getLevels, LEVEL_NAMES } from "../../games/paint/levels";
import { isPainted, starsFor, step } from "../../games/paint/logic";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("paint");
// Stable fallback: a fresh {} per render would make the store selector loop forever.
const NO_PROGRESS = {};
const PAD = 8;

/** Rainbow colour for the k-th painted cell of n. */
const paintColour = (k, n, light = false) =>
  `hsl(${Math.round((k / Math.max(1, n - 1)) * 300)}, 90%, ${light ? 86 : 62}%)`;

export default function PathPainter() {
  const levels = useMemo(() => getLevels(), []);
  const progress = useGameStore((s) => s.levels?.[GAME.id] ?? NO_PROGRESS);
  const recordLevel = useGameStore((s) => s.recordLevel);
  const recordGame = useGameStore((s) => s.recordGame);

  const [levelIdx, setLevelIdx] = useState(null); // null = level select
  const [path, setPath] = useState([]);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [result, setResult] = useState(null);
  const [area, setArea] = useState(null);

  const level = levelIdx == null ? null : levels[levelIdx];
  const n = levelIdx == null ? 0 : levelIdx + 1;
  const hasNext = levelIdx != null && levelIdx < levels.length - 1;

  const tile =
    level && area
      ? Math.floor(Math.min((area.w - PAD * 2) / level.cols, (area.h - PAD * 2) / level.rows, 76))
      : 0;

  // Gesture callbacks read the latest state through refs.
  const live = useRef({ path: [], moves: 0, solved: true, level: null, tile: 0 });
  useEffect(() => {
    live.current = { path, moves, solved, level, tile };
  }, [path, moves, solved, level, tile]);

  const headX = useSharedValue(0);
  const headY = useSharedValue(0);
  const head = path[path.length - 1];
  useEffect(() => {
    if (!level || head == null || !tile) return;
    headX.set(withSpring((head % level.cols) * tile, { damping: 16, stiffness: 260 }));
    headY.set(withSpring(Math.floor(head / level.cols) * tile, { damping: 16, stiffness: 260 }));
  }, [head, level, tile, headX, headY]);
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: headX.value }, { translateY: headY.value }],
  }));

  const startLevel = useCallback(
    (i) => {
      setLevelIdx(i);
      setPath([levels[i].start]);
      setMoves(0);
      setSolved(false);
      setResult(null);
      sfx("go");
    },
    [levels],
  );

  const finish = useCallback(
    (finalMoves) => {
      const lvl = live.current.level;
      const levelNo = levels.indexOf(lvl) + 1;
      setSolved(true);
      haptic.success();
      sfx("solved");
      const stars = starsFor(finalMoves, lvl.open);
      const score = Math.max(1, 1000 * stars - Math.max(0, finalMoves - lvl.open) * 10);
      const { prevStars } = recordLevel(GAME.id, levelNo, stars, score);
      const total = totalStars(useGameStore.getState().levels[GAME.id]);
      const gained = Math.max(0, stars - prevStars);
      const outcome = recordGame(GAME.id, total, { xp: 10 + gained * 12 });
      setTimeout(
        () =>
          setResult({
            stars,
            moves: finalMoves,
            isNewBest: stars > prevStars,
            xpGained: outcome.xpGained,
            levelUp: outcome.levelUp,
          }),
        1400,
      );
    },
    [levels, recordGame, recordLevel],
  );

  const cellAt = (x, y) => {
    const { level: lvl, tile: t } = live.current;
    if (!lvl || !t) return -1;
    const cx = Math.floor((x - PAD) / t);
    const cy = Math.floor((y - PAD) / t);
    if (cx < 0 || cy < 0 || cx >= lvl.cols || cy >= lvl.rows) return -1;
    return cy * lvl.cols + cx;
  };

  /** Finger down: tapping a painted cell cuts the line back to it. */
  const touchDown = (x, y) => {
    const s = live.current;
    if (s.solved) return;
    const cell = cellAt(x, y);
    const at = s.path.indexOf(cell);
    if (at >= 0 && at < s.path.length - 1) {
      const cut = s.path.slice(0, at + 1);
      live.current = { ...s, path: cut };
      setPath(cut);
      haptic.select();
      sfx("whoosh");
    }
  };

  /** Finger moves over a cell: extend or step back. */
  const touchMove = (x, y) => {
    const s = live.current;
    if (s.solved) return;
    const cell = cellAt(x, y);
    if (cell < 0) return;
    const res = step(s.level.cols, s.level.walls, s.path, cell);
    if (!res.added) return;
    const nextMoves = s.moves + (res.added > 0 ? 1 : 0);
    live.current = { ...s, path: res.path, moves: nextMoves };
    setPath(res.path);
    setMoves(nextMoves);
    if (res.added > 0) {
      haptic.tap();
      sfx(popFor(1 + Math.floor((res.path.length / s.level.open) * 4)));
    }
    if (isPainted(res.path, s.level.open)) {
      live.current = { ...live.current, solved: true };
      finish(nextMoves);
    }
  };

  const paint = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => touchDown(e.x, e.y),
    onUpdate: (e) => touchMove(e.x, e.y),
  });

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
            blurb="Drag one line through every square without crossing it. Go back to undo!"
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

  const order = new Map(path.map((c, k) => [c, k]));
  const centre = (i) => [
    PAD + (i % level.cols) * tile + tile / 2,
    PAD + Math.floor(i / level.cols) * tile + tile / 2,
  ];
  const boardW = tile * level.cols + PAD * 2;
  const boardH = tile * level.rows + PAD * 2;

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={`Level ${n}`}
        score={moves}
        scoreLabel="Moves"
        best={progress[n]?.stars ? "⭐".repeat(progress[n].stars) : undefined}
      />

      <View className="mt-4 flex-row items-center justify-between px-5">
        <View>
          <Text className="font-body-black text-sm text-ink">
            🎨 {path.length} / {level.open} painted
          </Text>
          <Text className="font-body-bold text-xs text-ink-soft">{level.name}</Text>
        </View>
        <View className="rounded-full bg-white px-3 py-1.5">
          <Text className="font-body-bold text-xs text-ink">Tap a painted square to go back</Text>
        </View>
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
            <GestureDetector gesture={paint}>
              <View
                style={[
                  { width: boardW, height: boardH, borderRadius: 22, backgroundColor: "#FFFFFF" },
                  cardShadow,
                ]}
              >
                {/* squares */}
                {Array.from({ length: level.cols * level.rows }, (_, i) => {
                  const wall = level.walls.has(i);
                  const k = order.get(i);
                  return (
                    <View
                      key={i}
                      accessibilityLabel={
                        wall ? "Wall" : k != null ? "Painted square" : "Empty square"
                      }
                      style={{
                        position: "absolute",
                        left: PAD + (i % level.cols) * tile + 3,
                        top: PAD + Math.floor(i / level.cols) * tile + 3,
                        width: tile - 6,
                        height: tile - 6,
                        borderRadius: tile * 0.24,
                        backgroundColor: wall
                          ? "#3B3557"
                          : k != null
                            ? paintColour(k, level.open, true)
                            : "#F2EEF8",
                      }}
                    />
                  );
                })}
                {/* the painted line */}
                <Svg
                  width={boardW}
                  height={boardH}
                  style={{ position: "absolute" }}
                  pointerEvents="none"
                >
                  {path.slice(1).map((c, k) => {
                    const [x1, y1] = centre(path[k]);
                    const [x2, y2] = centre(c);
                    return (
                      <Line
                        key={`${path[k]}-${c}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={paintColour(k, level.open)}
                        strokeWidth={tile * 0.34}
                        strokeLinecap="round"
                      />
                    );
                  })}
                  {(() => {
                    const [sx, sy] = centre(level.start);
                    return (
                      <Circle cx={sx} cy={sy} r={tile * 0.2} fill={paintColour(0, level.open)} />
                    );
                  })()}
                </Svg>
                {/* the painter rides the head of the line */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    { position: "absolute", left: PAD + tile * 0.12, top: PAD + tile * 0.02 },
                    headStyle,
                  ]}
                >
                  <Mascot
                    variant={GAME.mascot}
                    size={tile * 0.76}
                    mood={solved ? "cheer" : "happy"}
                    animated={false}
                  />
                </Animated.View>
              </View>
            </GestureDetector>
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
          title="Masterpiece!"
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
                {result.moves} moves for {level.open} squares
              </Text>
            </View>
          }
        />
      )}
    </GradientScreen>
  );
}
