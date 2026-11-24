import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
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

import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import { PrimaryButton } from "../../components/Buttons";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import ScorePopup from "../../components/ScorePopup";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

const GAME = getGame("tap-rush");
const DURATION = 30_000;
const MAX_ON_SCREEN = 4;
const ORB_COLORS = [
  ["#FF8A5B", "#FF4D4D"],
  ["#FF8CC6", "#FF3D8B"],
  ["#7FB2FF", "#3F6DFF"],
  ["#8BE04E", "#1FBF7A"],
  ["#C9A8FF", "#8A5CFF"],
];
const GOLD = ["#FFF07A", "#FFB800"];

let targetId = 0;

function Orb({ target, onHit }) {
  const ring = useSharedValue(1);

  useEffect(() => {
    ring.set(withTiming(0.5, { duration: target.life, easing: Easing.linear }));
    return () => cancelAnimation(ring);
  }, [ring, target.life]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: 0.35 + ring.value * 0.5,
  }));

  const { size, x, y, golden, colors } = target;
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(11).stiffness(260)}
      exiting={ZoomOut.duration(140)}
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3.5,
            borderColor: golden ? "#FFB800" : colors[1],
          },
          ringStyle,
        ]}
      />
      {/* Raw responder: registers on touch-down, with no press delay. */}
      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => onHit(target)}
        hitSlop={10}
        style={{
          position: "absolute",
          left: size * 0.18,
          top: size * 0.18,
          width: size * 0.64,
          height: size * 0.64,
        }}
      >
        <LinearGradient
          colors={golden ? GOLD : colors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            flex: 1,
            borderRadius: size,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: golden ? "#FFB800" : colors[1],
            shadowOpacity: 0.45,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          {/* glossy highlight */}
          <View
            style={{
              position: "absolute",
              top: size * 0.08,
              left: size * 0.12,
              width: size * 0.22,
              height: size * 0.12,
              borderRadius: size,
              backgroundColor: "rgba(255,255,255,0.6)",
              transform: [{ rotate: "-30deg" }],
            }}
          />
          {golden && <Text style={{ fontSize: size * 0.28 }}>⭐</Text>}
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

function Countdown({ value }) {
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <Animated.Text
        key={value}
        entering={ZoomIn.springify().damping(9)}
        exiting={FadeOut.duration(120)}
        style={display(150)}
      >
        {value}
      </Animated.Text>
    </View>
  );
}

function StartPanel({ onPress }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.06, { duration: 650 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View entering={ZoomIn.springify().damping(11)}>
        <Mascot variant={GAME.mascot} size={150} mood="cheer" />
      </Animated.View>
      <Text style={[display(44), { marginTop: 6 }]}>Ready?</Text>
      <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
        Tap orbs before their ring closes.{"\n"}5 hits in a row raise your multiplier.{"\n"}⭐
        Golden orbs are worth 5×.
      </Text>
      <Animated.View entering={FadeIn.delay(200)}>
        <Animated.View style={[{ marginTop: 22 }, style]}>
          <PrimaryButton title="Tap to start" icon="flash" onPress={onPress} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default function TapRush() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);

  const [phase, setPhase] = useState("ready"); // ready | countdown | playing | over
  const [count, setCount] = useState(3);
  const [area, setArea] = useState(null);
  const [targets, setTargets] = useState([]);
  const [popups, setPopups] = useState([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [result, setResult] = useState(null);

  const timers = useRef(new Set());
  const live = useRef(new Set()); // ids of orbs currently on screen
  const startedAt = useRef(0);
  const stats = useRef({ score: 0, combo: 0, hits: 0, misses: 0, bestCombo: 0 });
  const bar = useSharedValue(1);
  const shake = useSharedValue(0);

  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const breakCombo = useCallback(() => {
    stats.current.combo = 0;
    setCombo(0);
    shake.set(
      withSequence(
        withTiming(-6, { duration: 40 }),
        withTiming(6, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      ),
    );
  }, [shake]);

  const spawnOrb = useCallback(() => {
    const elapsed = (Date.now() - startedAt.current) / 1000;
    const size = Math.max(64, 96 - elapsed * 1.1);
    const life = Math.max(850, 1900 - elapsed * 35);
    const pad = size / 2 + 6;

    if (live.current.size >= MAX_ON_SCREEN) return;
    const id = ++targetId;
    const target = {
      id,
      x: pad + Math.random() * (area.w - pad * 2),
      y: pad + Math.random() * (area.h - pad * 2),
      size,
      life,
      golden: Math.random() < 0.08,
      colors: ORB_COLORS[id % ORB_COLORS.length],
    };
    live.current.add(id);
    setTargets((cur) => [...cur, target]);
    // The orb faded before it was tapped: that is a miss.
    later(() => {
      if (!live.current.delete(id)) return;
      stats.current.misses++;
      breakCombo();
      setTargets((list) => list.filter((t) => t.id !== id));
    }, life);
  }, [area, later, breakCombo]);

  // Spawn loop: runs while playing, getting faster as the round goes on.
  useEffect(() => {
    if (phase !== "playing" || !area) return undefined;
    let id;
    const tick = () => {
      spawnOrb();
      const elapsed = (Date.now() - startedAt.current) / 1000;
      id = setTimeout(tick, Math.max(330, 800 - elapsed * 16));
    };
    tick();
    return () => clearTimeout(id);
  }, [phase, area, spawnOrb]);

  const finish = useCallback(() => {
    clearTimers();
    live.current.clear();
    setTargets([]);
    setPhase("over");
    haptic.heavy();
    const s = stats.current;
    const outcome = recordGame(GAME.id, s.score, {
      xp: 10 + Math.floor(s.score / 2),
      records: { rushCombo: s.bestCombo },
    });
    setResult({ ...outcome, hits: s.hits, bestCombo: s.bestCombo });
  }, [clearTimers, recordGame]);

  const startPlaying = useCallback(() => {
    startedAt.current = Date.now();
    setPhase("playing");
    sfx("go");
    bar.set(1);
    bar.set(withTiming(0, { duration: DURATION, easing: Easing.linear }));
    later(finish, DURATION);
  }, [bar, later, finish]);

  // Seconds counter shown above the bar.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, DURATION - (Date.now() - startedAt.current)));
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  const start = () => {
    clearTimers();
    live.current.clear();
    stats.current = { score: 0, combo: 0, hits: 0, misses: 0, bestCombo: 0 };
    setScore(0);
    setCombo(0);
    setTargets([]);
    setPopups([]);
    setResult(null);
    setTimeLeft(DURATION);
    bar.set(1);
    setPhase("countdown");
    [3, 2, 1].forEach((n, i) =>
      later(() => {
        setCount(n);
        haptic.select();
        sfx("tick");
      }, i * 600),
    );
    later(startPlaying, 1800);
  };

  const hit = (target) => {
    if (!live.current.delete(target.id)) return;
    const s = stats.current;
    s.combo++;
    s.hits++;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const mult = 1 + Math.floor(s.combo / 5);
    const points = (target.golden ? 5 : 1) * mult;
    s.score += points;

    setScore(s.score);
    setCombo(s.combo);
    setTargets((list) => list.filter((t) => t.id !== target.id));
    if (target.golden) {
      haptic.success();
      sfx("star");
    } else {
      if (s.combo % 5 === 0) haptic.medium();
      else haptic.tap();
      sfx(popFor(mult)); // pops climb in pitch as the multiplier grows
    }

    const popup = {
      id: target.id,
      x: target.x,
      y: target.y,
      text: `+${points}`,
      color: target.golden ? "#FFB800" : target.colors[1],
    };
    setPopups((p) => [...p, popup]);
    later(() => setPopups((p) => p.filter((q) => q.id !== popup.id)), 700);
  };

  const missTap = () => {
    if (phase !== "playing") return;
    stats.current.misses++;
    if (stats.current.combo > 0) {
      haptic.error();
      sfx("wrong");
    }
    breakCombo();
  };

  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const fieldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const mult = 1 + Math.floor(combo / 5);

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader title={GAME.title} score={score} best={best} />

      <View className="mt-4 px-5">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-body-black text-sm text-ink">
            ⏱ {(timeLeft / 1000).toFixed(1)}s
          </Text>
          {combo >= 3 && (
            <Animated.View key={mult} entering={ZoomIn.springify().damping(10)}>
              <View className="rounded-full bg-ink px-3 py-1">
                <Text className="font-body-black text-xs text-white">
                  🔥 {combo} combo{mult > 1 ? ` · x${mult}` : ""}
                </Text>
              </View>
            </Animated.View>
          )}
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

      <Animated.View style={[{ flex: 1, margin: 20, marginBottom: 12 }, fieldStyle]}>
        <View
          onStartShouldSetResponder={() => phase === "playing"}
          onResponderGrant={missTap}
          onLayout={(e) =>
            setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
          style={{
            flex: 1,
            borderRadius: 32,
            backgroundColor: "rgba(255,255,255,0.45)",
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.9)",
            overflow: "hidden",
          }}
        >
          {targets.map((t) => (
            <Orb key={t.id} target={t} onHit={hit} />
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
              }}
            >
              <StartPanel onPress={start} />
            </Animated.View>
          )}
          {phase === "countdown" && <Countdown value={count} />}
        </View>
      </Animated.View>

      {phase === "over" && result && (
        <GameOverModal
          title="Time's up!"
          game={GAME}
          score={score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.hits} hits · best combo {result.bestCombo}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
