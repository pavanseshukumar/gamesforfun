import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import Svg, { Path, Rect } from "react-native-svg";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import { BALANCE_DEFAULTS } from "../../games/balance/levels";
import {
  BUDDY_R,
  createBalanceWorld,
  MAX_BOXES,
  MAX_STARS,
  PIVOT,
  PLANK,
  STAR_R,
  STEP_MS,
  WORLD,
} from "../../games/balance/world";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import useTilt from "../../lib/useTilt";
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

const GAME = getGame("balance");
const METRIC_UNITS = { seconds: "seconds", stars: "stars", score: "pts" };
const BOX_BASE = 6; // poses: plank (3) + buddy (3), then boxes (4 each), then stars (3 each)
const STAR_BASE = BOX_BASE + MAX_BOXES * 4;

// ---- sprites that follow the physics poses ------------------------------------------

function Plank({ poses, scale, width }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (PIVOT.x - width / 2) * scale },
      { translateY: (PIVOT.y - PLANK.h / 2) * scale },
      { rotate: `${poses.value[2] ?? 0}rad` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: width * scale,
          height: PLANK.h * scale,
          borderRadius: 8 * scale,
          backgroundColor: "#FF8A5B",
          borderWidth: 2 * scale,
          borderColor: "#E0603A",
        },
        style,
      ]}
    />
  );
}

function Buddy({ poses, scale, mood }) {
  const size = BUDDY_R * 2 * scale * 1.12;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (poses.value[3] ?? PIVOT.x) * scale - size / 2 },
      { translateY: (poses.value[4] ?? PIVOT.y) * scale - size * 0.62 },
      // Leans into the slope a little instead of spinning like a ball.
      { rotate: `${(poses.value[2] ?? 0) * 0.6}rad` },
    ],
  }));
  return (
    <Animated.View style={[{ position: "absolute" }, style]} pointerEvents="none">
      <Mascot variant={GAME.mascot} size={size} mood={mood} animated={false} />
    </Animated.View>
  );
}

function Crate({ poses, slot, scale }) {
  const o = BOX_BASE + slot * 4;
  const style = useAnimatedStyle(() => {
    const size = poses.value[o + 3] ?? 0;
    return {
      opacity: size > 0 ? 1 : 0,
      width: size * scale,
      height: size * scale,
      transform: [
        { translateX: ((poses.value[o] ?? -100) - size / 2) * scale },
        { translateY: ((poses.value[o + 1] ?? -100) - size / 2) * scale },
        { rotate: `${poses.value[o + 2] ?? 0}rad` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          borderRadius: 5,
          backgroundColor: "#D99A5B",
          borderWidth: 3,
          borderColor: "#A8672E",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: "45%",
          top: -10,
          bottom: -10,
          width: 3,
          backgroundColor: "#A8672E",
          transform: [{ rotate: "45deg" }],
        }}
      />
    </Animated.View>
  );
}

function StarSprite({ poses, slot, scale }) {
  const o = STAR_BASE + slot * 3;
  const size = STAR_R * 2 * scale;
  const style = useAnimatedStyle(() => ({
    opacity: poses.value[o + 2] ?? 0,
    transform: [
      { translateX: (poses.value[o] ?? -100) * scale - size / 2 },
      { translateY: (poses.value[o + 1] ?? -100) * scale - size / 2 },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute" }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6 5.6 21.1 7 14l-5.3-5 7.2-.9z"
          fill="#FFC83D"
          stroke="#E09A00"
          strokeWidth={1.2}
        />
      </Svg>
    </Animated.View>
  );
}

// ---- screens ------------------------------------------------------------------------

function StartPanel({ onPress, challenge, mode, setMode, tiltOk }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.06, { duration: 650 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <View
      style={{ alignItems: "center" }}
      className="mx-6 rounded-[28px] bg-white/90 px-5 pb-5 pt-3"
    >
      <Text style={[display(40), { marginTop: 2 }]}>Ready?</Text>
      {challenge.level ? (
        <ChallengeGoal level={challenge.level} n={challenge.n} />
      ) : (
        <Text className="mt-1 text-center font-body-semi text-sm leading-5 text-ink-soft">
          Tip the seesaw to keep Koko on top.{"\n"}Crates tip it too! Roll into ⭐ for +5.
        </Text>
      )}
      <View className="mt-3 flex-row rounded-full bg-[#EEF7F3] p-1">
        {[
          ["drag", "Drag"],
          ["tilt", "Tilt phone"],
        ].map(([key, label]) => {
          const on = mode === key;
          const disabled = key === "tilt" && tiltOk === false;
          return (
            <PressableScale
              key={key}
              onPress={() => !disabled && setMode(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled }}
            >
              <View
                className={`rounded-full px-4 py-1.5 ${on ? "bg-ink" : ""}`}
                style={{ opacity: disabled ? 0.4 : 1 }}
              >
                <Text className={`font-body-bold text-xs ${on ? "text-white" : "text-ink"}`}>
                  {label}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Animated.View entering={FadeIn.delay(200)}>
        <Animated.View style={[{ marginTop: 14 }, style]}>
          <PrimaryButton title="Start" icon="play" onPress={onPress} />
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
export default function BalanceScreen() {
  const { level } = useLocalSearchParams();
  return <BalanceBuddy key={level ?? "endless"} />;
}

function BalanceBuddy() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const mode = useGameStore((s) => s.controls?.balance ?? "drag");
  const setControl = useGameStore((s) => s.setControl);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [hud, setHud] = useState({ seconds: 0, stars: 0, score: 0 });
  const [result, setResult] = useState(null);
  const [area, setArea] = useState(null);
  const [world, setWorld] = useState(() =>
    createBalanceWorld({ ...BALANCE_DEFAULTS, ...(levelConfig ?? {}) }, 1),
  );

  const poses = useSharedValue(world.poses());
  const input = useRef(0);
  const { tilt, available: tiltOk } = useTilt(mode === "tilt" && phase === "playing");

  const scale = area ? Math.min(area.w / WORLD.w, area.h / (WORLD.h - 40)) : 0;

  const finish = useCallback(
    (w) => {
      setPhase("over");
      const stats = { seconds: Math.floor(w.time), stars: w.stars, score: w.score };
      if (challenge.level) {
        const res = challenge.complete(stats, { balanceStars: w.stars });
        setResult({ ...res, challenge: true });
        return;
      }
      const outcome = recordGame(GAME.id, w.score, {
        xp: 10 + Math.floor(w.score / 2),
        records: { balanceStars: w.stars },
      });
      setResult({ ...outcome, ...stats });
    },
    [challenge, recordGame],
  );

  // Physics loop: fixed 60 Hz steps, poses pushed to the sprites every frame.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    let raf;
    let last = performance.now();
    let acc = 0;
    let shownSecond = -1;
    const tick = (now) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= STEP_MS && !world.over) {
        acc -= STEP_MS;
        const steer = mode === "tilt" && tiltOk ? tilt.get() * 1.8 : input.current;
        for (const e of world.step(steer)) {
          if (e.type === "star") {
            sfx("star");
            haptic.tap();
          } else if (e.type === "fall") {
            sfx("wrong");
            haptic.error();
          } else if (e.type === "time") {
            sfx("win");
          }
        }
      }
      poses.set(world.poses());
      const sec = Math.floor(world.time);
      if (sec !== shownSecond || world.over) {
        shownSecond = sec;
        setHud({ seconds: sec, stars: world.stars, score: world.score });
      }
      if (world.over) {
        finish(world);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, world, mode, tiltOk, tilt, poses, finish]);

  const start = () => {
    const w = createBalanceWorld(
      { ...BALANCE_DEFAULTS, ...(levelConfig ?? {}) },
      (Date.now() % 100000) + 1,
    );
    setWorld(w);
    poses.set(w.poses());
    input.current = 0;
    setHud({ seconds: 0, stars: 0, score: 0 });
    setResult(null);
    setPhase("playing");
    sfx("go");
  };

  // Drag: the finger's distance from the middle sets the tilt; letting go levels it.
  const steer = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => {
      if (area) input.current = Math.max(-1, Math.min(1, (e.x - area.w / 2) / (area.w * 0.32)));
    },
    onUpdate: (e) => {
      if (area) input.current = Math.max(-1, Math.min(1, (e.x - area.w / 2) / (area.w * 0.32)));
    },
    onFinalize: () => {
      input.current = 0;
    },
  });

  const duration = world.config.duration;
  const timeLeft = duration ? Math.max(0, duration - hud.seconds) : null;
  const worldW = WORLD.w * scale;

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : GAME.title}
        score={hud.score}
        best={challenge.level ? challenge.bestLabel : best}
      />
      <View className="mt-3 flex-row items-center justify-between px-5">
        <Text className="font-body-black text-sm text-ink">
          ⏱ {timeLeft != null ? `${timeLeft}s left` : `${hud.seconds}s`}
        </Text>
        <Text className="font-body-black text-sm text-ink">⭐ {hud.stars}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <GestureDetector gesture={steer}>
          <View
            style={{ flex: 1, alignItems: "center" }}
            onLayout={(e) =>
              setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
            }
          >
            {scale > 0 && (
              <View style={{ width: worldW, height: (WORLD.h - 40) * scale }}>
                {/* the post the seesaw sits on */}
                <Svg
                  width={worldW}
                  height={(WORLD.h - 40) * scale}
                  style={{ position: "absolute" }}
                  pointerEvents="none"
                >
                  <Path
                    d={`M${(PIVOT.x - 28) * scale} ${(PIVOT.y + 70) * scale} L${PIVOT.x * scale} ${(PIVOT.y + 6) * scale} L${(PIVOT.x + 28) * scale} ${(PIVOT.y + 70) * scale} Z`}
                    fill="#5B6BD8"
                  />
                  <Rect
                    x={(PIVOT.x - 60) * scale}
                    y={(PIVOT.y + 68) * scale}
                    width={120 * scale}
                    height={10 * scale}
                    rx={5 * scale}
                    fill="#4553B8"
                  />
                </Svg>
                {Array.from({ length: MAX_BOXES }, (_, i) => (
                  <Crate key={`c${i}`} poses={poses} slot={i} scale={scale} />
                ))}
                {Array.from({ length: MAX_STARS }, (_, i) => (
                  <StarSprite key={`s${i}`} poses={poses} slot={i} scale={scale} />
                ))}
                <Plank poses={poses} scale={scale} width={world.plankW} />
                <Buddy
                  poses={poses}
                  scale={scale}
                  mood={phase === "over" ? "wow" : phase === "playing" ? "happy" : "cheer"}
                />
              </View>
            )}
          </View>
        </GestureDetector>
        {phase === "ready" && (
          <Animated.View
            entering={ZoomIn.springify().damping(12)}
            style={{ position: "absolute", top: 16, left: 0, right: 0 }}
          >
            <StartPanel
              onPress={start}
              challenge={challenge}
              mode={mode}
              setMode={(m) => setControl("balance", m)}
              tiltOk={tiltOk}
            />
          </Animated.View>
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
          title="Koko fell off!"
          game={GAME}
          score={hud.score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.seconds}s balanced · {result.stars} ⭐ caught
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
