import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

import { IconButton } from "../../components/Buttons";
import Confetti from "../../components/Confetti";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import LevelsHeader from "../../components/LevelsHeader";
import LevelGrid, { Stars, totalStars } from "../../components/LevelGrid";
import Mascot from "../../components/Mascot";
import { getLevels, LEVEL_NAMES } from "../../games/maze/levels";
import { DIRS, E, N, openings, run, S, scoreFor, starsFor, W, xyOf } from "../../games/maze/logic";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("maze");
const NO_PROGRESS = {};
const CELL_MS = 55; // time to cross one cell
const WALL = "#1F6F66";

/** All walls of a maze as one SVG path. */
function wallPath(maze, cell) {
  let d = "";
  maze.walls.forEach((w, i) => {
    const [x, y] = xyOf(maze, i);
    const X = x * cell;
    const Y = y * cell;
    if (w & N) d += `M${X} ${Y}H${X + cell}`;
    if (w & W) d += `M${X} ${Y}V${Y + cell}`;
    if (y === maze.rows - 1 && w & S) d += `M${X} ${Y + cell}H${X + cell}`;
    if (x === maze.cols - 1 && w & E) d += `M${X + cell} ${Y}V${Y + cell}`;
  });
  return d;
}

function KeyIcon({ size }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(
      withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [bob]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -size * 0.12 * bob.value }, { rotate: `${-20 + 20 * bob.value}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Ionicons name="key" size={size} color="#FFB800" />
    </Animated.View>
  );
}

function Portal({ size, locked }) {
  const gid = `portal-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1));
  }, [spin]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute" }, style]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={locked ? "#D8D8E0" : "#FFF6B0"} />
              <Stop offset="0.6" stopColor={locked ? "#B5B5C3" : "#B98CFF"} />
              <Stop offset="1" stopColor={locked ? "#8E8EA0" : "#6B4CFF"} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={44} fill={`url(#${gid})`} />
          <Path
            d="M50 14 A36 36 0 0 1 86 50"
            stroke="#FFFFFF"
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            opacity={0.7}
          />
        </Svg>
      </Animated.View>
      {locked && <Ionicons name="lock-closed" size={size * 0.45} color="#FFFFFF" />}
    </View>
  );
}

/**
 * Dark levels: a ring with a huge border leaves a clear circle around Dash and
 * blacks out everything else. It rides the same transform as the mascot.
 */
function Darkness({ cell, boardW, boardH, pipStyle }) {
  const lit = cell * 2.3;
  const border = Math.hypot(boardW, boardH) * 1.2;
  const outer = lit + border;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: cell / 2 - outer,
          top: cell / 2 - outer,
          width: outer * 2,
          height: outer * 2,
          borderRadius: outer,
          borderWidth: border,
          borderColor: "rgba(26,22,48,0.96)",
        },
        pipStyle,
      ]}
    />
  );
}

export default function MazeDash() {
  const levels = useMemo(() => getLevels(), []);
  const progress = useGameStore((s) => s.levels?.[GAME.id] ?? NO_PROGRESS);
  const recordLevel = useGameStore((s) => s.recordLevel);
  const recordGame = useGameStore((s) => s.recordGame);

  const [levelIdx, setLevelIdx] = useState(null);
  const [hasKey, setHasKey] = useState(false);
  const [visited, setVisited] = useState(() => new Set([0]));
  const [swipes, setSwipes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);
  const [area, setArea] = useState({ w: 340, h: 480 });

  const level = levelIdx == null ? null : levels[levelIdx];
  const n = levelIdx == null ? 0 : levelIdx + 1;
  const hasNext = levelIdx != null && levelIdx < levels.length - 1;
  const cell = level
    ? Math.floor(Math.min((area.w - 12) / level.maze.cols, (area.h - 12) / level.maze.rows))
    : 20;
  const walls = useMemo(() => (level ? wallPath(level.maze, cell) : ""), [level, cell]);

  const px = useSharedValue(0);
  const py = useSharedValue(0);
  const busy = useRef(false);
  const queued = useRef(null);
  const game = useRef({ pos: 0, hasKey: false, swipes: 0, done: false });
  // Lets a queued swipe replay through the latest `move` without self-reference.
  const moveRef = useRef(null);
  const started = swipes > 0 && !done;

  useEffect(() => {
    if (!started) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started]);

  const startLevel = useCallback(
    (i) => {
      const l = levels[i];
      game.current = { pos: l.start, hasKey: false, swipes: 0, done: false };
      busy.current = false;
      queued.current = null;
      setLevelIdx(i);
      setHasKey(false);
      setVisited(new Set([l.start]));
      setSwipes(0);
      setSeconds(0);
      setDone(false);
      setResult(null);
      px.set(0);
      py.set(0);
      sfx("go");
    },
    [levels, px, py],
  );

  const finish = useCallback(
    (totalSwipes) => {
      const stars = starsFor(totalSwipes, level.par);
      const score = scoreFor(totalSwipes, level.par, seconds);
      const { prevStars } = recordLevel(GAME.id, n, stars, score);
      const total = totalStars(useGameStore.getState().levels[GAME.id]);
      const outcome = recordGame(GAME.id, total, {
        xp: 10 + Math.max(0, stars - prevStars) * 12,
        records: { mazeKeyThree: level.key != null && stars === 3 ? 1 : 0 },
      });
      setTimeout(
        () =>
          setResult({
            stars,
            score,
            isNewBest: stars > prevStars,
            xpGained: outcome.xpGained,
            levelUp: outcome.levelUp,
          }),
        900,
      );
    },
    [level, n, recordGame, recordLevel, seconds],
  );

  const move = useCallback(
    (dirName) => {
      const g = game.current;
      if (!level || g.done) return;
      if (busy.current) {
        queued.current = dirName; // remember one swipe made mid-run
        return;
      }
      const stops = [level.exit, g.hasKey ? null : level.key].filter((c) => c != null);
      const path = run(level.maze, g.pos, DIRS[dirName], stops);
      if (!path.length) {
        haptic.select();
        sfx("select");
        return;
      }
      busy.current = true;
      g.swipes += 1;
      setSwipes(g.swipes);
      sfx("whoosh");
      haptic.tap();

      // Animate Pengu cell by cell along the corridor.
      const xs = path.map((c) => xyOf(level.maze, c)[0] * cell);
      const ys = path.map((c) => xyOf(level.maze, c)[1] * cell);
      const t = { duration: CELL_MS, easing: Easing.linear };
      px.set(withSequence(...xs.map((v) => withTiming(v, t))));
      py.set(withSequence(...ys.map((v) => withTiming(v, t))));

      const end = path[path.length - 1];
      g.pos = end;
      setTimeout(
        () => {
          setVisited((v) => new Set([...v, ...path]));
          if (end === level.key && !g.hasKey) {
            g.hasKey = true;
            setHasKey(true);
            haptic.success();
            sfx("star");
          }
          if (end === level.exit) {
            if (level.key != null && !g.hasKey) {
              haptic.error();
              sfx("wrong");
            } else {
              g.done = true;
              setDone(true);
              haptic.success();
              sfx("solved");
              finish(g.swipes);
            }
          } else if (openings(level.maze, end).length === 1) {
            sfx("land"); // bumped into a dead end
          }
          busy.current = false;
          const next = queued.current;
          queued.current = null;
          if (next) moveRef.current?.(next);
        },
        path.length * CELL_MS + 20,
      );
    },
    [cell, finish, level, px, py],
  );

  useEffect(() => {
    moveRef.current = move;
  }, [move]);

  // Arrow keys on web.
  useEffect(() => {
    if (Platform.OS !== "web" || level == null) return undefined;
    const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const onKey = (e) => {
      if (keys[e.key]) {
        e.preventDefault();
        move(keys[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [level, move]);

  const swipe = usePanGesture({
    runOnJS: true,
    minDistance: 10,
    onDeactivate: (e) => {
      const { translationX: dx, translationY: dy } = e;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    },
  });

  const pipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: px.value }, { translateY: py.value }],
  }));

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
            blurb="Swipe and Pengu waddles to the next junction. Grab the key, reach the portal in as few swipes as you can!"
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

  const [kx, ky] = level.key != null ? xyOf(level.maze, level.key) : [0, 0];
  const [ex, ey] = xyOf(level.maze, level.exit);
  const boardW = cell * level.maze.cols;
  const boardH = cell * level.maze.rows;
  const stroke = Math.max(3, cell * 0.16);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={`Level ${n}`}
        score={swipes}
        scoreLabel="Swipes"
        best={progress[n]?.stars ? "⭐".repeat(progress[n].stars) : undefined}
        right={
          <IconButton icon="refresh" label="Restart level" onPress={() => startLevel(levelIdx)} />
        }
      />
      <View className="mt-3 flex-row items-center justify-between px-5">
        <View>
          <Text className="font-body-black text-sm text-ink">
            ⏱ {mm}:{ss}
          </Text>
          <Text className="font-body-bold text-xs text-ink-soft">
            {level.name} · par {level.par} swipes{level.dark ? " · 🔦 dark" : ""}
          </Text>
        </View>
        {level.key != null && (
          <View className="flex-row items-center rounded-full bg-white px-3 py-1.5">
            <Ionicons name="key" size={16} color={hasKey ? "#FFB800" : "#C9C9D2"} />
            <Text className="ml-1 font-body-bold text-xs text-ink">
              {hasKey ? "Got the key!" : "Find the key"}
            </Text>
          </View>
        )}
      </View>

      <GestureDetector gesture={swipe}>
        <View
          style={{
            flex: 1,
            margin: 16,
            marginTop: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
          onLayout={(e) =>
            setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
        >
          <Animated.View entering={ZoomIn.springify().damping(14)} key={levelIdx}>
            <View
              style={[{ padding: 6, borderRadius: 18, backgroundColor: "#FFFFFF" }, cardShadow]}
            >
              <View
                style={{
                  width: boardW,
                  height: boardH,
                  overflow: level.dark ? "hidden" : "visible",
                  borderRadius: level.dark ? 12 : 0,
                }}
              >
                {/* breadcrumbs */}
                {[...visited].map((c) => {
                  const [vx, vy] = xyOf(level.maze, c);
                  return (
                    <View
                      key={c}
                      style={{
                        position: "absolute",
                        left: vx * cell + cell * 0.38,
                        top: vy * cell + cell * 0.38,
                        width: cell * 0.24,
                        height: cell * 0.24,
                        borderRadius: cell,
                        backgroundColor: "rgba(255,111,177,0.35)",
                      }}
                    />
                  );
                })}
                <View
                  style={{
                    position: "absolute",
                    left: ex * cell + cell * 0.08,
                    top: ey * cell + cell * 0.08,
                  }}
                >
                  <Portal size={cell * 0.84} locked={level.key != null && !hasKey} />
                </View>
                {level.key != null && !hasKey && (
                  <View
                    style={{
                      position: "absolute",
                      left: kx * cell + cell * 0.15,
                      top: ky * cell + cell * 0.12,
                    }}
                  >
                    <KeyIcon size={cell * 0.7} />
                  </View>
                )}
                <Svg width={boardW} height={boardH} style={{ position: "absolute" }}>
                  <Path
                    d={walls}
                    stroke={WALL}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                {level.dark && (
                  <>
                    <Darkness cell={cell} boardW={boardW} boardH={boardH} pipStyle={pipStyle} />
                    {/* The exit glows through the dark as a beacon; the key doesn't. */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: ex * cell + cell * 0.08,
                        top: ey * cell + cell * 0.08,
                      }}
                    >
                      <Portal size={cell * 0.84} locked={level.key != null && !hasKey} />
                    </View>
                  </>
                )}
                <Animated.View
                  pointerEvents="none"
                  style={[{ position: "absolute", left: cell * 0.04, top: -cell * 0.08 }, pipStyle]}
                >
                  <Mascot
                    variant={GAME.mascot}
                    size={cell * 0.92}
                    mood={done ? "cheer" : "happy"}
                    animated={false}
                  />
                </Animated.View>
              </View>
            </View>
          </Animated.View>
          {done && <Confetti />}
          {swipes === 0 && (
            <View
              pointerEvents="none"
              className="absolute bottom-0 rounded-full bg-white px-4 py-2"
            >
              <Text className="font-body-bold text-sm text-ink">
                👆 Swipe to run through the maze
              </Text>
            </View>
          )}
        </View>
      </GestureDetector>

      <View className="flex-row justify-center pb-3">
        <IconButton icon="grid-outline" label="All levels" onPress={() => setLevelIdx(null)} />
      </View>

      {result && (
        <GameOverModal
          title="Maze cleared!"
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
                {swipes} swipes (par {level.par}) · {mm}:{ss}
              </Text>
            </View>
          }
        />
      )}
    </GradientScreen>
  );
}
