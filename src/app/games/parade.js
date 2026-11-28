import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
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
import { PARADE_DEFAULTS } from "../../games/parade/levels";
import { createParade, DANCERS, PAD_COLOURS } from "../../games/parade/logic";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("parade");
const METRIC_UNITS = { rounds: "rounds", longest: "steps", score: "pts" };
const GAP = 14;
/** Each pad's note. */
const NOTES = ["pop1", "pop2", "pop3", "pop4", "tick", "star"];
const EASE = Easing.inOut(Easing.cubic);

const snap = (p) => ({
  round: p.round,
  longest: p.longest,
  score: p.score,
  lives: p.lives,
  progress: p.progress,
  length: p.length,
  order: p.order,
});

/** One buddy on its coloured pad: it jumps and glows when it dances. */
function Pad({ pad, size, lit, dim, shake, onTap, enabled }) {
  const jump = useSharedValue(0);
  const shakeX = useSharedValue(0);
  useEffect(() => {
    jump.set(withTiming(lit ? 1 : 0, { duration: lit ? 140 : 220, easing: EASE }));
  }, [lit, jump]);
  useEffect(() => {
    if (!shake) return;
    const t = { duration: 50 };
    shakeX.set(
      withSequence(withTiming(-8, t), withTiming(8, t), withTiming(-5, t), withTiming(0, t)),
    );
  }, [shake, shakeX]);
  const padStyle = useAnimatedStyle(() => ({
    opacity: dim ? 0.55 + 0.45 * jump.value : 1,
    transform: [{ translateX: shakeX.value }, { scale: 1 + 0.07 * jump.value }],
  }));
  const buddyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -size * 0.12 * jump.value }, { rotate: `${jump.value * 8}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: jump.value }));
  const colour = PAD_COLOURS[pad];
  return (
    <View
      onStartShouldSetResponder={() => enabled}
      onResponderGrant={() => onTap(pad)}
      accessibilityRole="button"
      accessibilityLabel={`Pad ${pad + 1}`}
    >
      <Animated.View style={padStyle}>
        <View
          style={[
            cardShadow,
            {
              width: size,
              height: size,
              borderRadius: size * 0.26,
              backgroundColor: colour,
              borderWidth: 4,
              borderColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "flex-end",
              overflow: "hidden",
            },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: -size * 0.2,
                width: size * 1.1,
                height: size * 1.1,
                borderRadius: size,
                backgroundColor: "rgba(255,255,255,0.45)",
              },
              glowStyle,
            ]}
          />
          <Animated.View style={[{ marginBottom: -size * 0.04 }, buddyStyle]}>
            <Mascot
              variant={DANCERS[pad]}
              size={size * 0.72}
              mood={lit ? "cheer" : "happy"}
              animated={false}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
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
        <View className="flex-row items-end">
          <Mascot variant="kit" size={76} mood="happy" delay={200} />
          <Mascot variant="bun" size={96} mood="cheer" />
          <Mascot variant="hop" size={76} mood="happy" delay={500} />
        </View>
      </Animated.View>
      <Text style={[display(40), { marginTop: 6 }]}>Let&apos;s dance!</Text>
      {challenge.level ? (
        <ChallengeGoal level={challenge.level} n={challenge.n} />
      ) : (
        <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
          Watch the buddies dance one after another,{"\n"}then tap them in the same order.
          {"\n"}Every round the dance gets one step longer!
        </Text>
      )}
      <Animated.View entering={FadeIn.delay(200)}>
        <Animated.View style={[{ marginTop: 16 }, style]}>
          <PrimaryButton title="Start the parade" icon="musical-notes" onPress={onPress} />
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
export default function ParadeScreen() {
  const { level } = useLocalSearchParams();
  return <Parade key={level ?? "endless"} />;
}

function Parade() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;
  const cfg = useMemo(() => ({ ...PARADE_DEFAULTS, ...(levelConfig ?? {}) }), [levelConfig]);

  const [phase, setPhase] = useState("ready"); // ready | watch | play | over
  const [hud, setHud] = useState(null);
  const [lit, setLit] = useState(-1);
  const [shake, setShake] = useState(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [area, setArea] = useState(null);
  const parade = useRef(null);
  const timers = useRef([]);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** Plays the current dance, then hands over to the player. */
  const playShow = useCallback(() => {
    const p = parade.current;
    const step = p.stepMs;
    setPhase("watch");
    setMessage(cfg.reverse ? "Watch… then tap it backwards!" : "Watch the dance…");
    p.show.forEach((pad, k) => {
      later(
        () => {
          setLit(pad);
          sfx(NOTES[pad]);
        },
        500 + k * step,
      );
      later(() => setLit(-1), 500 + k * step + step * 0.62);
    });
    later(
      () => {
        setPhase("play");
        setMessage("Your turn!");
      },
      500 + p.show.length * step,
    );
  }, [cfg.reverse]);

  const finish = useCallback(() => {
    const p = parade.current;
    setPhase("over");
    const stats = { rounds: p.round, longest: p.longest, score: p.score };
    later(() => {
      if (challenge.level) {
        const res = challenge.complete(stats, {});
        setResult({ ...res, challenge: true });
        return;
      }
      const outcome = recordGame(GAME.id, p.score, { xp: 10 + p.score });
      setResult({ ...outcome, ...stats });
    }, 700);
  }, [challenge, recordGame]);

  const start = () => {
    clearTimers();
    parade.current = createParade(cfg, (Date.now() % 100000) + 1);
    setHud(snap(parade.current));
    setResult(null);
    setLit(-1);
    sfx("go");
    playShow();
  };

  const tap = (pad) => {
    const p = parade.current;
    if (phase !== "play" || !p) return;
    setLit(pad);
    later(() => setLit((l) => (l === pad ? -1 : l)), 180);
    const res = p.tap(pad);
    setHud(snap(p));
    if (res === "good") {
      sfx(NOTES[pad]);
      haptic.tap();
    } else if (res === "round") {
      sfx(NOTES[pad]);
      haptic.success();
      setPhase("watch");
      setMessage(`Round ${p.round} cleared! 🎉`);
      later(() => sfx("levelup"), 200);
      later(playShow, 1100);
    } else if (res === "miss") {
      sfx("wrong");
      haptic.error();
      setShake({ pad, n: Date.now() });
      setPhase("watch");
      setMessage("Oops! Watch again…");
      later(playShow, 1100);
    } else if (res === "over") {
      sfx("wrong");
      haptic.error();
      setShake({ pad, n: Date.now() });
      setMessage("The parade stopped!");
      finish();
    }
  };

  const pads = cfg.pads;
  const cols = pads === 4 ? 2 : 3;
  const rows = Math.ceil(pads / cols);
  const size = area
    ? Math.min(
        (area.w - 40 - GAP * (cols - 1)) / cols,
        (area.h - 40 - GAP * (rows - 1)) / rows,
        170,
      )
    : 0;
  const order = hud?.order ?? Array.from({ length: pads }, (_, i) => i);

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Parade"}
        score={hud?.score ?? 0}
        best={challenge.level ? challenge.bestLabel : best}
      />

      {phase !== "ready" && hud && (
        <View className="mt-3 px-5">
          <View style={cardShadow} className="rounded-3xl bg-white px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-body-black text-base text-ink">{message}</Text>
              <Text className="font-body-black text-sm text-ink">
                {"❤️".repeat(Math.max(0, hud.lives))}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <View className="flex-row flex-wrap gap-1.5">
                {Array.from({ length: hud.length }, (_, i) => (
                  <View
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${i < hud.progress ? "bg-[#9C4BFF]" : "bg-[#EADCFB]"}`}
                  />
                ))}
              </View>
              <Text className="font-body-bold text-xs text-ink-soft">
                Round {hud.round + 1} · {hud.length} steps
              </Text>
            </View>
          </View>
        </View>
      )}

      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {phase === "ready" ? (
          <StartCard onPress={start} challenge={challenge} />
        ) : (
          area && (
            <View
              style={{
                width: cols * size + (cols - 1) * GAP,
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: GAP,
              }}
            >
              {order.map((pad, slot) => (
                <Animated.View key={pad} entering={ZoomIn.delay(slot * 60).duration(280)}>
                  <Pad
                    pad={pad}
                    size={size}
                    lit={lit === pad}
                    dim={phase === "watch"}
                    shake={shake?.pad === pad ? shake.n : null}
                    enabled={phase === "play"}
                    onTap={tap}
                  />
                </Animated.View>
              ))}
            </View>
          )
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
          title="The parade stopped!"
          game={GAME}
          score={hud?.score ?? 0}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.rounds} rounds · longest dance {result.longest} steps
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
