import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import { ODD_DEFAULTS } from "../../games/odd/levels";
import { makeRound, multiplierFor, tierFor, TIER_AT } from "../../games/odd/logic";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { createRng } from "../../lib/random";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("odd");
const METRIC_UNITS = { score: "pts", correct: "right", streak: "in a row" };
const GAP = 14;
const GOOD = "#1FB865";
const BAD = "#F03B3B";

/** One of the four cards. Reacts on touch-down for instant taps. */
function Card({ card, size, onTap, reveal, index }) {
  const pop = useSharedValue(1);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (reveal === "wrong") {
      shake.set(
        withSequence(
          withTiming(-8, { duration: 45 }),
          withTiming(8, { duration: 45 }),
          withTiming(-5, { duration: 45 }),
          withTiming(0, { duration: 45 }),
        ),
      );
    }
    if (reveal === "right") {
      pop.set(withSequence(withTiming(1.08, { duration: 90 }), withSpring(1, { damping: 10 })));
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
      accessibilityLabel={`Card ${index + 1}`}
    >
      <Animated.View style={style}>
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: 26,
              borderWidth: 5,
              borderColor: ring,
              backgroundColor: card.kind === "swatch" ? card.colour : "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            },
            cardShadow,
          ]}
        >
          {card.kind === "buddy" && (
            <Mascot
              variant={card.variant}
              size={size * 0.7}
              mood={card.mood}
              outfit={card.outfit}
              animated={false}
            />
          )}
          {card.kind === "word" && (
            <Text
              numberOfLines={1}
              style={[
                display(Math.min(size * 0.25, (9 * (size / 10)) / card.word.length)),
                { color: card.ink },
              ]}
            >
              {card.word}
            </Text>
          )}
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
      <Animated.View entering={ZoomIn.springify().damping(11)}>
        <Mascot variant={GAME.mascot} size={140} mood="wow" />
      </Animated.View>
      <Text style={[display(44), { marginTop: 6 }]}>Ready?</Text>
      {challenge.level ? (
        <ChallengeGoal level={challenge.level} n={challenge.n} />
      ) : (
        <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
          Four cards, one is different. Read the question{"\n"}each round: colour words love to
          trick you!{"\n"}Get 5 in a row to raise your multiplier.
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
export default function OddScreen() {
  const { level } = useLocalSearchParams();
  return <OddOneOut key={level ?? "endless"} />;
}

function OddOneOut() {
  const { width } = useWindowDimensions();
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;
  const cfg = useMemo(() => ({ ...ODD_DEFAULTS, ...(levelConfig ?? {}) }), [levelConfig]);

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [round, setRound] = useState(null);
  const [reveal, setReveal] = useState(null); // { picked, right }
  const [hud, setHud] = useState({ score: 0, streak: 0, correct: 0 });
  const [timeLeft, setTimeLeft] = useState(cfg.duration);
  const [result, setResult] = useState(null);

  const rand = useRef(null);
  const stats = useRef({ score: 0, correct: 0, streak: 0, bestStreak: 0, misses: 0 });
  const endAt = useRef(0);
  const busy = useRef(false);
  const roundNo = useRef(0);

  const deal = useCallback(() => {
    const s = stats.current;
    const tier = Math.max(cfg.startTier, tierFor(s.correct));
    roundNo.current++;
    setRound({
      ...makeRound(tier, rand.current, { modes: cfg.modes, shadeScale: cfg.shadeScale }),
      id: roundNo.current,
    });
    setReveal(null);
    busy.current = false;
  }, [cfg]);

  const finish = useCallback(() => {
    setPhase("over");
    haptic.heavy();
    const s = stats.current;
    const records = { oddStreak: s.bestStreak };
    if (challenge.level) {
      const res = challenge.complete(
        { score: s.score, correct: s.correct, streak: s.bestStreak },
        records,
      );
      setResult({ ...res, challenge: true });
      return;
    }
    const outcome = recordGame(GAME.id, s.score, { xp: 10 + Math.floor(s.score / 2), records });
    setResult({ ...outcome, correct: s.correct, bestStreak: s.bestStreak, misses: s.misses });
  }, [challenge, recordGame]);

  // Clock: ticks while playing; misses take time off by moving the end.
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
      if (TIER_AT.includes(s.correct) && s.correct > 0) sfx("levelup");
      setReveal({ picked: i, right: true });
      setHud({ score: s.score, streak: s.streak, correct: s.correct });
      setTimeout(deal, 220);
      return;
    }
    s.misses++;
    s.streak = 0;
    haptic.error();
    sfx("wrong");
    setReveal({ picked: i, right: false });
    setHud({ score: s.score, streak: 0, correct: s.correct });
    if (cfg.suddenDeath) {
      setTimeout(finish, 700);
      return;
    }
    endAt.current -= cfg.penalty * 1000;
    // Show the right answer for a moment before the next round.
    setTimeout(deal, 750);
  };

  const size = Math.min((width - 48 - GAP) / 2, 190);
  const mult = multiplierFor(hud.streak);
  const ratio = Math.max(0, Math.min(1, timeLeft / cfg.duration));

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : GAME.title}
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

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {phase === "ready" && <StartPanel onPress={start} challenge={challenge} />}
        {phase !== "ready" && round && (
          <>
            <Animated.View key={`p${round.id}`} entering={FadeInDown.duration(180)}>
              <View className="mb-5 rounded-full bg-white px-5 py-2.5" style={cardShadow}>
                <Text className="text-center font-body-black text-base text-ink">
                  {round.prompt}
                </Text>
              </View>
            </Animated.View>
            <View
              style={{ width: size * 2 + GAP, flexDirection: "row", flexWrap: "wrap", gap: GAP }}
            >
              {round.cards.map((card, i) => (
                <Card
                  key={`${round.id}-${i}`}
                  index={i}
                  card={card}
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
