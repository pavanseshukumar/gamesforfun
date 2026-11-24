import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import { MATH_DEFAULTS } from "../../games/math/levels";
import { cardTime, makeQuestion, multiplierFor, tierFor, TIERS } from "../../games/math/logic";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display, INK } from "../../theme";

const GAME = getGame("quick-math");
const METRIC_UNITS = { score: "pts", correct: "correct", streak: "in a row" };
const THROW = 520;
const GREEN = "#1FBF7A";
const RED = "#E5484D";

let questionId = 0;
// Font size from length: auto-shrinking text isn't available on web, and
// "144 ÷ 12 = 12" at full size would overflow the card.
const equationSize = (text) => Math.min(64, Math.floor(560 / text.length));

// Remount per level so every level starts from a clean slate.
export default function QuickMathScreen() {
  const { level } = useLocalSearchParams();
  return <QuickMath key={level ?? "endless"} />;
}

function QuickMath() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const cfg = useMemo(
    () => ({ ...MATH_DEFAULTS, ...(challenge.level?.config ?? {}) }),
    [challenge.level],
  );
  const ROUND_MS = cfg.duration * 1000;
  const custom = useMemo(() => (cfg.ops ? { ops: cfg.ops, max: cfg.max } : null), [cfg]);

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [question, setQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [hint, setHint] = useState(null); // the correct equation after a miss
  const [toast, setToast] = useState(null);
  const [tier, setTier] = useState(0);
  const [result, setResult] = useState(null);

  const run = useRef({
    score: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    tier: 0,
    endAt: 0,
    busy: false,
  });
  const cardTimer = useRef(null);
  const currentId = useRef(0); // answers for any other card are stale and ignored
  const answerRef = useRef(null); // latest `answer`, for timers and UI-thread callbacks
  const x = useSharedValue(0); // card drag offset
  const timer = useSharedValue(1); // per-card time left (1 → 0)
  const glow = useSharedValue(0); // +1 green flash, -1 red flash
  const shake = useSharedValue(0);

  const nextCard = useCallback(() => {
    const r = run.current;
    const q = { ...makeQuestion(r.tier, Math.random, custom), id: ++questionId };
    currentId.current = q.id;
    setQuestion(q);
    x.set(0);
    r.busy = false;
    const secs = cardTime(r.correct) * cfg.cardScale;
    timer.set(1);
    timer.set(withTiming(0, { duration: secs * 1000, easing: Easing.linear }));
    clearTimeout(cardTimer.current);
    cardTimer.current = setTimeout(() => answerRef.current?.(null, q), secs * 1000);
  }, [cfg.cardScale, custom, timer, x]);

  const finish = useCallback(() => {
    clearTimeout(cardTimer.current);
    setPhase("over");
    haptic.heavy();
    const r = run.current;
    const records = { qmBestStreak: r.bestStreak, qmTier: r.tier };
    if (challenge.level) {
      const res = challenge.complete(
        { score: r.score, correct: r.correct, streak: r.bestStreak },
        records,
      );
      setResult({ ...res, challenge: true });
      return;
    }
    const outcome = recordGame(GAME.id, r.score, {
      xp: 10 + Math.floor(r.score / 2),
      records,
    });
    setResult({ ...outcome, correct: r.correct, bestStreak: r.bestStreak });
  }, [challenge, recordGame]);

  /** side: "right" (true), "left" (false) or null (ran out of time). */
  const answer = useCallback(
    (side, q) => {
      const r = run.current;
      if (q.id !== currentId.current) return; // already answered (e.g. timed out mid-fling)
      currentId.current = -1;
      r.busy = true;
      clearTimeout(cardTimer.current);
      const right = side != null && (side === "right") === q.isTrue;
      if (right) {
        r.correct += 1;
        r.streak += 1;
        r.bestStreak = Math.max(r.bestStreak, r.streak);
        const mult = multiplierFor(r.streak);
        r.score += mult;
        setScore(r.score);
        setHint(null);
        glow.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 300 })));
        haptic.tap();
        sfx(popFor(mult));
        // Practice levels (custom ops) stay on their chosen skill.
        const tier = custom ? r.tier : Math.max(cfg.startTier, tierFor(r.correct));
        if (tier > r.tier) {
          r.tier = tier;
          setTier(tier);
          setToast(TIERS[tier].name + "!");
          setTimeout(() => setToast(null), 1600);
          sfx("levelup");
        }
      } else {
        r.streak = 0;
        r.endAt -= cfg.penalty * 1000;
        if (cfg.suddenDeath) r.endAt = 0; // one miss ends the round
        setHint(`${q.a} ${q.op} ${q.b} = ${q.truth}`);
        glow.set(withSequence(withTiming(-1, { duration: 60 }), withTiming(0, { duration: 380 })));
        shake.set(
          withSequence(
            withTiming(-10, { duration: 45 }),
            withTiming(10, { duration: 45 }),
            withTiming(0, { duration: 45 }),
          ),
        );
        haptic.error();
        sfx("wrong");
      }
      setStreak(r.streak);
      if (Date.now() >= r.endAt) finish();
      else nextCard();
    },
    [cfg.penalty, cfg.startTier, cfg.suddenDeath, custom, finish, glow, nextCard, shake],
  );
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  // Called back from the UI thread once the fling animation ends.
  const answerFromFling = useCallback((side, q) => answerRef.current?.(side, q), []);

  /** Flings the card off to one side, then scores it. */
  const commit = useCallback(
    (side) => {
      if (!question || run.current.busy) return;
      run.current.busy = true;
      const q = question;
      sfx("whoosh");
      x.set(
        withTiming(side === "right" ? THROW : -THROW, { duration: 160 }, (done) => {
          if (done) scheduleOnRN(answerFromFling, side, q);
        }),
      );
    },
    [answerFromFling, question, x],
  );

  const start = () => {
    run.current = {
      score: 0,
      correct: 0,
      streak: 0,
      bestStreak: 0,
      tier: cfg.startTier,
      endAt: Date.now() + ROUND_MS,
      busy: false,
    };
    setScore(0);
    setStreak(0);
    setHint(null);
    setResult(null);
    setTier(cfg.startTier);
    setTimeLeft(ROUND_MS);
    setPhase("playing");
    sfx("go");
    nextCard();
  };

  // Round clock.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, run.current.endAt - Date.now());
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        finish();
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, finish]);

  useEffect(() => () => clearTimeout(cardTimer.current), []);

  // Arrow keys on web.
  useEffect(() => {
    if (Platform.OS !== "web" || phase !== "playing") return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowRight") commit("right");
      if (e.key === "ArrowLeft") commit("left");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, commit]);

  const drag = usePanGesture({
    onUpdate: (e) => {
      "worklet";
      x.set(e.translationX);
    },
    onDeactivate: (e) => {
      "worklet";
      if (Math.abs(e.translationX) > 90 || Math.abs(e.velocityX) > 800) {
        scheduleOnRN(commit, e.translationX > 0 ? "right" : "left");
      } else {
        x.set(withSpring(0, { damping: 14, stiffness: 200 }));
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: `${x.value / 18}deg` }],
  }));
  const trueStamp = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [20, 110], [0, 1], "clamp"),
  }));
  const falseStamp = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-110, -20], [1, 0], "clamp"),
  }));
  const timerStyle = useAnimatedStyle(() => ({
    width: `${timer.value * 100}%`,
    backgroundColor: timer.value < 0.3 ? RED : INK,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(glow.value) * 0.35,
    backgroundColor: glow.value >= 0 ? GREEN : RED,
  }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const secs = Math.ceil(timeLeft / 1000);
  const mult = multiplierFor(streak);
  const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : GAME.title}
        score={score}
        best={challenge.level ? undefined : best}
      />

      <View className="mt-4 flex-row items-center justify-between px-5">
        <Text className={`font-body-black text-sm ${secs <= 10 ? "text-[#E5484D]" : "text-ink"}`}>
          ⏱ {secs}s
        </Text>
        {streak >= 3 && (
          <Animated.View key={mult} entering={ZoomIn.springify()}>
            <View className="rounded-full bg-ink px-3 py-1">
              <Text className="font-body-black text-xs text-white">
                🔥 {streak} in a row{mult > 1 ? ` · ×${mult}` : ""}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>

      <Animated.View
        style={[
          { flex: 1, margin: 20, alignItems: "center", justifyContent: "center" },
          shakeStyle,
        ]}
      >
        <Animated.View pointerEvents="none" style={[fill, { borderRadius: 32 }, glowStyle]} />

        {phase === "playing" && question && (
          <GestureDetector gesture={drag}>
            <Animated.View style={[{ width: "100%", maxWidth: 340 }, cardStyle]}>
              <Animated.View key={question.id} entering={ZoomIn.springify().damping(14)}>
                <View style={cardShadow} className="overflow-hidden rounded-[32px] bg-white">
                  <View className="h-2 bg-[#EEE]">
                    <Animated.View style={[{ height: "100%" }, timerStyle]} />
                  </View>
                  <View className="items-center px-6 py-12">
                    <Text className="mb-2 font-body-bold text-xs uppercase tracking-[2px] text-ink-mute">
                      {TIERS[tier].name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[display(equationSize(question.text)), { textAlign: "center" }]}
                    >
                      {question.text}
                    </Text>
                    <Text className="mt-3 font-body-semi text-sm text-ink-mute">
                      True or false?
                    </Text>
                  </View>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: "absolute",
                        top: 24,
                        left: 22,
                        transform: [{ rotate: "-14deg" }],
                      },
                      trueStamp,
                    ]}
                  >
                    <View
                      style={{
                        borderWidth: 4,
                        borderColor: GREEN,
                        borderRadius: 12,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Text style={[display(30), { color: GREEN }]}>True</Text>
                    </View>
                  </Animated.View>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: "absolute",
                        top: 24,
                        right: 22,
                        transform: [{ rotate: "14deg" }],
                      },
                      falseStamp,
                    ]}
                  >
                    <View
                      style={{
                        borderWidth: 4,
                        borderColor: RED,
                        borderRadius: 12,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Text style={[display(30), { color: RED }]}>False</Text>
                    </View>
                  </Animated.View>
                </View>
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        )}

        {hint && phase === "playing" && (
          <Animated.View
            key={hint}
            entering={FadeInUp.springify()}
            exiting={FadeOut}
            style={{ position: "absolute", bottom: 4 }}
          >
            <View className="rounded-full bg-white px-4 py-2">
              <Text className="font-body-bold text-sm text-ink">Oops — {hint}</Text>
            </View>
          </Animated.View>
        )}
        {toast && (
          <Animated.View
            entering={ZoomIn.springify()}
            exiting={FadeOut}
            style={{ position: "absolute", top: 4 }}
          >
            <View className="rounded-full bg-ink px-5 py-2">
              <Text className="font-body-black text-white">⬆ {toast}</Text>
            </View>
          </Animated.View>
        )}

        {phase === "ready" && (
          <Animated.View entering={FadeIn} style={{ alignItems: "center", padding: 12 }}>
            <Animated.View entering={ZoomIn.springify().damping(11)}>
              <Mascot variant={GAME.mascot} size={130} mood="cool" />
            </Animated.View>
            <Text style={[display(44), { marginTop: 6 }]}>Quick Math</Text>
            {challenge.level ? (
              <ChallengeGoal level={challenge.level} n={challenge.n} />
            ) : (
              <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
                Swipe right if the sum is true, left if it&apos;s false.{"\n"}Streaks multiply your
                points · mistakes cost 3 seconds.{"\n"}60 seconds — how far can you climb?
              </Text>
            )}
            <PrimaryButton
              title="Start"
              icon="calculator"
              onPress={start}
              style={{ marginTop: 18 }}
            />
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
      </Animated.View>

      {phase === "playing" && (
        <View className="flex-row justify-center gap-10 pb-6">
          <PressableScale
            onPress={() => commit("left")}
            hapticFeedback={false}
            accessibilityLabel="False"
          >
            <LinearGradient
              colors={["#FF8A8F", RED]}
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={38} color="#fff" />
            </LinearGradient>
          </PressableScale>
          <PressableScale
            onPress={() => commit("right")}
            hapticFeedback={false}
            accessibilityLabel="True"
          >
            <LinearGradient
              colors={["#6DE3A8", GREEN]}
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={38} color="#fff" />
            </LinearGradient>
          </PressableScale>
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
              {result.correct} correct · best streak {result.bestStreak}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
