import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Grump from "../../components/Grump";
import Mascot from "../../components/Mascot";
import ScorePopup from "../../components/ScorePopup";
import { getGame } from "../../games/registry";
import { SLICE_DEFAULTS } from "../../games/slice/levels";
import useChallenge from "../../games/useChallenge";
import { comboBonus, GRAVITY, launchVy, segmentDistance, waveFor } from "../../games/slice/logic";
import { haptic } from "../../lib/haptics";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

const GAME = getGame("slice");
const POOL = 12;
const R = 30; // bubble radius
const METRIC_UNITS = { score: "pts", combo: "in one swipe", sliced: "sliced" };
const TRAIL = 10; // trail points kept
const TRAIL_LIFE = 0.18; // seconds a trail point stays visible
const COLORS = ["#FF5C8A", "#3F8CFF", "#2BD67B", "#FFB800", "#A26BFA", "#FF8A3D"];
const GRUMP_COLOR = "#8E6CE8";
// item kinds
const BUBBLE = 0;
const GRUMP = 1;
const GOLDEN = 2;

const freshItems = () =>
  Array.from({ length: POOL }, () => ({
    a: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    k: BUBBLE,
    c: 0,
    sliced: 0,
    st: 0,
    ang: 0,
    rot: 0,
    vr: 0,
  }));

// Level rules live in the sim so the UI-thread worklet can read them.
const freshSim = (w, h, cfg = SLICE_DEFAULTS) => ({
  grumpScale: cfg.grumpScale,
  goldenRate: cfg.goldenRate,
  waveScale: cfg.waveScale,
  sizeBonus: cfg.sizeBonus,
  running: false,
  w,
  h,
  t: 0,
  nextWave: 0.6,
  items: freshItems(),
  trail: [],
  swipeHits: 0,
});

function Item({ i, sim }) {
  const D = R * 2;
  const pos = useAnimatedStyle(() => {
    const it = sim.value.items[i];
    return {
      opacity: it.a ? (it.sliced ? Math.max(0, 1 - it.st / 0.7) : 1) : 0,
      transform: [{ translateX: it.x - R }, { translateY: it.y - R }],
    };
  });
  const whole = useAnimatedStyle(() => {
    const it = sim.value.items[i];
    return {
      opacity: it.sliced ? 0 : 1,
      backgroundColor: it.k === GRUMP ? "transparent" : it.k === GOLDEN ? "#FFD43B" : COLORS[it.c],
      transform: [{ rotate: `${it.rot}rad` }],
    };
  });
  const grumpStyle = useAnimatedStyle(() => {
    const it = sim.value.items[i];
    return { opacity: it.k === GRUMP && !it.sliced ? 1 : 0 };
  });
  const halves = useAnimatedStyle(() => {
    const it = sim.value.items[i];
    return { opacity: it.sliced ? 1 : 0, transform: [{ rotate: `${it.ang}rad` }] };
  });
  const halfColor = useAnimatedStyle(() => {
    const it = sim.value.items[i];
    return {
      backgroundColor: it.k === GRUMP ? GRUMP_COLOR : it.k === GOLDEN ? "#FFD43B" : COLORS[it.c],
    };
  });
  const topHalf = useAnimatedStyle(() => ({
    transform: [
      { translateY: -sim.value.items[i].st * 90 },
      { rotate: `${-sim.value.items[i].st * 1.2}rad` },
    ],
  }));
  const bottomHalf = useAnimatedStyle(() => ({
    transform: [
      { translateY: sim.value.items[i].st * 90 },
      { rotate: `${sim.value.items[i].st * 1.2}rad` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: D, height: D }, pos]}
    >
      {/* the whole bubble */}
      <Animated.View
        style={[{ position: "absolute", width: D, height: D, borderRadius: R }, whole]}
      >
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 12,
            width: 18,
            height: 10,
            borderRadius: 6,
            backgroundColor: "rgba(255,255,255,0.7)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 9,
            right: 12,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
      </Animated.View>
      <Animated.View style={[{ position: "absolute" }, grumpStyle]}>
        <Grump size={D} />
      </Animated.View>
      {/* the two halves after a slice, split along the swipe */}
      <Animated.View style={[{ position: "absolute", width: D, height: D }, halves]}>
        <Animated.View
          style={[
            { position: "absolute", top: 0, width: D, height: R, overflow: "hidden" },
            topHalf,
          ]}
        >
          <Animated.View style={[{ width: D, height: D, borderRadius: R }, halfColor]} />
        </Animated.View>
        <Animated.View
          style={[
            { position: "absolute", top: R, width: D, height: R, overflow: "hidden" },
            bottomHalf,
          ]}
        >
          <Animated.View
            style={[{ width: D, height: D, borderRadius: R, marginTop: -R }, halfColor]}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** One segment of the swipe trail (between trail points j and j+1). */
function TrailSegment({ j, sim }) {
  const style = useAnimatedStyle(() => {
    const s = sim.value;
    const a = s.trail[j];
    const b = s.trail[j + 1];
    if (!a || !b) return { opacity: 0 };
    const age = s.t - b.t;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return {
      opacity: Math.max(0, 1 - age / TRAIL_LIFE),
      width: Math.hypot(dx, dy) + 6,
      transform: [
        { translateX: a.x - 3 },
        { translateY: a.y - 4 },
        { rotate: `${Math.atan2(dy, dx)}rad` },
      ],
    };
  });
  const thickness = 3 + (j / TRAIL) * 7;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          height: thickness,
          borderRadius: thickness,
          backgroundColor: "#FFFFFF",
          transformOrigin: "3px 50%",
        },
        style,
      ]}
    />
  );
}

// Remount per level so every level starts from a clean slate.
export default function SliceSplashScreen() {
  const { level } = useLocalSearchParams();
  return <SliceSplash key={level ?? "endless"} />;
}

function SliceSplash() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const cfg = useMemo(
    () => ({ ...SLICE_DEFAULTS, ...(challenge.level?.config ?? {}) }),
    [challenge.level],
  );
  const LIVES = cfg.lives;

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [popups, setPopups] = useState([]);
  const [result, setResult] = useState(null);

  const sim = useSharedValue(freshSim(360, 600));
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  const run = useRef({
    score: 0,
    lives: LIVES,
    bestCombo: 0,
    clean: 0,
    sliced: 0,
    hitGrump: false,
  });
  const roundTimer = useRef(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const popupId = useRef(0);

  const handlers = useRef(null);
  const emit = useCallback((type, a, b, c, d) => handlers.current?.(type, a, b, c, d), []);

  // ---- physics + spawning on the UI thread --------------------------------------
  const loop = useFrameCallback((frame) => {
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    sim.modify((s) => {
      "worklet";
      if (!s.running) return s;
      s.t += dt;

      if (s.t >= s.nextWave) {
        const wave = waveFor(s.t);
        s.nextWave = s.t + wave.interval * s.waveScale * (0.8 + Math.random() * 0.4);
        const grumpChance = wave.grumpChance * s.grumpScale;
        let launched = 0;
        for (let i = 0; i < POOL && launched < wave.size + s.sizeBonus; i++) {
          const it = s.items[i];
          if (it.a) continue;
          const x = R + Math.random() * (s.w - 2 * R);
          const roll = Math.random();
          it.k = roll < grumpChance ? GRUMP : roll < grumpChance + s.goldenRate ? GOLDEN : BUBBLE;
          it.c = Math.floor(Math.random() * COLORS.length);
          it.x = x;
          it.y = s.h + R;
          // Lean toward the middle so bubbles cross the screen.
          it.vx = (s.w / 2 - x) * (0.4 + Math.random() * 0.5);
          it.vy = launchVy(s.h + R, s.h * (0.12 + Math.random() * 0.3));
          it.rot = 0;
          it.vr = (Math.random() - 0.5) * 3;
          it.sliced = 0;
          it.st = 0;
          it.a = 1;
          launched++;
        }
      }

      for (let i = 0; i < POOL; i++) {
        const it = s.items[i];
        if (!it.a) continue;
        it.vy += GRAVITY * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
        if (it.sliced) {
          it.st += dt;
          if (it.st > 0.8) it.a = 0;
        } else if (it.vy > 0 && it.y > s.h + R * 2) {
          it.a = 0;
          if (it.k !== GRUMP) scheduleOnRN(emit, "miss", it.x, 0, 0);
        }
      }
      // Drop stale trail points.
      while (s.trail.length && s.t - s.trail[0].t > TRAIL_LIFE) s.trail.shift();
      return s;
    });
  }, false);

  // ---- slicing: hit-test each swipe segment on the UI thread ----------------------
  const slicePan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      "worklet";
      sim.modify((s) => {
        "worklet";
        s.trail = [{ x: e.x, y: e.y, t: s.t }];
        s.swipeHits = 0;
        return s;
      });
    },
    onUpdate: (e) => {
      "worklet";
      sim.modify((s) => {
        "worklet";
        if (!s.running) return s;
        const prev = s.trail[s.trail.length - 1] ?? { x: e.x, y: e.y };
        for (let i = 0; i < POOL; i++) {
          const it = s.items[i];
          if (!it.a || it.sliced) continue;
          if (segmentDistance(it.x, it.y, prev.x, prev.y, e.x, e.y) < R * 0.95) {
            it.sliced = 1;
            it.st = 0;
            it.ang = Math.atan2(e.y - prev.y, e.x - prev.x);
            s.swipeHits += 1;
            scheduleOnRN(emit, "slice", it.k, it.x, it.y, s.swipeHits);
          }
        }
        s.trail.push({ x: e.x, y: e.y, t: s.t });
        if (s.trail.length > TRAIL) s.trail.shift();
        return s;
      });
    },
    onFinalize: (e) => {
      "worklet";
      sim.modify((s) => {
        "worklet";
        if (s.swipeHits >= 3) scheduleOnRN(emit, "combo", s.swipeHits, e.x, e.y);
        s.swipeHits = 0;
        return s;
      });
    },
  });

  // ---- JS-side reactions ------------------------------------------------------------
  const addPopup = useCallback((x, y, text, color) => {
    const id = ++popupId.current;
    setPopups((p) => [...p, { id, x, y, text, color }]);
    setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 700);
  }, []);

  const endGame = useCallback(() => {
    loop.setActive(false);
    sim.modify((s) => {
      "worklet";
      s.running = false;
      return s;
    });
    setPhase("over");
    haptic.heavy();
    clearTimeout(roundTimer.current);
    const r = run.current;
    const records = { ssBestCombo: r.bestCombo, ssClean: r.clean };
    if (challenge.level) {
      const res = challenge.complete(
        { score: r.score, combo: r.bestCombo, sliced: r.sliced },
        records,
      );
      setResult({ ...res, challenge: true });
      return;
    }
    const outcome = recordGame(GAME.id, r.score, {
      xp: 10 + Math.floor(r.score / 2),
      records,
    });
    setResult({ ...outcome, bestCombo: r.bestCombo });
  }, [challenge, loop, recordGame, sim]);
  useEffect(() => () => clearTimeout(roundTimer.current), []);

  // Visible countdown for timed levels.
  const timed = cfg.duration > 0 && phase === "playing";
  useEffect(() => {
    if (!timed) return undefined;
    const id = setInterval(() => setSecondsLeft((t) => Math.max(0, (t ?? 0) - 1)), 1000);
    return () => clearInterval(id);
  }, [timed]);

  const loseLife = useCallback(() => {
    const r = run.current;
    r.lives -= 1;
    setLives(r.lives);
    flash.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 380 })));
    shake.set(
      withSequence(
        withTiming(-8, { duration: 40 }),
        withTiming(8, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      ),
    );
    if (r.lives <= 0) endGame();
  }, [endGame, flash, shake]);

  useEffect(() => {
    handlers.current = (type, a, b, c, d) => {
      const r = run.current;
      if (r.lives <= 0) return;
      if (type === "slice") {
        const kind = a;
        const y = c;
        const nth = d; // position in this swipe's combo
        if (kind === GRUMP) {
          if (!r.hitGrump) {
            r.hitGrump = true;
            r.clean = r.score;
          }
          haptic.error();
          sfx("wrong");
          addPopup(b, y, "OUCH!", GRUMP_COLOR);
          loseLife();
          return;
        }
        const points = kind === GOLDEN ? 5 : 1;
        r.score += points;
        r.sliced += 1;
        if (!r.hitGrump) r.clean = r.score;
        setScore(r.score);
        haptic.tap();
        sfx(kind === GOLDEN ? "star" : popFor(nth));
        addPopup(b, y, `+${points}`, kind === GOLDEN ? "#FFB800" : "#FF5C8A");
      } else if (type === "combo") {
        const bonus = comboBonus(a);
        r.bestCombo = Math.max(r.bestCombo, a);
        r.score += bonus;
        if (!r.hitGrump) r.clean = r.score;
        setScore(r.score);
        haptic.success();
        sfx("perfect");
        addPopup(b, c, `COMBO ×${a} +${bonus}`, "#8A5CFF");
      } else if (type === "miss") {
        haptic.medium();
        sfx("land");
        loseLife();
      }
    };
  }, [addPopup, loseLife]);

  const start = () => {
    run.current = { score: 0, lives: LIVES, bestCombo: 0, clean: 0, sliced: 0, hitGrump: false };
    setScore(0);
    setLives(LIVES);
    setPopups([]);
    setResult(null);
    const { w, h } = sim.get();
    const fresh = freshSim(w, h, cfg);
    fresh.running = true;
    sim.set(fresh);
    setPhase("playing");
    loop.setActive(true);
    sfx("go");
    // Timed levels end when the clock runs out (hearts still apply).
    clearTimeout(roundTimer.current);
    setSecondsLeft(cfg.duration > 0 ? cfg.duration : null);
    if (cfg.duration > 0) roundTimer.current = setTimeout(() => endGame(), cfg.duration * 1000);
  };

  const fieldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.35 }));
  const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : GAME.title}
        score={score}
        best={challenge.level ? challenge.bestLabel : best}
      />
      <View className="mt-3 flex-row items-center justify-between px-5">
        <Text className="font-body-bold text-xs text-ink-soft">
          Swipe to slice · avoid the Grumps
        </Text>
        <View className="flex-row items-center gap-1">
          {secondsLeft != null && phase === "playing" && (
            <Text className="mr-2 font-body-black text-sm text-ink">⏱ {secondsLeft}s</Text>
          )}
          {Array.from({ length: LIVES }, (_, i) => (
            <Text key={i} style={{ fontSize: 20, opacity: i < lives ? 1 : 0.25 }}>
              ❤️
            </Text>
          ))}
        </View>
      </View>

      <GestureDetector gesture={slicePan}>
        <Animated.View style={[{ flex: 1, margin: 16, marginTop: 10 }, fieldStyle]}>
          <View
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              sim.modify((s) => {
                "worklet";
                s.w = width;
                s.h = height;
                return s;
              });
            }}
            style={{
              flex: 1,
              borderRadius: 32,
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.35)",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.85)",
            }}
          >
            {Array.from({ length: POOL }, (_, i) => (
              <Item key={i} i={i} sim={sim} />
            ))}
            {Array.from({ length: TRAIL - 1 }, (_, j) => (
              <TrailSegment key={j} j={j} sim={sim} />
            ))}
            {popups.map((p) => (
              <ScorePopup key={p.id} {...p} />
            ))}
            <Animated.View
              pointerEvents="none"
              style={[fill, { backgroundColor: "#FF4D6D" }, flashStyle]}
            />

            {phase === "ready" && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={[
                  fill,
                  {
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                    backgroundColor: "rgba(255,240,246,0.85)",
                  },
                ]}
              >
                <Animated.View entering={ZoomIn.springify().damping(11)}>
                  <Mascot variant={GAME.mascot} size={120} mood="cheer" />
                </Animated.View>
                <Text style={[display(44), { marginTop: 6 }]}>Slice Splash</Text>
                {challenge.level ? (
                  <ChallengeGoal level={challenge.level} n={challenge.n} />
                ) : (
                  <>
                    <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
                      Swipe through the jelly bubbles before they fall.{"\n"}Slice 3+ in one swipe
                      for a combo · golden = +5{"\n"}Don&apos;t slice the Grumps!
                    </Text>
                    <View className="mt-3">
                      <Grump size={44} />
                    </View>
                  </>
                )}
                <PrimaryButton
                  title="Start slicing"
                  icon="cut"
                  onPress={start}
                  style={{ marginTop: 16 }}
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
          </View>
        </Animated.View>
      </GestureDetector>

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
          title="Splashed out!"
          game={GAME}
          score={score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.bestCombo >= 3
                ? `Best combo ×${result.bestCombo}`
                : "Tip: slice 3+ in one swipe for a combo"}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
