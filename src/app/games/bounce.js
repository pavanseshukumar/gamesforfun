import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
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
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

const GAME = getGame("bounce");
const STEP = 118; // vertical distance between platforms
const PLAT_H = 18;
const PIP = 62; // mascot width
const PIP_H = PIP * 1.1;
const JUMP_S = 0.44; // seconds per hop
const PERFECT = 9; // px from centre that counts as a perfect landing
const EDGE = 8;

const TYPES = {
  normal: { top: "#FFFFFF", bottom: "#FFB3D6" },
  star: { top: "#FFF6B8", bottom: "#FFC300" },
  cloud: { top: "#F2F7FF", bottom: "#C9DBFF" },
  spring: { top: "#D9FBC0", bottom: "#4CC46B" },
};

const widthFor = (level) => Math.max(58, 150 - level * 2.2);
const speedFor = (level) => Math.min(560, 150 + level * 10);

function typeFor(level) {
  if (level < 2) return "normal";
  const r = Math.random();
  if (r < 0.14) return "star";
  if (level > 5 && r < 0.26) return "cloud";
  if (r < 0.34) return "spring";
  return "normal";
}

const freshSim = (w, h) => ({
  running: false,
  w,
  h,
  n: 0, // level Pip stands on
  mx: w / 2, // moving platform centre
  mw: widthFor(1),
  mdir: 1,
  mspeed: speedFor(1),
  waiting: false, // paused while JS sets up the next platform
  jt: -1, // jump progress 0..1, -1 when standing
  px: w / 2,
  pf: 0, // Pip's height in levels (float)
  falling: false,
  fallV: 0,
  done: false,
});

/** Visual platform: a chunky pill with a darker underside. */
function PlatformBody({ type, width }) {
  const t = TYPES[type];
  return (
    <View style={{ width, height: PLAT_H + 6 }}>
      <View
        style={{
          position: "absolute",
          top: 6,
          width,
          height: PLAT_H,
          borderRadius: PLAT_H,
          backgroundColor: t.bottom,
        }}
      />
      <View
        style={{
          width,
          height: PLAT_H,
          borderRadius: PLAT_H,
          backgroundColor: t.top,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {type === "spring" && <Text style={{ fontSize: 12 }}>⤴︎</Text>}
      </View>
      {type === "star" && (
        <Text style={{ position: "absolute", top: -26, alignSelf: "center", fontSize: 20 }}>
          ⭐
        </Text>
      )}
    </View>
  );
}

function MovingPlatform({ sim, baseY, type }) {
  const style = useAnimatedStyle(() => {
    const s = sim.value;
    return {
      width: s.mw,
      transform: [{ translateX: s.mx - s.mw / 2 }, { translateY: baseY - (s.n + 1) * STEP }],
      opacity: s.waiting ? 0 : 1,
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <PlatformBody type={type} width="100%" />
    </Animated.View>
  );
}

function Pip({ sim, baseY, squash }) {
  const style = useAnimatedStyle(() => {
    const s = sim.value;
    // Stretch tall mid-air, squash on landing.
    const air = s.jt >= 0 ? Math.sin(Math.PI * s.jt) : 0;
    const sy = 1 + 0.12 * air - 0.18 * squash.value;
    const sx = 1 - 0.08 * air + 0.16 * squash.value;
    return {
      transform: [
        { translateX: s.px - PIP / 2 },
        { translateY: baseY - s.pf * STEP - PIP_H + 4 },
        { scaleX: sx },
        { scaleY: sy },
        { rotate: s.falling ? `${Math.min(180, s.fallV * 14)}deg` : "0deg" },
      ],
    };
  });
  return (
    <Animated.View
      style={[{ position: "absolute", left: 0, top: 0, transformOrigin: "50% 100%" }, style]}
    >
      <Mascot variant={GAME.mascot} size={PIP} mood="cheer" animated={false} />
    </Animated.View>
  );
}

/** Puffy clouds that scroll at a third of the camera speed and wrap around. */
function ParallaxCloud({ cam, x, y, scale, height }) {
  const style = useAnimatedStyle(() => {
    const span = height + 120;
    const yy = (((y + cam.value * 0.35) % span) + span) % span;
    return { transform: [{ translateX: x }, { translateY: yy - 60 }, { scale }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <View
        style={{
          width: 90,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(255,255,255,0.8)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 18,
          top: -16,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(255,255,255,0.8)",
        }}
      />
    </Animated.View>
  );
}

export default function BounceBuddy() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [field, setField] = useState({ w: 360, h: 600 });
  const [score, setScore] = useState(0);
  const [height, setHeight] = useState(0);
  const [platforms, setPlatforms] = useState([]); // frozen platforms
  const [nextType, setNextType] = useState("normal");
  const [popups, setPopups] = useState([]);
  const [result, setResult] = useState(null);

  const sim = useSharedValue(freshSim(360, 600));
  const cam = useSharedValue(0);
  const squash = useSharedValue(0);
  const dusk = useSharedValue(0);
  const night = useSharedValue(0);
  const run = useRef({ score: 0, perfects: 0, bestPerfects: 0, streak: 0, level: 0 });
  const baseY = field.h - 110;

  const handlers = useRef(null);
  const emit = useCallback((type, a, b) => handlers.current?.(type, a, b), []);

  const loop = useFrameCallback((frame) => {
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    sim.modify((s) => {
      "worklet";
      if (!s.running) return s;

      if (!s.waiting && !s.falling) {
        s.mx += s.mdir * s.mspeed * dt;
        const lo = s.mw / 2 + EDGE;
        const hi = s.w - s.mw / 2 - EDGE;
        if (s.mx > hi) {
          s.mx = hi;
          s.mdir = -1;
        } else if (s.mx < lo) {
          s.mx = lo;
          s.mdir = 1;
        }
      }

      if (s.jt >= 0) {
        s.jt += dt / JUMP_S;
        if (s.jt >= 1) {
          s.jt = -1;
          const dx = s.px - s.mx;
          if (Math.abs(dx) <= s.mw / 2 + 4) {
            s.pf = s.n + 1;
            s.waiting = true;
            scheduleOnRN(emit, "land", dx, s.mx);
          } else {
            s.pf = s.n + 1;
            s.falling = true;
            s.fallV = 0;
            scheduleOnRN(emit, "miss", 0, 0);
          }
        } else {
          s.pf = s.n + s.jt + 0.55 * Math.sin(Math.PI * s.jt);
        }
      }

      if (s.falling) {
        s.fallV += 26 * dt;
        s.pf -= s.fallV * dt;
        if (!s.done && s.pf < s.n - 5) {
          s.done = true;
          s.running = false;
          scheduleOnRN(emit, "over", 0, 0);
        }
      }
      return s;
    });
  }, false);

  const popup = useCallback(
    (text, color) => {
      const id = Math.random();
      const x = sim.get().px;
      setPopups((p) => [...p, { id, x, y: baseY - PIP_H - 10, text, color }]);
      setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 700);
    },
    [sim, baseY],
  );

  useEffect(() => {
    handlers.current = (type, dx, mx) => {
      const r = run.current;
      if (type === "land") {
        const level = r.level + 1;
        r.level = level;
        const landedType = nextType;
        const perfect = Math.abs(dx) < PERFECT;
        let gained = 1;
        if (perfect) {
          r.streak++;
          r.perfects++;
          r.bestPerfects = Math.max(r.bestPerfects, r.perfects);
          gained += 2;
        } else {
          r.streak = 0;
        }
        if (landedType === "star") gained += 5;
        if (landedType === "spring") gained += 3;
        r.score += gained;
        setScore(r.score);
        setHeight(level);

        const s0 = sim.get();
        setPlatforms((list) => [...list.slice(-6), { level, x: mx, w: s0.mw, type: landedType }]);

        squash.set(withSequence(withTiming(1, { duration: 70 }), withSpring(0, BOUNCY)));
        cam.set(withSpring(level * STEP, { damping: 16, stiffness: 120 }));
        dusk.set(withTiming(Math.min(1, Math.max(0, (level - 15) / 15)), { duration: 900 }));
        night.set(withTiming(Math.min(1, Math.max(0, (level - 35) / 15)), { duration: 900 }));

        if (perfect) {
          haptic.success();
          popup(r.streak > 1 ? `PERFECT ×${r.streak}` : "PERFECT!", "#FF3D8B");
        } else if (landedType === "star") {
          haptic.success();
          popup("+5 ⭐", "#FFC300");
        } else if (landedType === "spring") {
          haptic.medium();
          popup("BOING +3", "#4CC46B");
        } else {
          haptic.tap();
        }

        // Set up the next moving platform and resume.
        const upcoming = typeFor(level + 1);
        setNextType(upcoming);
        const w = widthFor(level + 1);
        const dir = Math.random() < 0.5 ? 1 : -1;
        sim.modify((s) => {
          "worklet";
          s.n = level;
          s.mw = w;
          s.mspeed = speedFor(level + 1);
          s.mdir = dir;
          s.mx = dir === 1 ? w / 2 + EDGE : s.w - w / 2 - EDGE;
          s.waiting = false;
          return s;
        });

        // Clouds melt away: hop off within 1.4s or fall.
        if (landedType === "cloud") {
          setTimeout(() => {
            if (run.current.level !== level) return;
            setPlatforms((list) => list.filter((p) => p.level !== level));
            sim.modify((s) => {
              "worklet";
              if (s.n === level && s.jt < 0 && !s.falling) {
                s.falling = true;
                s.fallV = 0;
              }
              return s;
            });
            haptic.error();
          }, 1400);
        }
      } else if (type === "miss") {
        r.perfects = 0;
        haptic.error();
      } else if (type === "over") {
        loop.setActive(false);
        setPhase("over");
        haptic.heavy();
        const outcome = recordGame(GAME.id, r.score, {
          xp: 10 + r.level,
          records: { bounceHeight: r.level, bouncePerfects: r.bestPerfects },
        });
        setResult({ ...outcome, height: r.level, perfects: r.bestPerfects });
      }
    };
  }, [cam, dusk, loop, night, nextType, popup, recordGame, sim, squash]);

  const jump = () => {
    if (phase !== "playing") return;
    const s = sim.get();
    if (s.jt >= 0 || s.waiting || s.falling) return;
    sim.modify((v) => {
      "worklet";
      if (v.jt < 0 && !v.waiting && !v.falling) v.jt = 0;
      return v;
    });
    haptic.select();
  };

  const start = () => {
    run.current = { score: 0, perfects: 0, bestPerfects: 0, streak: 0, level: 0 };
    setScore(0);
    setHeight(0);
    setPopups([]);
    setResult(null);
    setNextType("normal");
    setPlatforms([{ level: 0, x: field.w / 2, w: 170, type: "normal" }]);
    cam.set(0);
    dusk.set(0);
    night.set(0);
    const fresh = freshSim(field.w, field.h);
    fresh.mx = fresh.mw / 2 + EDGE;
    fresh.running = true;
    sim.set(fresh);
    setPhase("playing");
    loop.setActive(true);
  };

  const worldStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cam.value }] }));
  const duskStyle = useAnimatedStyle(() => ({ opacity: dusk.value }));
  const nightStyle = useAnimatedStyle(() => ({ opacity: night.value }));

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader title="Bounce" score={score} best={best} />

      <View
        style={{ flex: 1, margin: 20, marginTop: 14, borderRadius: 32, overflow: "hidden" }}
        onLayout={(e) => {
          const { width, height: h } = e.nativeEvent.layout;
          setField({ w: width, h });
          sim.modify((s) => {
            "worklet";
            s.w = width;
            s.h = h;
            return s;
          });
        }}
        onStartShouldSetResponder={() => phase === "playing"}
        onResponderGrant={jump}
      >
        {/* Sky: day → sunset → night as you climb */}
        <LinearGradient
          colors={["#8FD3FF", "#FFE3F1"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, duskStyle]}
        >
          <LinearGradient colors={["#FF8A65", "#FFC6A8"]} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, nightStyle]}
        >
          <LinearGradient colors={["#1C1A4A", "#5B3E9E"]} style={{ flex: 1 }} />
        </Animated.View>

        {[
          [20, 60, 1],
          [220, 200, 0.8],
          [80, 380, 1.1],
          [250, 520, 0.9],
        ].map(([x, y, sc], i) => (
          <ParallaxCloud key={i} cam={cam} x={x} y={y} scale={sc} height={field.h} />
        ))}

        <Text
          pointerEvents="none"
          style={[
            display(120),
            { position: "absolute", top: 10, alignSelf: "center", color: "rgba(255,255,255,0.55)" },
          ]}
        >
          {height}
        </Text>

        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, worldStyle]}
        >
          {platforms.map((p) => (
            <Animated.View
              key={p.level}
              exiting={FadeOut.duration(250)}
              style={{ position: "absolute", left: p.x - p.w / 2, top: baseY - p.level * STEP }}
            >
              <PlatformBody type={p.type} width={p.w} />
            </Animated.View>
          ))}
          {phase === "playing" && <MovingPlatform sim={sim} baseY={baseY} type={nextType} />}
          {phase !== "ready" && <Pip sim={sim} baseY={baseY} squash={squash} />}
        </Animated.View>

        {popups.map((p) => (
          <ScorePopup key={p.id} {...p} />
        ))}

        {phase === "playing" && height === 0 && (
          <Animated.View
            entering={FadeIn.delay(300)}
            exiting={FadeOut}
            pointerEvents="none"
            style={{ position: "absolute", bottom: 24, alignSelf: "center" }}
          >
            <View className="rounded-full bg-white px-4 py-2">
              <Text className="font-body-bold text-sm text-ink">👆 Tap anywhere to hop!</Text>
            </View>
          </Animated.View>
        )}

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
              backgroundColor: "rgba(255,242,248,0.85)",
            }}
          >
            <Animated.View entering={ZoomIn.springify().damping(11)}>
              <Mascot variant={GAME.mascot} size={130} mood="cheer" />
            </Animated.View>
            <Text style={[display(44), { marginTop: 6 }]}>Bounce Buddy</Text>
            <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
              Tap to hop onto the sliding platform above.{"\n"}Land dead-centre for a PERFECT.
              {"\n"}⭐ +5 · springs +3 · clouds melt fast!
            </Text>
            <PrimaryButton
              title="Start climbing"
              icon="arrow-up"
              onPress={start}
              style={{ marginTop: 18 }}
            />
          </Animated.View>
        )}
      </View>

      {phase === "over" && result && (
        <GameOverModal
          title="Whoops!"
          game={GAME}
          score={score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              Height {result.height} · {result.perfects} perfect landing
              {result.perfects === 1 ? "" : "s"}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
