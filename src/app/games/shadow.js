import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
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
import { getGame } from "../../games/registry";
import { SHADOW_DEFAULTS } from "../../games/shadow/levels";
import { makeRound, multiplierFor, tierFor, TIER_AT } from "../../games/shadow/logic";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { createRng } from "../../lib/random";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("shadow");
const METRIC_UNITS = { score: "pts", correct: "right", streak: "in a row" };
const GAP = 12;
const GOOD = "#1FB865";
const BAD = "#F03B3B";
const INK_SHADOW = "#2B2D4A";
const EASE = Easing.inOut(Easing.cubic);

const outfitOf = (o) => (o.hat ? { hat: o.hat } : null);
const moodOf = (o) => (o.pose === "up" ? "cheer" : "happy");

/** One choice: a dressed-up buddy. Reacts on touch-down for instant taps. */
function Choice({ option, size, onTap, reveal, index }) {
  const pop = useSharedValue(1);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (reveal === "wrong") {
      const t = { duration: 45 };
      shake.set(
        withSequence(withTiming(-8, t), withTiming(8, t), withTiming(-5, t), withTiming(0, t)),
      );
    }
    if (reveal === "right") {
      pop.set(
        withSequence(
          withTiming(1.08, { duration: 110, easing: EASE }),
          withTiming(1, { duration: 200, easing: EASE }),
        ),
      );
    }
  }, [reveal, pop, shake]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { translateX: shake.value }],
  }));
  const ring = reveal === "right" ? GOOD : reveal === "wrong" ? BAD : "transparent";
  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderGrant={onTap}
      accessibilityRole="button"
      accessibilityLabel={`Choice ${index + 1}`}
    >
      <Animated.View style={style}>
        <View
          style={[
            cardShadow,
            {
              width: size,
              height: size,
              borderRadius: 24,
              borderWidth: 4,
              borderColor: ring,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Mascot
            variant={option.variant}
            size={size * 0.74}
            mood={moodOf(option)}
            outfit={outfitOf(option)}
            animated={false}
          />
        </View>
      </Animated.View>
    </View>
  );
}

function StartPanel({ onPress, challenge }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.06, { duration: 650 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 24 }}>
      <Animated.View entering={ZoomIn.duration(320)}>
        <View className="flex-row items-end">
          <Mascot variant="mochi" size={110} mood="cheer" outfit={{ hat: "wizard" }} />
          <Mascot
            variant="mochi"
            size={110}
            mood="cheer"
            outfit={{ hat: "wizard" }}
            silhouette={INK_SHADOW}
            animated={false}
          />
        </View>
      </Animated.View>
      <Text style={[display(40), { marginTop: 6 }]}>Who&apos;s that?</Text>
      {challenge.level ? (
        <ChallengeGoal level={challenge.level} n={challenge.n} />
      ) : (
        <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
          A buddy is hiding in the shadows.{"\n"}Look at the outline (ears, tails, hats and arms)
          {"\n"}and tap the buddy who cast it!
        </Text>
      )}
      <Animated.View entering={FadeIn.delay(200)}>
        <Animated.View style={[{ marginTop: 18 }, style]}>
          <PrimaryButton title="Start" icon="eye" onPress={onPress} />
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
export default function ShadowScreen() {
  const { level } = useLocalSearchParams();
  return <ShadowMatch key={level ?? "endless"} />;
}

function ShadowMatch() {
  const { width } = useWindowDimensions();
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;
  const cfg = useMemo(() => ({ ...SHADOW_DEFAULTS, ...(levelConfig ?? {}) }), [levelConfig]);

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [round, setRound] = useState(null);
  const [reveal, setReveal] = useState(null); // { picked, right }
  const [hud, setHud] = useState({ score: 0, streak: 0, correct: 0 });
  const [timeLeft, setTimeLeft] = useState(cfg.duration);
  const [result, setResult] = useState(null);
  const [area, setArea] = useState(null);

  const rand = useRef(null);
  const stats = useRef({ score: 0, correct: 0, streak: 0, bestStreak: 0, misses: 0 });
  const endAt = useRef(0);
  const busy = useRef(false);
  const roundNo = useRef(0);

  const deal = useCallback(() => {
    const s = stats.current;
    const tier = Math.max(cfg.startTier, tierFor(s.correct));
    roundNo.current++;
    setRound({ ...makeRound(tier, rand.current, { options: cfg.options }), id: roundNo.current });
    setReveal(null);
    busy.current = false;
  }, [cfg]);

  const finish = useCallback(() => {
    setPhase("over");
    haptic.heavy();
    const s = stats.current;
    if (challenge.level) {
      const res = challenge.complete({ score: s.score, correct: s.correct, streak: s.bestStreak });
      setResult({ ...res, challenge: true });
      return;
    }
    const outcome = recordGame(GAME.id, s.score, { xp: 10 + Math.floor(s.score / 2) });
    setResult({ ...outcome, correct: s.correct, bestStreak: s.bestStreak, misses: s.misses });
  }, [challenge, recordGame]);

  // Clock: misses take time off by moving the end.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, (endAt.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        finish();
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, finish]);

  const start = () => {
    rand.current = createRng(Date.now() % 1000003);
    stats.current = { score: 0, correct: 0, streak: 0, bestStreak: 0, misses: 0 };
    setHud({ score: 0, streak: 0, correct: 0 });
    endAt.current = Date.now() + cfg.duration * 1000;
    setTimeLeft(cfg.duration);
    setResult(null);
    setPhase("playing");
    sfx("go");
    deal();
  };

  const tap = (i) => {
    if (phase !== "playing" || busy.current || !round) return;
    busy.current = true;
    const s = stats.current;
    if (i === round.answer) {
      s.correct++;
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.score += multiplierFor(s.streak - 1);
      haptic.tap();
      sfx(popFor(multiplierFor(s.streak - 1)));
      if (TIER_AT.includes(s.correct)) sfx("levelup");
      setReveal({ picked: i, right: true });
      setHud({ score: s.score, streak: s.streak, correct: s.correct });
      setTimeout(deal, 450);
      return;
    }
    s.misses++;
    s.streak = 0;
    haptic.error();
    sfx("wrong");
    setReveal({ picked: i, right: false });
    setHud({ score: s.score, streak: 0, correct: s.correct });
    if (cfg.suddenDeath) {
      setTimeout(finish, 900);
      return;
    }
    endAt.current -= cfg.penalty * 1000;
    setTimeout(deal, 950);
  };

  // Everything is sized from the space left under the timer, so it fits short phones too.
  const cols = cfg.options === 4 ? 2 : 3;
  const rows = Math.ceil(cfg.options / cols);
  const availH = area?.h ?? 520;
  const shadowSize = Math.max(86, Math.min(150, availH * 0.27, width * 0.36));
  const cardH = shadowSize * 1.1 + 20;
  const size = Math.max(
    64,
    Math.min(
      (width - 40 - GAP * (cols - 1)) / cols,
      (availH - cardH - 36 - GAP * (rows - 1)) / rows,
      cols === 2 ? 150 : 112,
    ),
  );
  const mult = multiplierFor(hud.streak);
  const ratio = Math.max(0, Math.min(1, timeLeft / cfg.duration));

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Shadows"}
        score={hud.score}
        best={challenge.level ? challenge.bestLabel : best}
      />

      <View className="mt-3 px-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-body-black text-sm text-ink">⏱ {Math.ceil(timeLeft)}s</Text>
          <View className="flex-row items-center gap-2">
            {hud.streak > 0 && (
              <Text className="font-body-bold text-xs text-ink-soft">🔥 {hud.streak} in a row</Text>
            )}
            <View className="rounded-full bg-ink px-3 py-1">
              <Text className="font-body-black text-xs text-white">×{mult}</Text>
            </View>
          </View>
        </View>
        <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/70">
          <View
            style={{
              width: `${ratio * 100}%`,
              height: "100%",
              borderRadius: 99,
              backgroundColor: ratio < 0.25 ? BAD : GAME.accent,
            }}
          />
        </View>
      </View>

      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {phase === "ready" && <StartPanel onPress={start} challenge={challenge} />}
        {phase !== "ready" && round && (
          <>
            <Animated.View key={`s${round.id}`} entering={FadeInDown.duration(220)}>
              <View
                style={[cardShadow, { width: width - 40, height: cardH, marginBottom: 16 }]}
                className="flex-row items-center rounded-3xl bg-[#FFF8E8] px-3"
              >
                <View
                  style={{
                    width: shadowSize,
                    height: shadowSize * 1.1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      width: shadowSize * 0.88,
                      height: shadowSize * 0.88,
                      borderRadius: shadowSize,
                      backgroundColor: "#FFE7A8",
                    }}
                  />
                  <Mascot
                    variant={round.target.variant}
                    size={shadowSize}
                    mood={moodOf(round.target)}
                    outfit={outfitOf(round.target)}
                    silhouette={INK_SHADOW}
                    animated={false}
                  />
                </View>
                <View className="ml-2 flex-1">
                  <Text style={display(26)}>Who cast this shadow?</Text>
                  <Text className="mt-1 font-body-semi text-xs text-ink-soft">
                    Look at ears, tails, hats and arms
                  </Text>
                </View>
              </View>
            </Animated.View>
            <View
              style={{
                width: size * cols + GAP * (cols - 1),
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: GAP,
              }}
            >
              {round.options.map((o, i) => (
                <Choice
                  key={`${round.id}-${i}`}
                  index={i}
                  option={o}
                  size={size}
                  onTap={() => tap(i)}
                  reveal={
                    !reveal
                      ? null
                      : i === round.answer
                        ? "right"
                        : i === reveal.picked
                          ? "wrong"
                          : null
                  }
                />
              ))}
            </View>
          </>
        )}
      </View>

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
          title={cfg.suddenDeath ? "Gotcha!" : "Time's up!"}
          game={GAME}
          score={hud.score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.correct} right · best streak {result.bestStreak} · {result.misses} missed
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
