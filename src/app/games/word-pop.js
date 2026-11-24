import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import ScorePopup from "../../components/ScorePopup";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { WORD_POP_DEFAULTS } from "../../games/wordpop/levels";
import {
  checkWord,
  hasRareLetter,
  LETTER_POINTS,
  nextLetter,
  wordLength,
  wordScore,
} from "../../games/wordpop/logic";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display, INK } from "../../theme";

const GAME = getGame("word-pop");
const METRIC_UNITS = { score: "pts", words: "words", longest: "letters" };
const SIZE = 58;
const LANES = 5;

let bubbleId = 0;
let popupId = 0;

function Bubble({ bubble, fieldH, selected, onTap, onEscape }) {
  const startY = fieldH + 10;
  const endY = -SIZE - 10;
  // Opening bubbles start part-way up so the board begins full.
  const y = useSharedValue(startY - (bubble.head ?? 0) * (startY - endY));
  const sway = useSharedValue(0);

  // Rise, pausing while selected so the player has time to think.
  useEffect(() => {
    if (selected) {
      cancelAnimation(y);
      return;
    }
    const speed = (startY - endY) / bubble.duration; // px per ms
    const remaining = Math.max(0, y.get() - endY);
    y.set(
      withTiming(endY, { duration: remaining / speed, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(onEscape, bubble.id);
      }),
    );
  }, [selected, bubble.duration, bubble.id, startY, endY, y, onEscape]);

  useEffect(() => {
    sway.set(
      withRepeat(
        withTiming(1, { duration: 1400 + (bubble.id % 5) * 180, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [sway, bubble.id]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: bubble.x + (sway.value - 0.5) * 14 },
      { translateY: y.value },
      { scale: selected ? 1.12 : 1 },
    ],
  }));

  const label = bubble.letter === "qu" ? "Qu" : bubble.letter.toUpperCase();
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <Animated.View entering={ZoomIn.springify().damping(12)} exiting={ZoomOut.duration(180)}>
        <View
          onStartShouldSetResponder={() => true}
          onResponderGrant={() => onTap(bubble.id)}
          accessibilityRole="button"
          accessibilityLabel={`Letter ${label}`}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selected ? INK : bubble.golden ? "#FFE14D" : "#FFFFFF",
            borderWidth: 3,
            borderColor: selected ? "#FFFFFF" : bubble.golden ? "#FFB800" : "rgba(27,169,217,0.35)",
            ...cardShadow,
            shadowOpacity: 0.16,
          }}
        >
          {/* glossy highlight */}
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 12,
              width: 14,
              height: 8,
              borderRadius: 6,
              backgroundColor: selected ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.9)",
            }}
          />
          <Text
            style={[
              display(label.length > 1 ? 22 : 26),
              { color: selected ? "#FFFFFF" : INK, textTransform: "none" },
            ]}
          >
            {label}
          </Text>
          <Text
            style={{
              position: "absolute",
              bottom: 6,
              right: 11,
              fontFamily: "Outfit_700Bold",
              fontSize: 9,
              color: selected ? "rgba(255,255,255,0.7)" : "#6B6B6B",
            }}
          >
            {LETTER_POINTS[bubble.letter]}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Remount per level so every level starts from a clean slate.
export default function WordPopScreen() {
  const { level } = useLocalSearchParams();
  return <WordPop key={level ?? "endless"} />;
}

function WordPop() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const cfg = useMemo(
    () => ({ ...WORD_POP_DEFAULTS, ...(challenge.level?.config ?? {}) }),
    [challenge.level],
  );
  const DURATION = cfg.duration * 1000;

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [field, setField] = useState({ w: 360, h: 420 });
  const [bubbles, setBubbles] = useState([]);
  const [selection, setSelection] = useState([]); // bubble ids, in order
  const [score, setScore] = useState(0);
  const [found, setFound] = useState([]); // [{ word, points }]
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [popups, setPopups] = useState([]);
  const [result, setResult] = useState(null);

  const run = useRef({ score: 0, longest: 0, rare: 0, words: new Set() });
  const lastLanes = useRef([]);
  const startedAt = useRef(0);
  const bar = useSharedValue(1);
  const trayShake = useSharedValue(0);

  const byId = Object.fromEntries(bubbles.map((b) => [b.id, b]));
  const letters = selection.map((id) => byId[id]?.letter).filter(Boolean);
  const check = checkWord(letters);
  const golden = selection.some((id) => byId[id]?.golden);
  const preview = check.ok ? wordScore(letters, golden) : 0;

  // ---- spawning ---------------------------------------------------------------
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const spawn = (head = 0) =>
      setBubbles((list) => {
        if (list.length >= cfg.maxBubbles) return list;
        // Prefer a lane that hasn't been used recently so bubbles don't stack.
        const lanes = Array.from({ length: LANES }, (_, i) => i).filter(
          (l) => !lastLanes.current.includes(l),
        );
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        lastLanes.current = [...lastLanes.current.slice(-2), lane];
        const laneW = (field.w - SIZE) / (LANES - 1);
        const elapsed = (Date.now() - startedAt.current) / 1000;
        return [
          ...list,
          {
            id: ++bubbleId,
            letter: nextLetter(list.map((b) => b.letter)),
            x: Math.max(
              12,
              Math.min(field.w - SIZE - 12, lane * laneW + (Math.random() - 0.5) * 16),
            ),
            golden: Math.random() < cfg.goldenRate,
            head,
            duration: Math.max(8500, 15000 - elapsed * 60) * cfg.riseScale,
          },
        ];
      });
    // Fill the screen quickly at the start, then keep a steady stream.
    for (let i = 0; i < 9; i++) setTimeout(() => spawn(0.05 + Math.random() * 0.6), i * 90);
    const id = setInterval(() => spawn(), 850);
    return () => clearInterval(id);
  }, [phase, field.w, cfg]);

  // ---- clock --------------------------------------------------------------------
  const finish = useCallback(() => {
    setPhase("over");
    setSelection([]);
    haptic.heavy();
    const r = run.current;
    const records = { wpLongest: r.longest, wpRare: r.rare };
    if (challenge.level) {
      const res = challenge.complete(
        { score: r.score, words: r.words.size, longest: r.longest },
        records,
      );
      setResult({ ...res, challenge: true });
      return;
    }
    const outcome = recordGame(GAME.id, r.score, {
      xp: 10 + Math.floor(r.score / 4),
      records,
    });
    setResult({ ...outcome, words: r.words.size, longest: r.longest });
  }, [challenge, recordGame]);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, DURATION - (Date.now() - startedAt.current));
      setTimeLeft(left);
      if (left === 10_000) sfx("warn");
      if (left <= 0) {
        clearInterval(id);
        finish();
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, finish, DURATION]);

  const start = () => {
    run.current = { score: 0, longest: 0, rare: 0, words: new Set() };
    setBubbles([]);
    setSelection([]);
    setFound([]);
    setScore(0);
    setPopups([]);
    setResult(null);
    setTimeLeft(DURATION);
    startedAt.current = Date.now();
    bar.set(1);
    bar.set(withTiming(0, { duration: DURATION, easing: Easing.linear }));
    sfx("go");
    setPhase("playing");
  };

  // ---- interaction --------------------------------------------------------------
  // Not memoised on purpose: it reads the current selection directly, and keeps
  // side effects (sounds, haptics) out of state updaters.
  const tapBubble = (id) => {
    if (phase !== "playing") return;
    if (selection.includes(id)) {
      // Tapping a chosen letter trims the word back to just before it.
      haptic.select();
      sfx("select");
      setSelection(selection.slice(0, selection.indexOf(id)));
      return;
    }
    const next = [...selection, id];
    if (wordLength(next.map((i) => byId[i]?.letter ?? "")) > 8) return;
    haptic.tap();
    sfx("tap");
    setSelection(next);
  };

  const onEscape = useCallback((id) => {
    setBubbles((list) => list.filter((b) => b.id !== id));
    setSelection((sel) => sel.filter((s) => s !== id));
  }, []);

  const clear = () => {
    if (!selection.length) return;
    sfx("whoosh");
    setSelection([]);
  };

  const submit = () => {
    if (phase !== "playing" || !letters.length) return;
    const r = run.current;
    const reject = (msg) => {
      haptic.error();
      sfx("wrong");
      trayShake.set(
        withSequence(
          withTiming(-10, { duration: 45 }),
          withTiming(10, { duration: 45 }),
          withTiming(-6, { duration: 45 }),
          withTiming(0, { duration: 45 }),
        ),
      );
      addPopup(msg, "#E5484D");
      setSelection([]);
    };
    if (!check.ok) return reject(check.reason === "short" ? "3+ letters" : "Not a word");
    if (wordLength(letters) < cfg.minLength) return reject(`${cfg.minLength}+ letters`);
    if (r.words.has(check.word)) return reject("Already found");

    const points = wordScore(letters, golden);
    const len = wordLength(letters);
    r.score += points;
    r.words.add(check.word);
    r.longest = Math.max(r.longest, len);
    if (hasRareLetter(letters)) r.rare++;
    setScore(r.score);
    setFound((f) => [{ word: check.word, points }, ...f]);
    setBubbles((list) => list.filter((b) => !selection.includes(b.id)));
    setSelection([]);
    haptic.success();
    sfx(len >= 6 ? "perfect" : golden ? "star" : len >= 5 ? "match" : "catch");
    addPopup(`+${points}`, golden ? "#FFB800" : "#1BA9D9");
  };

  const addPopup = (text, color) => {
    const id = ++popupId;
    setPopups((p) => [...p, { id, x: field.w / 2, y: field.h - 30, text, color }]);
    setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 700);
  };

  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const trayStyle = useAnimatedStyle(() => ({ transform: [{ translateX: trayShake.value }] }));
  const secs = Math.ceil(timeLeft / 1000);

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : GAME.title}
        score={score}
        best={challenge.level ? undefined : best}
      />

      <View className="mt-4 px-5">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className={`font-body-black text-sm ${secs <= 10 ? "text-[#E5484D]" : "text-ink"}`}>
            ⏱ {secs}s
          </Text>
          <Text className="font-body-bold text-xs text-ink-soft">
            {found.length} word{found.length === 1 ? "" : "s"}
          </Text>
        </View>
        <View className="h-3 overflow-hidden rounded-full bg-white/70">
          <Animated.View style={[{ height: "100%" }, barStyle]}>
            <LinearGradient
              colors={GAME.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: 99 }}
            />
          </Animated.View>
        </View>
      </View>

      {/* Bubble field */}
      <View
        style={{
          flex: 1,
          margin: 20,
          marginBottom: 10,
          borderRadius: 32,
          backgroundColor: "rgba(255,255,255,0.4)",
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.9)",
          overflow: "hidden",
        }}
        onLayout={(e) =>
          setField({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {bubbles.map((b) => (
          <Bubble
            key={b.id}
            bubble={b}
            fieldH={field.h}
            selected={selection.includes(b.id)}
            onTap={tapBubble}
            onEscape={onEscape}
          />
        ))}
        {popups.map((p) => (
          <ScorePopup key={p.id} {...p} />
        ))}

        {phase === "ready" && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              backgroundColor: "rgba(239,252,255,0.85)",
            }}
          >
            <Animated.View entering={ZoomIn.springify().damping(11)}>
              <Mascot variant={GAME.mascot} size={120} mood="cheer" />
            </Animated.View>
            <Text style={[display(44), { marginTop: 6 }]}>Word Pop</Text>
            {challenge.level ? (
              <ChallengeGoal level={challenge.level} n={challenge.n} />
            ) : (
              <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
                Tap rising letters to spell a word, then send it!{"\n"}Tapped bubbles freeze ·
                longer words score more{"\n"}Golden bubbles double the word.
              </Text>
            )}
            <PrimaryButton title="Start" icon="text" onPress={start} style={{ marginTop: 18 }} />
            {!challenge.level && (
              <LevelsButton
                gameId={GAME.id}
                count={challenge.count}
                onPress={challenge.openLevels}
                style={{ marginTop: 10 }}
              />
            )}
          </Animated.View>
        )}
      </View>

      {/* Found words */}
      <View style={{ height: 34 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
        >
          {found.map((f) => (
            <Animated.View key={f.word} entering={ZoomIn.springify()}>
              <View className="flex-row items-center rounded-full bg-white px-3 py-1.5">
                <Text className="font-body-bold text-xs uppercase text-ink">{f.word}</Text>
                <Text className="ml-1.5 font-body-black text-xs text-[#1BA9D9]">+{f.points}</Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      </View>

      {/* Word tray */}
      <Animated.View
        style={[{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 }, trayStyle]}
      >
        <View
          style={[
            {
              borderRadius: 26,
              padding: 8,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderWidth: 3,
              borderColor: check.ok ? "#2BD67B" : "transparent",
            },
            cardShadow,
          ]}
        >
          <PressableScale onPress={clear} accessibilityLabel="Clear word">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F1F1F4]">
              <Ionicons name="close" size={22} color={INK} />
            </View>
          </PressableScale>
          <View className="mx-2 flex-1 items-center">
            {letters.length ? (
              <Text numberOfLines={1} style={[display(30), { letterSpacing: 2 }]}>
                {letters.join("").toUpperCase()}
              </Text>
            ) : (
              <Text className="font-body-semi text-sm text-ink-mute">Tap bubbles to spell</Text>
            )}
            {check.ok && (
              <Text className="font-body-black text-xs text-[#13A866]">
                ✓ {preview} pts{golden ? " · golden ×2" : ""}
              </Text>
            )}
          </View>
          <PressableScale onPress={submit} hapticFeedback={false} accessibilityLabel="Submit word">
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: letters.length ? INK : "#C9C9D2" }}
            >
              <Ionicons name="arrow-up" size={22} color="#fff" />
            </View>
          </PressableScale>
        </View>
      </Animated.View>

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
              {result.words} word{result.words === 1 ? "" : "s"} · longest {result.longest} letters
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
