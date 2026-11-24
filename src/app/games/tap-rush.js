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
import PressableScale from "../../components/PressableScale";
import Screen from "../../components/Screen";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { useGameStore } from "../../store/useGameStore";

const GAME = getGame("tap-rush");
const DURATION = 30_000;
const MAX_ON_SCREEN = 4;
const ORB_COLORS = [
  ["#FF6B5B", "#FF9F43"],
  ["#FF5FA2", "#FF8E8E"],
  ["#FFB347", "#FF6B5B"],
  ["#F97316", "#FACC15"],
];
const GOLD = ["#FFE27A", "#FFB800"];

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
            borderWidth: 3,
            borderColor: golden ? "#FFE27A" : "#FFFFFF",
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
            shadowColor: golden ? "#FFB800" : colors[0],
            shadowOpacity: 0.8,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
        >
          {golden && <Text style={{ fontSize: size * 0.28 }}>⭐</Text>}
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

function Popup({ x, y, text, color }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const textStyle = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ translateY: -60 * t.value }, { scale: 0.8 + 0.5 * Math.min(1, t.value * 3) }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - t.value),
    transform: [{ scale: 0.4 + t.value * 1.6 }],
  }));
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - 50, top: y - 50 }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 4,
            borderColor: color,
          },
          burstStyle,
        ]}
      />
      <Animated.View
        style={[
          { width: 100, height: 100, alignItems: "center", justifyContent: "center" },
          textStyle,
        ]}
      >
        <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" }}>{text}</Text>
      </Animated.View>
    </View>
  );
}

function Countdown({ value }) {
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <Animated.Text
        key={value}
        entering={ZoomIn.springify().damping(9)}
        exiting={FadeOut.duration(120)}
        style={{ color: "#fff", fontSize: 120, fontWeight: "900" }}
      >
        {value}
      </Animated.Text>
    </View>
  );
}

function StartButton({ onPress }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.08, { duration: 700 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View entering={ZoomIn.springify()}>
      <Animated.View style={style}>
        <PressableScale onPress={onPress}>
          <LinearGradient
            colors={GAME.colors}
            style={{
              width: 170,
              height: 170,
              borderRadius: 85,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 44 }}>⚡</Text>
            <Text className="mt-1 text-lg font-black text-white">Tap to start</Text>
          </LinearGradient>
        </PressableScale>
      </Animated.View>
    </Animated.View>
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
    const isNewBest = recordGame(GAME.id, s.score);
    setResult({ isNewBest, hits: s.hits, bestCombo: s.bestCombo });
  }, [clearTimers, recordGame]);

  const startPlaying = useCallback(() => {
    startedAt.current = Date.now();
    setPhase("playing");
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
    if (target.golden) haptic.success();
    else if (s.combo % 5 === 0) haptic.medium();
    else haptic.tap();

    const popup = {
      id: target.id,
      x: target.x,
      y: target.y,
      text: `+${points}`,
      color: target.golden ? "#FFE27A" : target.colors[0],
    };
    setPopups((p) => [...p, popup]);
    later(() => setPopups((p) => p.filter((q) => q.id !== popup.id)), 700);
  };

  const missTap = () => {
    if (phase !== "playing") return;
    stats.current.misses++;
    if (stats.current.combo > 0) haptic.error();
    breakCombo();
  };

  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const fieldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const mult = 1 + Math.floor(combo / 5);

  return (
    <Screen tint="#FF6B5B" secondTint="#FF9F43">
      <GameHeader title={GAME.title} accent={GAME.accent} score={score} best={best} />

      <View className="mt-4 px-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-bold text-mist">⏱ {(timeLeft / 1000).toFixed(1)}s</Text>
          {combo >= 3 && (
            <Animated.View key={mult} entering={ZoomIn.springify().damping(10)}>
              <View className="rounded-full bg-gold px-3 py-1">
                <Text className="text-xs font-black text-ink">
                  🔥 {combo} combo{mult > 1 ? ` · x${mult}` : ""}
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
        <View className="h-2.5 overflow-hidden rounded-full bg-white/10">
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

      <Animated.View style={[{ flex: 1, margin: 16 }, fieldStyle]}>
        <View
          onStartShouldSetResponder={() => phase === "playing"}
          onResponderGrant={missTap}
          onLayout={(e) =>
            setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
          style={{
            flex: 1,
            borderRadius: 28,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          {targets.map((t) => (
            <Orb key={t.id} target={t} onHit={hit} />
          ))}
          {popups.map((p) => (
            <Popup key={p.id} {...p} />
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
                padding: 32,
              }}
            >
              <StartButton onPress={start} />
              <Text className="mt-8 text-center text-sm leading-5 text-mist">
                Tap orbs before their ring closes.{"\n"}Every 5 hits in a row raises your
                multiplier.{"\n"}⭐ Golden orbs are worth 5×.
              </Text>
            </Animated.View>
          )}
          {phase === "countdown" && <Countdown value={count} />}
        </View>
      </Animated.View>

      {phase === "over" && result && (
        <GameOverModal
          title="Time's up!"
          emoji={GAME.emoji}
          score={score}
          unit={GAME.unit}
          best={best}
          isNewBest={result.isNewBest}
          colors={GAME.colors}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 text-sm text-mist-300">
              {result.hits} hits · best combo {result.bestCombo}
            </Text>
          }
        />
      )}
    </Screen>
  );
}
