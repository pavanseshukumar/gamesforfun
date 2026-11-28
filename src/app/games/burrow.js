import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import { BURROW_DEFAULTS } from "../../games/burrow/levels";
import {
  clueFor,
  DEPTH_TIME,
  depthConfig,
  HINT_COST,
  hintCell,
  lineCells,
  makePuzzle,
  nextCombo,
  timeBonus,
  wordAt,
  wordPoints,
} from "../../games/burrow/logic";
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
  "#7FD8A0",
  "#8FC2FF",
  "#C3A2FF",
  "#FF9F7A",
  "#6FD9D0",
  "#F7A6E0",
  "#B5E06A",
];
const GOLD = "#FFD23F";
const DIRT = "#FFF6EA";
const EASE = Easing.inOut(Easing.cubic);
/** Bonus points for clearing a Dig Deeper burrow, per depth. */
const CLEAR_BONUS = 50;

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

/** One letter; it hops when its word is found. */
function Letter({ ch, cell, x, y, pop, picked }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (!pop) return;
    s.set(
      withDelay(
        pop.delay,
        withSequence(
          withTiming(1.45, { duration: 130, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 220, easing: EASE }),
        ),
      ),
    );
  }, [pop, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: cell,
        height: cell,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View style={style}>
        <Text
          style={{
            fontFamily: "Outfit_800ExtraBold",
            fontSize: cell * 0.46,
            color: picked ? "#4B1FA8" : "#3B2A22",
          }}
        >
          {ch}
        </Text>
      </Animated.View>
    </View>
  );
}

/** Kit's sniff: a pulsing ring on the first letter of a word. */
function SniffRing({ x, y, cell }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 700, easing: EASE }), -1, true));
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.5 + 0.5 * p.value,
    transform: [{ scale: 0.85 + 0.2 * p.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x + cell * 0.06,
          top: y + cell * 0.06,
          width: cell * 0.88,
          height: cell * 0.88,
          borderRadius: cell,
          borderWidth: 3,
          borderColor: "#FF7E3D",
          backgroundColor: "rgba(255,126,61,0.15)",
        },
        style,
      ]}
    />
  );
}

/** "+60 ×2" rising from a found word. */
function Floater({ text, x, y, gold }) {
  const up = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    up.set(withTiming(-44, { duration: 850, easing: Easing.out(Easing.cubic) }));
    o.set(withDelay(500, withTiming(0, { duration: 350 })));
  }, [up, o]);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: up.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: x - 80, top: y - 22, width: 160, alignItems: "center" },
        style,
      ]}
    >
      <View
        style={cardShadow}
        className={`rounded-full px-3 py-1 ${gold ? "bg-[#FFD23F]" : "bg-white"}`}
      >
        <Text style={[display(20), { color: gold ? "#1A1A1A" : "#D9621F" }]}>{text}</Text>
      </View>
    </Animated.View>
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
          Swipe across the letters (or tap the first and last){"\n"}to dig up Kit&apos;s hidden
          words. Quick finds build{"\n"}a 🔥 combo, the ✨ treasure word scores double,{"\n"}and
          every cleared burrow digs deeper: +{DEPTH_TIME} s!
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

/** Between Dig Deeper burrows. */
function ClearedCard({ depth, bonus, onNext }) {
  return (
    <View
      className="absolute inset-0 items-center justify-center px-8"
      style={{ backgroundColor: "rgba(255,246,234,0.7)" }}
    >
      <Animated.View entering={ZoomIn.duration(300)} style={{ width: "100%" }}>
        <View style={cardShadow} className="items-center rounded-3xl bg-white px-6 py-6">
          <Mascot variant="kit" size={100} mood="cheer" />
          <Text style={[display(34), { marginTop: 4 }]}>Burrow {depth + 1} cleared!</Text>
          <Text className="mt-1 font-body-bold text-sm text-ink-soft">
            +{bonus} pts · +{DEPTH_TIME} s on the clock
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton title="Dig deeper" icon="arrow-down" onPress={onNext} />
          </View>
        </View>
      </Animated.View>
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
  const endless = !challenge.level;

  const [phase, setPhase] = useState("ready"); // ready | playing | cleared | over
  const [depth, setDepth] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [rules, setRules] = useState(cfg); // this burrow's config
  const [found, setFound] = useState([]); // words, in the order found
  const [selection, setSelection] = useState(null); // cells under the finger
  const [anchor, setAnchor] = useState(-1); // tap mode: the first letter tapped
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [hintsLeft, setHintsLeft] = useState(cfg.hints);
  const [sniff, setSniff] = useState(null); // { cell, n }
  const [pops, setPops] = useState({}); // cell → { n, delay }
  const [floater, setFloater] = useState(null);
  const [timeLeft, setTimeLeft] = useState(cfg.duration);
  const [say, setSay] = useState("");
  const [mood, setMood] = useState("happy");
  const [clearBonus, setClearBonus] = useState(0);
  const [area, setArea] = useState(null);
  const [result, setResult] = useState(null);
  const endAt = useRef(0);
  const startedAt = useRef(0);
  const lastFindAt = useRef(0);
  const pausedLeft = useRef(0);
  const hinted = useRef([]);
  const startCell = useRef(-1);
  const downCell = useRef(-1);
  const live = useRef({ found: [], score: 0, depth: 0 }); // for the clock, outside render

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
          if (!endless) {
            const res = challenge.complete(stats, {});
            setResult({ ...res, challenge: true });
            return;
          }
          const outcome = recordGame(GAME.id, total, {
            xp: 10 + Math.floor(total / 8),
            records: { burrowDepth: live.current.depth + 1 },
          });
          setResult({ ...outcome, ...stats, depth: live.current.depth });
        },
        allFound ? 900 : 400,
      );
    },
    [cfg.duration, challenge, endless, recordGame],
  );

  // The clock (paused between Dig Deeper burrows).
  useEffect(() => {
    if (phase !== "playing" || !cfg.duration) return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, (endAt.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        sfx("gameover");
        setSay("Time's up!");
        setMood("wow");
        finish(false, live.current.found, live.current.score);
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, cfg.duration, finish]);

  const newBurrow = (d, seconds, points) => {
    const r = endless ? { ...cfg, ...depthConfig(d) } : cfg;
    const p = makePuzzle(r, (Date.now() % 100000) + 1 + d * 977);
    setRules(r);
    setPuzzle(p);
    setDepth(d);
    setFound([]);
    setSelection(null);
    setAnchor(-1);
    setCombo(1);
    setHintsLeft(r.hints);
    setSniff(null);
    setPops({});
    setFloater(null);
    hinted.current = [];
    lastFindAt.current = 0;
    live.current = { found: [], score: points, depth: d };
    setSay(endless ? `Burrow ${d + 1}: ${p.theme}` : `Theme: ${p.theme}`);
    setMood("happy");
    endAt.current = Date.now() + seconds * 1000;
    setTimeLeft(seconds);
    setPhase("playing");
  };

  const start = () => {
    startedAt.current = Date.now();
    setScore(0);
    setResult(null);
    sfx("go");
    newBurrow(0, cfg.duration, 0);
  };

  const digDeeper = () => {
    sfx("whoosh");
    newBurrow(depth + 1, pausedLeft.current + DEPTH_TIME, score);
  };

  const cellAt = (x, y) => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    if (cx < 0 || cy < 0 || cx >= size || cy >= size) return -1;
    return cy * size + cx;
  };
  const centre = (cells) => {
    const a = cells[0];
    const b = cells[cells.length - 1];
    return {
      x: (((a % size) + (b % size)) / 2) * cell + cell / 2,
      y: ((Math.floor(a / size) + Math.floor(b / size)) / 2) * cell + cell / 2,
    };
  };

  const release = (cells) => {
    setSelection(null);
    if (!cells || cells.length < 2 || phase !== "playing") return;
    const word = wordAt(puzzle, cells, found);
    if (!word) {
      haptic.select();
      return;
    }
    const now = Date.now();
    const gap = lastFindAt.current ? (now - lastFindAt.current) / 1000 : Infinity;
    lastFindAt.current = now;
    const nextC = nextCombo(combo, gap);
    const treasure = word === puzzle.treasure;
    const pts = wordPoints(word, { treasure, combo: nextC });
    const nextFound = [...found, word];
    const nextScore = score + pts;
    setFound(nextFound);
    setScore(nextScore);
    setCombo(nextC);
    live.current = { ...live.current, found: nextFound, score: nextScore };
    const n = now;
    const wc = puzzle.words.find((w) => w.word === word).cells;
    setPops((p) => {
      const next = { ...p };
      wc.forEach((c, k) => (next[c] = { n, delay: k * 45 }));
      return next;
    });
    setFloater({
      ...centre(wc),
      text: `+${pts}${nextC > 1 ? ` ×${nextC}` : ""}`,
      gold: treasure,
      n,
    });
    if (sniff && wc.includes(sniff.cell)) setSniff(null);
    haptic.success();
    sfx(treasure ? "star" : popFor(Math.min(4, nextFound.length)));
    const left = puzzle.words.length - nextFound.length;
    if (treasure) setSay("✨ Treasure word! Double points");
    else if (nextC > 1) setSay(`🔥 Combo ×${nextC}! Keep digging`);
    else setSay(left ? `${word}! ${left} to go` : "");
    setMood(treasure || nextC > 1 ? "cheer" : "happy");

    if (left) return;
    sfx("solved");
    if (!endless) {
      setSay("You found them all! 🎉");
      finish(true, nextFound, nextScore);
      return;
    }
    // Dig Deeper: pause the clock and bank a bonus.
    const bonus = CLEAR_BONUS * (depth + 1);
    pausedLeft.current = Math.max(0, (endAt.current - Date.now()) / 1000);
    setClearBonus(bonus);
    setScore(nextScore + bonus);
    live.current = { ...live.current, score: nextScore + bonus };
    setTimeout(() => setPhase("cleared"), 700);
  };

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 6,
    // Remember where the finger went down: by the time the pan activates it has
    // already moved, and on web the translation then reads 0.
    onBegin: (e) => {
      downCell.current = cellAt(e.x, e.y);
    },
    onActivate: (e) => {
      setAnchor(-1);
      startCell.current =
        downCell.current >= 0
          ? downCell.current
          : cellAt(e.x - e.translationX, e.y - e.translationY);
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
  // Tap the first letter, then the last.
  const tap = useTapGesture({
    runOnJS: true,
    onActivate: (e) => {
      if (phase !== "playing") return;
      const c = cellAt(e.x, e.y);
      if (c < 0) return;
      haptic.select();
      if (anchor < 0) {
        setAnchor(c);
        setSelection([c]);
      } else if (c === anchor) {
        setAnchor(-1);
        setSelection(null);
      } else {
        const cells = lineCells(size, anchor, c);
        setAnchor(-1);
        release(cells);
      }
    },
  });
  const gesture = useExclusiveGestures(pan, tap);

  const sniffOut = () => {
    if (phase !== "playing" || hintsLeft <= 0) return;
    const c = hintCell(puzzle, found, hinted.current);
    if (c < 0) return;
    hinted.current = [...hinted.current, c];
    setHintsLeft((h) => h - 1);
    const nextScore = Math.max(0, score - HINT_COST);
    setScore(nextScore);
    live.current = { ...live.current, score: nextScore };
    setSniff({ cell: c, n: Date.now() });
    setSay("👃 Kit sniffs… a word starts here!");
    setMood("wow");
    sfx("whoosh");
    haptic.tap();
  };

  const wordColour = (word) => {
    if (word === puzzle?.treasure) return GOLD;
    const k = found.indexOf(word);
    return HIGHLIGHTS[(k < 0 ? 0 : k) % HIGHLIGHTS.length];
  };
  const totalTime = endless ? cfg.duration + depth * DEPTH_TIME : cfg.duration;
  const ratio = cfg.duration ? Math.min(1, timeLeft / totalTime) : 1;

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
            <View className="flex-shrink flex-row items-center">
              <Mascot variant="kit" size={34} mood={mood} animated={false} />
              <Text numberOfLines={1} className="ml-1 flex-shrink font-body-black text-sm text-ink">
                {say}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {endless && (
                <View className="rounded-full bg-white px-2.5 py-1">
                  <Text className="font-body-black text-xs text-ink">⛏ {depth + 1}</Text>
                </View>
              )}
              {combo > 1 && phase === "playing" && (
                <Text className="font-body-black text-xs text-[#E8743B]">🔥×{combo}</Text>
              )}
              {cfg.duration > 0 && (
                <Text
                  className={`font-body-black text-sm ${timeLeft <= 10 && phase === "playing" ? "text-[#E5484D]" : "text-ink"}`}
                >
                  ⏱ {Math.ceil(timeLeft)}s
                </Text>
              )}
            </View>
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
          <Animated.View key={`${depth}-${puzzle.grid.join("")}`} entering={ZoomIn.duration(300)}>
            <View
              style={[cardShadow, { padding: 8, borderRadius: 26, backgroundColor: "#FFFFFF" }]}
            >
              <GestureDetector gesture={gesture}>
                <View
                  accessibilityLabel="Letter grid"
                  style={{ width: board, height: board, borderRadius: 18, backgroundColor: DIRT }}
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
                        opacity={w.word === puzzle.treasure ? 0.9 : 0.75}
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
                  {sniff && (
                    <SniffRing
                      key={sniff.n}
                      x={(sniff.cell % size) * cell}
                      y={Math.floor(sniff.cell / size) * cell}
                      cell={cell}
                    />
                  )}
                  {puzzle.grid.map((ch, i) => (
                    <Letter
                      key={i}
                      ch={ch}
                      cell={cell}
                      x={(i % size) * cell}
                      y={Math.floor(i / size) * cell}
                      pop={pops[i]}
                      picked={selection?.includes(i) || anchor === i}
                    />
                  ))}
                  {floater && <Floater key={floater.n} {...floater} />}
                </View>
              </GestureDetector>
            </View>
          </Animated.View>
        )}
        {phase === "cleared" && <ClearedCard depth={depth} bonus={clearBonus} onNext={digDeeper} />}
      </View>

      {phase !== "ready" && puzzle && (
        <View className="px-5 pb-4">
          <View className="flex-row flex-wrap justify-center gap-2">
            {puzzle.words.map((w) => {
              const got = found.includes(w.word);
              const gold = w.word === puzzle.treasure;
              return (
                <View
                  key={w.word}
                  style={{
                    backgroundColor: got ? wordColour(w.word) : "rgba(255,255,255,0.85)",
                    borderWidth: 2,
                    borderColor: gold ? GOLD : "transparent",
                  }}
                  className="rounded-full px-3 py-1"
                >
                  <Text className={`font-body-black text-xs text-ink ${got ? "line-through" : ""}`}>
                    {gold ? "✨ " : ""}
                    {got || phase === "over" ? w.word : clueFor(w.word, rules.mystery)}
                  </Text>
                </View>
              );
            })}
          </View>
          {phase === "playing" && rules.hints > 0 && (
            <View className="mt-3 items-center">
              <PressableScale
                onPress={sniffOut}
                accessibilityLabel={`Sniff for a word, ${hintsLeft} left`}
                accessibilityState={{ disabled: hintsLeft === 0 }}
              >
                <View
                  style={hintsLeft ? cardShadow : null}
                  className={`flex-row items-center rounded-full px-4 py-2 ${hintsLeft ? "bg-white" : "bg-white/50"}`}
                >
                  <Ionicons name="paw" size={16} color={hintsLeft ? "#E8743B" : "#B9B0D0"} />
                  <Text
                    className={`ml-1.5 font-body-black text-xs ${hintsLeft ? "text-ink" : "text-ink-mute"}`}
                  >
                    Sniff ×{hintsLeft} · −{HINT_COST} pts
                  </Text>
                </View>
              </PressableScale>
            </View>
          )}
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
          title="Time's up!"
          game={GAME}
          score={score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              Dug {result.depth + 1} {result.depth ? "burrows" : "burrow"} deep · {result.found} of{" "}
              {puzzle.words.length} words in the last one
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
