import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import { BURROW_DEFAULTS } from "../../games/burrow/levels";
import { lineCells, makePuzzle, timeBonus, wordAt, wordPoints } from "../../games/burrow/logic";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("burrow");
const METRIC_UNITS = { found: "words", score: "pts", seconds: "seconds" };
const HIGHLIGHTS = [
  "#FF8FC0",
  "#FFC55C",
  "#7FD8A0",
  "#8FC2FF",
  "#C3A2FF",
  "#FF9F7A",
  "#6FD9D0",
  "#F7A6E0",
];
const DIRT = "#FFF6EA";

/** A rounded band over a line of cells (a found word or the current swipe). */
function Band({ cells, size, cell, colour, opacity = 0.75 }) {
  if (!cells?.length) return null;
  const a = cells[0];
  const b = cells[cells.length - 1];
  const ax = (a % size) * cell + cell / 2;
  const ay = Math.floor(a / size) * cell + cell / 2;
  const bx = (b % size) * cell + cell / 2;
  const by = Math.floor(b / size) * cell + cell / 2;
  const len = Math.hypot(bx - ax, by - ay) + cell * 0.82;
  const thick = cell * 0.78;
  const angle = Math.atan2(by - ay, bx - ax);
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: (ax + bx) / 2 - len / 2,
        top: (ay + by) / 2 - thick / 2,
        width: len,
        height: thick,
        borderRadius: thick / 2,
        backgroundColor: colour,
        opacity,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

function StartCard({ onPress, challenge }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.06, { duration: 650 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <View className="items-center px-6">
      <Animated.View entering={ZoomIn.duration(320)}>
        <Mascot variant="kit" size={130} mood="wow" />
      </Animated.View>
      <Text style={[display(40), { marginTop: 6 }]}>Dig in!</Text>
      {challenge.level ? (
        <ChallengeGoal level={challenge.level} n={challenge.n} />
      ) : (
        <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
          Kit hid some words in the burrow.{"\n"}Swipe in a straight line across the letters
          {"\n"}to dig each one up before time runs out!
        </Text>
      )}
      <Animated.View entering={FadeIn.delay(200)}>
        <Animated.View style={[{ marginTop: 16 }, style]}>
          <PrimaryButton title="Start digging" icon="search" onPress={onPress} />
        </Animated.View>
      </Animated.View>
      {!challenge.level && (
        <LevelsButton
          gameId={GAME.id}
          count={challenge.count}
          onPress={challenge.openLevels}
          style={{ marginTop: 10 }}
        />
      )}
    </View>
  );
}

// Remount per level so every level starts from a clean slate.
export default function BurrowScreen() {
  const { level } = useLocalSearchParams();
  return <Burrow key={level ?? "endless"} />;
}

function Burrow() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;
  const cfg = useMemo(() => ({ ...BURROW_DEFAULTS, ...(levelConfig ?? {}) }), [levelConfig]);

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [puzzle, setPuzzle] = useState(null);
  const [found, setFound] = useState([]); // words, in the order found
  const [selection, setSelection] = useState(null); // cells under the finger
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cfg.duration);
  const [say, setSay] = useState("");
  const [area, setArea] = useState(null);
  const [result, setResult] = useState(null);
  const endAt = useRef(0);
  const startedAt = useRef(0);
  const startCell = useRef(-1);
  const live = useRef({ found: [], score: 0 }); // for the clock, which runs outside render

  const size = puzzle?.size ?? cfg.size;
  const board = area ? Math.min(area.w - 32, area.h - 8, 440) : 0;
  const cell = board / size;

  const finish = useCallback(
    (allFound, foundWords, points) => {
      setPhase("over");
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const left = cfg.duration ? Math.max(0, (endAt.current - Date.now()) / 1000) : 0;
      const total = points + (allFound ? timeBonus(left) : 0);
      setScore(total);
      const stats = {
        found: foundWords.length,
        score: total,
        seconds: allFound ? Math.ceil(elapsed) : Infinity,
      };
      setTimeout(
        () => {
          if (challenge.level) {
            const res = challenge.complete(stats, {});
            setResult({ ...res, challenge: true });
            return;
          }
          const outcome = recordGame(GAME.id, total, { xp: 10 + Math.floor(total / 8) });
          setResult({ ...outcome, ...stats, allFound });
        },
        allFound ? 900 : 400,
      );
    },
    [cfg.duration, challenge, recordGame],
  );

  // The clock.
  useEffect(() => {
    if (phase !== "playing" || !cfg.duration) return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, (endAt.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        sfx("gameover");
        finish(false, live.current.found, live.current.score);
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, cfg.duration, finish]);

  const start = () => {
    const p = makePuzzle(cfg, (Date.now() % 100000) + 1);
    setPuzzle(p);
    setFound([]);
    setSelection(null);
    setScore(0);
    live.current = { found: [], score: 0 };
    setResult(null);
    setSay(`Theme: ${p.theme}`);
    startedAt.current = Date.now();
    endAt.current = Date.now() + cfg.duration * 1000;
    setTimeLeft(cfg.duration);
    setPhase("playing");
    sfx("go");
  };

  const cellAt = (x, y) => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    if (cx < 0 || cy < 0 || cx >= size || cy >= size) return -1;
    return cy * size + cx;
  };

  const release = (cells) => {
    setSelection(null);
    if (!cells || cells.length < 2 || phase !== "playing") return;
    const word = wordAt(puzzle, cells, found);
    if (!word) {
      haptic.select();
      return;
    }
    const nextFound = [...found, word];
    const nextScore = score + wordPoints(word);
    setFound(nextFound);
    setScore(nextScore);
    live.current = { found: nextFound, score: nextScore };
    haptic.success();
    sfx(popFor(Math.min(4, nextFound.length)));
    const left = puzzle.words.length - nextFound.length;
    setSay(left ? `${word}! ${left} to go` : "You found them all! 🎉");
    if (!left) {
      sfx("solved");
      finish(true, nextFound, nextScore);
    }
  };

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 2,
    onActivate: (e) => {
      startCell.current = cellAt(e.x - e.translationX, e.y - e.translationY);
      if (startCell.current >= 0) setSelection([startCell.current]);
    },
    onUpdate: (e) => {
      if (startCell.current < 0) return;
      const cur = cellAt(
        Math.max(0, Math.min(board - 1, e.x)),
        Math.max(0, Math.min(board - 1, e.y)),
      );
      if (cur < 0) return;
      const cells = lineCells(size, startCell.current, cur);
      setSelection((prev) => {
        if (prev && prev.length !== cells.length) haptic.select();
        return cells;
      });
    },
    onDeactivate: (e) => {
      if (startCell.current < 0) return release(null);
      const cur = cellAt(
        Math.max(0, Math.min(board - 1, e.x)),
        Math.max(0, Math.min(board - 1, e.y)),
      );
      release(cur < 0 ? null : lineCells(size, startCell.current, cur));
      startCell.current = -1;
    },
  });

  const wordColour = (word) => {
    const k = found.indexOf(word);
    return HIGHLIGHTS[(k < 0 ? 0 : k) % HIGHLIGHTS.length];
  };
  const ratio = cfg.duration ? timeLeft / cfg.duration : 1;

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Burrow"}
        score={score}
        best={challenge.level ? challenge.bestLabel : best}
      />

      {phase !== "ready" && puzzle && (
        <View className="mt-3 px-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Mascot
                variant="kit"
                size={34}
                mood={found.length === puzzle.words.length ? "cheer" : "happy"}
                animated={false}
              />
              <Text className="ml-1 font-body-black text-sm text-ink">{say}</Text>
            </View>
            {cfg.duration > 0 && (
              <Text
                className={`font-body-black text-sm ${timeLeft <= 10 && phase === "playing" ? "text-[#E5484D]" : "text-ink"}`}
              >
                ⏱ {Math.ceil(timeLeft)}s
              </Text>
            )}
          </View>
          {cfg.duration > 0 && (
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
              <View
                style={{
                  width: `${ratio * 100}%`,
                  height: "100%",
                  borderRadius: 99,
                  backgroundColor: ratio < 0.2 ? "#F0453A" : GAME.accent,
                }}
              />
            </View>
          )}
        </View>
      )}

      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {phase === "ready" && <StartCard onPress={start} challenge={challenge} />}
        {phase !== "ready" && puzzle && area && (
          <Animated.View entering={ZoomIn.duration(300)}>
            <View
              style={[cardShadow, { padding: 8, borderRadius: 26, backgroundColor: "#FFFFFF" }]}
            >
              <GestureDetector gesture={pan}>
                <View
                  accessibilityLabel="Letter grid"
                  style={{
                    width: board,
                    height: board,
                    borderRadius: 18,
                    backgroundColor: DIRT,
                  }}
                >
                  {puzzle.words
                    .filter((w) => found.includes(w.word))
                    .map((w) => (
                      <Band
                        key={w.word}
                        cells={w.cells}
                        size={size}
                        cell={cell}
                        colour={wordColour(w.word)}
                      />
                    ))}
                  {phase === "over" &&
                    puzzle.words
                      .filter((w) => !found.includes(w.word))
                      .map((w) => (
                        <Band
                          key={w.word}
                          cells={w.cells}
                          size={size}
                          cell={cell}
                          colour="#B9B0D0"
                          opacity={0.45}
                        />
                      ))}
                  <Band cells={selection} size={size} cell={cell} colour="#9C6BFF" opacity={0.4} />
                  {puzzle.grid.map((ch, i) => (
                    <View
                      key={i}
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: (i % size) * cell,
                        top: Math.floor(i / size) * cell,
                        width: cell,
                        height: cell,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Outfit_800ExtraBold",
                          fontSize: cell * 0.46,
                          color: selection?.includes(i) ? "#4B1FA8" : "#3B2A22",
                        }}
                      >
                        {ch}
                      </Text>
                    </View>
                  ))}
                </View>
              </GestureDetector>
            </View>
          </Animated.View>
        )}
      </View>

      {phase !== "ready" && puzzle && (
        <View className="flex-row flex-wrap justify-center gap-2 px-5 pb-4">
          {puzzle.words.map((w) => {
            const got = found.includes(w.word);
            return (
              <View
                key={w.word}
                style={{ backgroundColor: got ? wordColour(w.word) : "rgba(255,255,255,0.8)" }}
                className="rounded-full px-3 py-1.5"
              >
                <Text className={`font-body-black text-xs text-ink ${got ? "line-through" : ""}`}>
                  {w.word}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {phase === "over" && result?.challenge && (
        <ChallengeResult
          game={GAME}
          challenge={challenge}
          result={result}
          unit={METRIC_UNITS[challenge.level.metric]}
        />
      )}
      {phase === "over" && result && !result.challenge && (
        <GameOverModal
          title={result.allFound ? "Burrow cleared!" : "Time's up!"}
          game={GAME}
          score={score}
          best={best}
          result={result}
          mood={result.allFound ? "success" : undefined}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.found} of {puzzle.words.length} words found
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
