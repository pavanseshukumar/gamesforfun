import { LinearGradient } from "expo-linear-gradient";
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
import Mascot, { MASCOTS } from "../../components/Mascot";
import { getGame } from "../../games/registry";
import { SPOT_DEFAULTS } from "../../games/spot/levels";
import { findPoints, makeScene } from "../../games/spot/logic";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { createRng } from "../../lib/random";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("spot");
const METRIC_UNITS = { found: "found", score: "pts" };
const HINT_AFTER = 8; // seconds before the target starts to wiggle
const secondsSince = (t) => (Date.now() - t) / 1000;

/** One buddy in the crowd. */
function Crowd({ b, W, H, onTap, wander, clock, mark, hint }) {
  const size = b.size * W;
  const shake = useSharedValue(0);
  useEffect(() => {
    if (mark !== "wrong") return;
    const t = { duration: 45 };
    shake.set(
      withSequence(withTiming(-7, t), withTiming(7, t), withTiming(-4, t), withTiming(0, t)),
    );
  }, [mark, shake]);
  const style = useAnimatedStyle(() => {
    const dx = wander ? Math.sin(clock.value + b.phase) * W * 0.035 : 0;
    const dy = wander ? Math.cos(clock.value * 0.8 + b.phase) * H * 0.02 : 0;
    return {
      transform: [
        { translateX: b.x * W - size / 2 + dx + shake.value },
        { translateY: b.y * H - size * 0.55 + dy },
        { rotate: `${b.rot}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={onTap}
        accessibilityRole="button"
        accessibilityLabel={`Buddy ${MASCOTS[b.variant].name}`}
        style={{
          borderRadius: size,
          borderWidth: mark ? 4 : 0,
          borderColor: mark === "right" ? "#1FB865" : "#F03B3B",
          backgroundColor: mark === "right" ? "rgba(255,255,255,0.7)" : "transparent",
        }}
      >
        <Mascot
          variant={b.variant}
          size={size}
          mood={mark === "right" ? "cheer" : b.mood}
          outfit={b.hat ? { hat: b.hat } : null}
          animated={hint}
        />
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
    <Animated.View entering={ZoomIn.duration(320)} style={{ width: "100%" }}>
      <View style={cardShadow} className="items-center rounded-3xl bg-white px-5 py-5">
        <Mascot variant="pom" size={100} mood="wow" />
        <Text style={[display(36), { marginTop: 4 }]}>Where&apos;s Pom?</Text>
        {challenge.level ? (
          <ChallengeGoal level={challenge.level} n={challenge.n} />
        ) : (
          <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
            The park is packed! Find the buddy you&apos;re{"\n"}asked for and tap them. Quick finds
            score more,{"\n"}and wrong taps cost 3 seconds.
          </Text>
        )}
        <Animated.View style={[{ marginTop: 16 }, style]}>
          <PrimaryButton title="Start looking" icon="search" onPress={onPress} />
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
    </Animated.View>
  );
}

// Remount per level so every level starts from a clean slate.
export default function SpotScreen() {
  const { level } = useLocalSearchParams();
  return <Spot key={level ?? "endless"} />;
}

function Spot() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;
  const cfg = useMemo(() => ({ ...SPOT_DEFAULTS, ...(levelConfig ?? {}) }), [levelConfig]);

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [scene, setScene] = useState(null);
  const [marks, setMarks] = useState({}); // index → "right" | "wrong"
  const [hud, setHud] = useState({ found: 0, score: 0, streak: 0 });
  const [timeLeft, setTimeLeft] = useState(cfg.duration);
  const [hint, setHint] = useState(false);
  const [area, setArea] = useState(null);
  const [result, setResult] = useState(null);

  const rand = useRef(null);
  const endAt = useRef(0);
  const shownAt = useRef(0);
  const busy = useRef(false);
  const stats = useRef({ found: 0, score: 0, streak: 0 });
  const round = useRef(0);
  const clock = useSharedValue(0);

  useEffect(() => {
    if (!cfg.wander) return;
    clock.set(withRepeat(withTiming(Math.PI * 2, { duration: 4200, easing: Easing.linear }), -1));
  }, [cfg.wander, clock]);

  const deal = useCallback(() => {
    setScene({ ...makeScene(round.current, rand.current, cfg), n: round.current });
    round.current += 1;
    setMarks({});
    setHint(false);
    shownAt.current = Date.now();
    busy.current = false;
  }, [cfg]);

  const finish = useCallback(() => {
    setPhase("over");
    const s = stats.current;
    setTimeout(() => {
      if (challenge.level) {
        const res = challenge.complete({ found: s.found, score: s.score }, {});
        setResult({ ...res, challenge: true });
        return;
      }
      const outcome = recordGame(GAME.id, s.score, { xp: 10 + Math.floor(s.score / 8) });
      setResult({ ...outcome, ...s });
    }, 400);
  }, [challenge, recordGame]);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, (endAt.current - Date.now()) / 1000);
      setTimeLeft(left);
      if ((Date.now() - shownAt.current) / 1000 > HINT_AFTER) setHint(true);
      if (left <= 0) {
        clearInterval(id);
        sfx("win");
        finish();
      }
    }, 150);
    return () => clearInterval(id);
  }, [phase, finish]);

  const start = () => {
    rand.current = createRng(Date.now() % 1000003);
    stats.current = { found: 0, score: 0, streak: 0 };
    round.current = 0;
    setHud({ found: 0, score: 0, streak: 0 });
    setResult(null);
    endAt.current = Date.now() + cfg.duration * 1000;
    setTimeLeft(cfg.duration);
    setPhase("playing");
    sfx("go");
    deal();
  };

  const tap = (i) => {
    if (phase !== "playing" || busy.current || !scene) return;
    const s = stats.current;
    if (i === scene.targetIndex) {
      busy.current = true;
      const pts = findPoints(secondsSince(shownAt.current), s.streak);
      s.found += 1;
      s.score += pts;
      s.streak += 1;
      setHud({ ...s });
      setMarks({ [i]: "right" });
      haptic.success();
      sfx(popFor(Math.min(4, 1 + Math.floor(s.streak / 3))));
      setTimeout(deal, 650);
      return;
    }
    if (marks[i]) return;
    s.streak = 0;
    setHud({ ...s });
    setMarks((m) => ({ ...m, [i]: "wrong" }));
    endAt.current -= cfg.penalty * 1000;
    haptic.error();
    sfx("wrong");
  };

  const W = area?.w ?? 0;
  const H = area?.h ?? 0;
  const ratio = Math.max(0, Math.min(1, timeLeft / cfg.duration));

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Find It"}
        score={hud.score}
        best={challenge.level ? challenge.bestLabel : best}
      />

      <View className="mt-3 px-5">
        <View className="flex-row items-center justify-between">
          {phase === "playing" && scene ? (
            <Animated.View key={scene.n} entering={ZoomIn.duration(240)}>
              <View
                style={cardShadow}
                className="flex-row items-center rounded-full bg-white py-1 pl-1 pr-4"
              >
                <View className="rounded-full bg-[#EAF8E2]">
                  <Mascot variant={scene.target} size={40} animated={false} />
                </View>
                <Text className="ml-1 font-body-black text-base text-ink">
                  Find {MASCOTS[scene.target].name}!
                </Text>
              </View>
            </Animated.View>
          ) : (
            <View />
          )}
          <View className="items-end">
            <Text className="font-body-black text-sm text-ink">⏱ {Math.ceil(timeLeft)}s</Text>
            <Text className="font-body-bold text-xs text-ink-soft">
              {hud.found} found{hud.streak >= 3 ? ` · 🔥${hud.streak}` : ""}
            </Text>
          </View>
        </View>
        <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/70">
          <View
            style={{
              width: `${ratio * 100}%`,
              height: "100%",
              borderRadius: 99,
              backgroundColor: ratio < 0.2 ? "#F0453A" : GAME.accent,
            }}
          />
        </View>
      </View>

      <View
        style={{ flex: 1, margin: 16, marginTop: 12, borderRadius: 28, overflow: "hidden" }}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <LinearGradient
          colors={["#BFEFA8", "#93DB7B", "#6FC765"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* a winding path through the park */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: -40,
            top: H * 0.45,
            width: W + 80,
            height: 46,
            borderRadius: 30,
            backgroundColor: "rgba(255,236,196,0.7)",
            transform: [{ rotate: "-8deg" }],
          }}
        />
        {area && phase !== "ready" && scene && (
          <>
            {scene.buddies.map((b, i) => (
              <Crowd
                key={`${scene.n}-${i}`}
                b={b}
                W={W}
                H={H}
                onTap={() => tap(i)}
                wander={cfg.wander}
                clock={clock}
                mark={marks[i]}
                hint={hint && i === scene.targetIndex}
              />
            ))}
            {scene.bushes.map((bush, i) => (
              <View
                key={`bush-${i}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: bush.x * W - bush.r * W,
                  top: bush.y * H - bush.r * W * 0.8,
                  width: bush.r * W * 2,
                  height: bush.r * W * 1.6,
                }}
              >
                {[
                  [0.1, 0.35, 0.55],
                  [0.45, 0.35, 0.55],
                  [0.25, 0.0, 0.6],
                ].map(([x, y, s], k) => (
                  <View
                    key={k}
                    style={{
                      position: "absolute",
                      left: x * bush.r * W * 2,
                      top: y * bush.r * W * 1.6,
                      width: s * bush.r * W * 2,
                      height: s * bush.r * W * 2,
                      borderRadius: bush.r * W,
                      backgroundColor: k === 2 ? "#3FAE5A" : "#2E9A4A",
                    }}
                  />
                ))}
              </View>
            ))}
          </>
        )}
        {phase === "ready" && (
          <View className="absolute inset-0 items-center justify-center px-5">
            <Animated.View entering={FadeIn.duration(200)} style={{ width: "100%" }}>
              <StartCard onPress={start} challenge={challenge} />
            </Animated.View>
          </View>
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
          title="Time's up!"
          game={GAME}
          score={hud.score}
          best={best}
          result={result}
          mood="success"
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.found} buddies found
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
