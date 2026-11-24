import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { PrimaryButton } from "../../components/Buttons";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import ScorePopup from "../../components/ScorePopup";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { BOUNCY } from "../../lib/motion";
import useTilt from "../../lib/useTilt";
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

const GAME = getGame("color-catch");
const COLORS = ["#FF4D6D", "#3F8CFF", "#2BD67B", "#FFB800"];
const NAMES = ["Red", "Blue", "Green", "Yellow"];
const POOL = 12; // max drops on screen at once
const R = 17; // drop radius
const BASKET_W = 104;
const PLAYER_H = 118; // mascot + basket height
const SWITCH_EVERY = 8; // seconds between target colour changes
const LIVES = 3;

// Drop kinds
const DROP = 0;
const STAR = 1; // grants a shield
const CLOCK = 2; // slows time for a moment

const freshDrops = () =>
  Array.from({ length: POOL }, () => ({ a: 0, x: 0, y: 0, v: 0, c: 0, k: DROP }));

const freshSim = (w, h) => ({
  running: false,
  w,
  h,
  px: w / 2,
  t: 0,
  spawnAcc: 0,
  target: 0,
  next: 1,
  targetT: 0,
  warned: false,
  slowT: 0,
  drops: freshDrops(),
});

function Drop({ i, sim }) {
  const style = useAnimatedStyle(() => {
    const d = sim.value.drops[i];
    const wobble = 1 + 0.08 * Math.sin(sim.value.t * 9 + i);
    return {
      opacity: d.a ? 1 : 0,
      backgroundColor: d.k === DROP ? COLORS[d.c] : d.k === STAR ? "#FFE14D" : "#FFFFFF",
      transform: [
        { translateX: d.x - R },
        { translateY: d.y - R },
        { scaleX: wobble },
        { rotate: d.k === DROP ? "45deg" : "0deg" },
      ],
    };
  });
  const starStyle = useAnimatedStyle(() => ({ opacity: sim.value.drops[i].k === STAR ? 1 : 0 }));
  const clockStyle = useAnimatedStyle(() => ({ opacity: sim.value.drops[i].k === CLOCK ? 1 : 0 }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: R * 2,
          height: R * 2,
          borderRadius: R,
          borderTopLeftRadius: 3,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#1A1A40",
          shadowOpacity: 0.18,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: 7,
          left: 9,
          width: 9,
          height: 6,
          borderRadius: 4,
          backgroundColor: "rgba(255,255,255,0.65)",
        }}
      />
      <Animated.Text style={[{ position: "absolute", fontSize: 18 }, starStyle]}>⭐</Animated.Text>
      <Animated.Text style={[{ position: "absolute", fontSize: 18 }, clockStyle]}>⏳</Animated.Text>
    </Animated.View>
  );
}

function Player({ sim, pulse, shield }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sim.value.px - BASKET_W / 2 }],
  }));
  const squash = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 - 0.12 * pulse.value }, { scaleX: 1 + 0.1 * pulse.value }],
  }));
  const basket = useAnimatedStyle(() => ({ backgroundColor: COLORS[sim.value.target] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", bottom: 14, left: 0, width: BASKET_W, height: PLAYER_H },
        style,
      ]}
    >
      <Animated.View style={[{ alignItems: "center", transformOrigin: "50% 100%" }, squash]}>
        <Mascot variant={GAME.mascot} size={84} mood="cheer" />
        <Animated.View
          style={[
            {
              marginTop: -34,
              width: BASKET_W,
              height: 34,
              borderBottomLeftRadius: 34,
              borderBottomRightRadius: 34,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderWidth: 3,
              borderColor: "#FFFFFF",
            },
            basket,
          ]}
        />
      </Animated.View>
      {shield && (
        <View
          style={{
            position: "absolute",
            left: -10,
            top: -8,
            width: BASKET_W + 20,
            height: PLAYER_H + 10,
            borderRadius: 60,
            borderWidth: 3,
            borderColor: "#FFE14D",
            backgroundColor: "rgba(255,225,77,0.15)",
          }}
        />
      )}
    </Animated.View>
  );
}

export default function ColorCatch() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const mode = useGameStore((s) => s.controls?.colorCatch ?? "tilt");

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [target, setTarget] = useState(0);
  const [warning, setWarning] = useState(null); // upcoming colour index
  const [shield, setShield] = useState(false);
  const [slow, setSlow] = useState(false);
  const [popups, setPopups] = useState([]);
  const [result, setResult] = useState(null);

  const { tilt, available: tiltAvailable } = useTilt(mode === "tilt" && phase === "playing");
  const useTiltNow = mode === "tilt" && tiltAvailable === true;

  const sim = useSharedValue(freshSim(360, 600));
  const dragX = useSharedValue(-1);
  const keyDir = useSharedValue(0);
  const tiltOn = useSharedValue(false);
  const pulse = useSharedValue(0);
  const flash = useSharedValue(0);
  const shake = useSharedValue(0);

  const run = useRef({
    score: 0,
    streak: 0,
    lives: LIVES,
    shield: false,
    switches: 0,
    clean: 0,
    lostLife: false,
  });

  useEffect(() => {
    tiltOn.set(useTiltNow);
  }, [useTiltNow, tiltOn]);

  // ---- UI-thread simulation -------------------------------------------------
  const handlers = useRef(null);
  const emit = useCallback((type, a, b) => handlers.current?.(type, a, b), []);

  const loop = useFrameCallback((frame) => {
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    sim.modify((s) => {
      "worklet";
      if (!s.running) return s;
      s.t += dt;
      const half = BASKET_W / 2;
      const margin = half + 14; // keep the basket clear of the rounded corners

      // Movement: drag wins, then keyboard, then tilt.
      if (dragX.value >= 0) s.px += (dragX.value - s.px) * Math.min(1, dt * 18);
      else if (keyDir.value !== 0) s.px += keyDir.value * 560 * dt;
      else if (tiltOn.value) {
        const t = tilt.value;
        const k = Math.abs(t) < 0.04 ? 0 : Math.max(-1, Math.min(1, t / 0.35));
        s.px += k * 760 * dt;
      }
      s.px = Math.max(margin, Math.min(s.w - margin, s.px));

      // Target colour rotation, with a warning shortly before each switch.
      s.targetT += dt;
      if (!s.warned && s.targetT > SWITCH_EVERY - 1.6) {
        s.warned = true;
        scheduleOnRN(emit, "warn", s.next);
      }
      if (s.targetT >= SWITCH_EVERY) {
        s.target = s.next;
        let n = Math.floor(Math.random() * 3);
        if (n >= s.target) n += 1;
        s.next = n;
        s.targetT = 0;
        s.warned = false;
        scheduleOnRN(emit, "switch", s.target);
      }

      // Spawning gets faster over time.
      s.spawnAcc += dt;
      const interval = Math.max(0.36, 0.95 - s.t * 0.008);
      if (s.spawnAcc >= interval) {
        s.spawnAcc = 0;
        for (let i = 0; i < POOL; i++) {
          const d = s.drops[i];
          if (d.a) continue;
          const roll = Math.random();
          d.k = roll < 0.05 ? STAR : roll < 0.09 ? CLOCK : DROP;
          let c = s.target;
          if (Math.random() > 0.45) {
            c = Math.floor(Math.random() * 3);
            if (c >= s.target) c += 1;
          }
          d.c = c;
          d.x = R + 6 + Math.random() * (s.w - 2 * R - 12);
          d.y = -R;
          d.v = Math.min(440, 160 + s.t * 3.4) * (0.85 + Math.random() * 0.3);
          d.a = 1;
          break;
        }
      }

      // Falling + catching.
      const slowF = s.slowT > 0 ? 0.4 : 1;
      if (s.slowT > 0) s.slowT -= dt;
      const catchY = s.h - PLAYER_H + 38;
      for (let i = 0; i < POOL; i++) {
        const d = s.drops[i];
        if (!d.a) continue;
        d.y += d.v * dt * slowF;
        if (d.y >= catchY && d.y <= catchY + 34 && Math.abs(d.x - s.px) < half + R * 0.4) {
          d.a = 0;
          // Packed event code: kind, whether it matched the target, and its colour.
          scheduleOnRN(emit, "catch", d.k * 100 + (d.c === s.target ? 10 : 0) + d.c, d.x);
        } else if (d.y > s.h + R * 2) {
          d.a = 0;
        }
      }
      return s;
    });
  }, false);

  // ---- JS-side reactions to simulation events -------------------------------
  const addPopup = useCallback(
    (x, text, color) => {
      const id = Math.random();
      const y = sim.get().h - PLAYER_H + 20;
      setPopups((p) => [...p, { id, x, y, text, color }]);
      setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 700);
    },
    [sim],
  );

  const endGame = useCallback(() => {
    loop.setActive(false);
    sim.modify((s) => {
      "worklet";
      s.running = false;
      return s;
    });
    setPhase("over");
    haptic.heavy();
    const r = run.current;
    const outcome = recordGame(GAME.id, r.score, {
      xp: 10 + Math.floor(r.score / 2),
      records: { ccSwitches: r.switches, ccClean: r.clean },
    });
    setResult({ ...outcome, switches: r.switches });
  }, [loop, sim, recordGame]);

  useEffect(() => {
    handlers.current = (type, a, b) => {
      const r = run.current;
      if (type === "warn") {
        setWarning(a);
        haptic.select();
      } else if (type === "switch") {
        setTarget(a);
        setWarning(null);
        r.switches++;
        haptic.medium();
      } else if (type === "catch") {
        const kind = Math.floor(a / 100);
        const good = Math.floor(a / 10) % 10 === 1;
        const color = COLORS[a % 10];
        pulse.set(withSequence(withTiming(1, { duration: 70 }), withSpring(0, BOUNCY)));
        if (kind === STAR) {
          r.shield = true;
          setShield(true);
          r.score += 3;
          haptic.success();
          addPopup(b, "+3 🛡", "#FFB800");
        } else if (kind === CLOCK) {
          sim.modify((s) => {
            "worklet";
            s.slowT = 3;
            return s;
          });
          setSlow(true);
          setTimeout(() => setSlow(false), 3000);
          r.score += 1;
          haptic.success();
          addPopup(b, "SLOW-MO", "#3F8CFF");
        } else if (good) {
          r.streak++;
          const mult = 1 + Math.floor(r.streak / 8);
          r.score += mult;
          haptic.tap();
          addPopup(b, `+${mult}`, color);
        } else if (r.shield) {
          r.shield = false;
          setShield(false);
          r.streak = 0;
          haptic.medium();
          addPopup(b, "BLOCKED", "#FFB800");
        } else {
          r.streak = 0;
          r.lives--;
          if (!r.lostLife) {
            r.lostLife = true;
            r.clean = r.score;
          }
          setLives(r.lives);
          haptic.error();
          flash.set(
            withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 380 })),
          );
          shake.set(
            withSequence(
              withTiming(-8, { duration: 40 }),
              withTiming(8, { duration: 40 }),
              withTiming(0, { duration: 40 }),
            ),
          );
          if (r.lives <= 0) endGame();
        }
        if (!r.lostLife) r.clean = r.score;
        setScore(r.score);
      }
    };
  }, [addPopup, endGame, flash, pulse, shake, sim]);

  const start = () => {
    run.current = {
      score: 0,
      streak: 0,
      lives: LIVES,
      shield: false,
      switches: 0,
      clean: 0,
      lostLife: false,
    };
    setScore(0);
    setLives(LIVES);
    setShield(false);
    setSlow(false);
    setWarning(null);
    setPopups([]);
    setResult(null);
    setTarget(0);
    const { w, h } = sim.get();
    const fresh = freshSim(w, h);
    fresh.target = Math.floor(Math.random() * 4);
    fresh.next = (fresh.target + 1 + Math.floor(Math.random() * 3)) % 4;
    fresh.running = true;
    setTarget(fresh.target);
    sim.set(fresh);
    setPhase("playing");
    loop.setActive(true);
  };

  // Arrow keys on web.
  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const down = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") keyDir.set(-1);
      if (e.key === "ArrowRight" || e.key === "d") keyDir.set(1);
    };
    const up = (e) => {
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) keyDir.set(0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [keyDir]);

  const drag = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => dragX.set(e.x),
    onUpdate: (e) => dragX.set(e.x),
    onFinalize: () => dragX.set(-1),
  });

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.35 }));
  const fieldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const controlHint =
    mode === "drag" || tiltAvailable === false
      ? "Drag to move Sunny"
      : "Tilt your phone to move Sunny";

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader title={GAME.title} score={score} best={best} />

      {/* Target banner */}
      <View className="mt-4 flex-row items-center justify-between px-5">
        <View className="flex-row items-center rounded-full bg-white px-2 py-1.5">
          <View
            style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS[target] }}
          />
          <Text className="ml-2 mr-2 font-body-black text-sm text-ink">Catch {NAMES[target]}</Text>
          {warning != null && (
            <Animated.View key={warning} entering={ZoomIn.springify()} exiting={FadeOut}>
              <View className="flex-row items-center rounded-full bg-ink px-2.5 py-1">
                <Text className="font-body-black text-xs text-white">Next</Text>
                <View
                  style={{
                    marginLeft: 6,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: COLORS[warning],
                  }}
                />
              </View>
            </Animated.View>
          )}
        </View>
        <View className="flex-row gap-1">
          {Array.from({ length: LIVES }, (_, i) => (
            <Text key={i} style={{ fontSize: 20, opacity: i < lives ? 1 : 0.25 }}>
              ❤️
            </Text>
          ))}
        </View>
      </View>
      {slow && (
        <Text className="mt-1 text-center font-body-black text-xs text-[#3F8CFF]">⏳ Slow-mo!</Text>
      )}

      <GestureDetector gesture={drag}>
        <Animated.View style={[{ flex: 1, margin: 20, marginTop: 12 }, fieldStyle]}>
          <View
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              sim.modify((s) => {
                "worklet";
                s.w = width;
                s.h = height;
                if (!s.running) s.px = width / 2;
                return s;
              });
            }}
            style={{
              flex: 1,
              borderRadius: 32,
              backgroundColor: "rgba(255,255,255,0.45)",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.9)",
              overflow: "hidden",
            }}
          >
            {Array.from({ length: POOL }, (_, i) => (
              <Drop key={i} i={i} sim={sim} />
            ))}
            <Player sim={sim} pulse={pulse} shield={shield} />
            {popups.map((p) => (
              <ScorePopup key={p.id} {...p} />
            ))}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "#FF4D6D",
                },
                flashStyle,
              ]}
            />

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
                  backgroundColor: "rgba(255,245,239,0.85)",
                }}
              >
                <Animated.View entering={ZoomIn.springify().damping(11)}>
                  <Mascot variant={GAME.mascot} size={130} mood="cheer" />
                </Animated.View>
                <Text style={[display(44), { marginTop: 6 }]}>Color Catch</Text>
                <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
                  Catch only the colour shown up top.{"\n"}Wrong colour costs a ❤️ · it changes
                  every {SWITCH_EVERY}s.{"\n"}⭐ = shield · ⏳ = slow-mo
                </Text>
                <View className="mt-3 rounded-full bg-white px-4 py-2">
                  <Text className="font-body-bold text-xs text-ink">📱 {controlHint}</Text>
                </View>
                <PrimaryButton
                  title="Start"
                  icon="color-palette"
                  onPress={start}
                  style={{ marginTop: 18 }}
                />
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </GestureDetector>

      {phase === "over" && result && (
        <GameOverModal
          title="Out of hearts!"
          game={GAME}
          score={score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              Survived {result.switches} colour switch{result.switches === 1 ? "" : "es"}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
