import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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
import {
  CLOCK_SECONDS,
  findPoints,
  HAT_NAMES,
  makeScene,
  STAR_POINTS,
  torchAt,
} from "../../games/spot/logic";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { createRng } from "../../lib/random";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("spot");
const METRIC_UNITS = { found: "found", score: "pts" };
const HINT_AFTER = 8; // seconds before a target starts to wiggle
const TORCH_PERIOD = 120; // seconds of torch path the night clock loops over
const secondsSince = (t) => (Date.now() - t) / 1000;
const plural = (name) => (name.endsWith("x") ? `${name}es` : `${name}s`);

const PLACES = {
  park: { sky: ["#BFEFA8", "#93DB7B", "#6FC765"], bush: ["#2E9A4A", "#3FAE5A"], label: "🌳 Park" },
  beach: {
    sky: ["#FFE9B8", "#F7D58E", "#EFC173"],
    bush: ["#E2A54F", "#F0BC66"],
    label: "🏖️ Beach",
  },
  snow: {
    sky: ["#F4FAFF", "#DDEEFF", "#C7E2FA"],
    bush: ["#FFFFFF", "#EAF4FF"],
    label: "❄️ Snowy hill",
  },
  night: {
    sky: ["#2A2F6B", "#1E2352", "#141838"],
    bush: ["#16314A", "#1D3F5A"],
    label: "🌙 Night park",
  },
};

/** The place behind the crowd. */
function Backdrop({ theme, W, H }) {
  const place = PLACES[theme];
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <LinearGradient
        colors={place.sky}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {theme === "park" && (
        <View
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
      )}
      {theme === "beach" && (
        <>
          <LinearGradient
            colors={["#5CC6EA", "#7FD8F0"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: H * 0.22 }}
          />
          {[0.07, 0.14].map((y) => (
            <View
              key={y}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: H * y,
                height: 3,
                backgroundColor: "rgba(255,255,255,0.55)",
              }}
            />
          ))}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: H * 0.22 - 6,
              height: 12,
              borderRadius: 6,
              backgroundColor: "rgba(255,255,255,0.8)",
            }}
          />
        </>
      )}
      {theme === "snow" &&
        Array.from({ length: 26 }, (_, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: ((i * 37) % 97) * (W / 100),
              top: ((i * 53) % 95) * (H / 100),
              width: 5 + (i % 3) * 2,
              height: 5 + (i % 3) * 2,
              borderRadius: 6,
              backgroundColor: "#FFFFFF",
              opacity: 0.9,
            }}
          />
        ))}
      {theme === "night" && (
        <>
          {Array.from({ length: 22 }, (_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: ((i * 41) % 97) * (W / 100),
                top: ((i * 29) % 93) * (H / 100),
                width: 3,
                height: 3,
                borderRadius: 2,
                backgroundColor: "#FFF6C8",
                opacity: 0.8,
              }}
            />
          ))}
          <View
            style={{
              position: "absolute",
              right: 18,
              top: 14,
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: "#FFF3B0",
            }}
          />
        </>
      )}
    </View>
  );
}

/** The night park's torch: everything is dark except a sweeping circle. */
function Torch({ W, H, clock }) {
  const lit = W * 0.24;
  const border = Math.hypot(W, H) * 1.3;
  const outer = lit + border;
  const style = useAnimatedStyle(() => {
    const p = torchAt(clock.value);
    return {
      transform: [{ translateX: p.x * W - outer }, { translateY: p.y * H - outer }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: outer * 2,
          height: outer * 2,
          borderRadius: outer,
          borderWidth: border,
          borderColor: "rgba(10,12,30,0.93)",
        },
        style,
      ]}
    />
  );
}

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
    const dx = wander ? Math.sin(clock.value * 1.5 + b.phase) * W * 0.035 : 0;
    const dy = wander ? Math.cos(clock.value * 1.2 + b.phase) * H * 0.02 : 0;
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
        accessibilityLabel={`Buddy ${MASCOTS[b.variant].name}${b.hat ? ` in ${HAT_NAMES[b.hat]}` : ""}`}
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

/** A ⏰ or ⭐ hidden in the scene. */
function Bonus({ bonus, W, H, onTap }) {
  const s = Math.min(46, W * 0.11);
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.12, { duration: 600 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <View
      style={{ position: "absolute", left: bonus.x * W - s / 2, top: bonus.y * H - s / 2 }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={onTap}
      accessibilityRole="button"
      accessibilityLabel={bonus.kind === "clock" ? "Bonus time" : "Bonus star"}
    >
      <Animated.View style={style}>
        <View
          style={[cardShadow, { width: s, height: s, borderRadius: s }]}
          className="items-center justify-center bg-white"
        >
          <Ionicons
            name={bonus.kind === "clock" ? "alarm" : "star"}
            size={s * 0.6}
            color={bonus.kind === "clock" ? "#3F86FF" : "#FFB800"}
          />
        </View>
      </Animated.View>
    </View>
  );
}

/** "+18" or "+5 s" rising from a tap. */
function Floater({ text, x, y }) {
  const up = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    up.set(withTiming(-46, { duration: 800, easing: Easing.out(Easing.cubic) }));
    o.set(withDelay(450, withTiming(0, { duration: 350 })));
  }, [up, o]);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: up.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: x - 60, top: y - 40, width: 120, alignItems: "center" },
        style,
      ]}
    >
      <View style={cardShadow} className="rounded-full bg-white px-3 py-1">
        <Text style={[display(20), { color: GAME.accent }]}>{text}</Text>
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
        <Mascot variant="pom" size={100} mood="wow" outfit={{ hat: "cap" }} />
        <Text style={[display(36), { marginTop: 4 }]}>Where&apos;s Pom?</Text>
        {challenge.level ? (
          <ChallengeGoal level={challenge.level} n={challenge.n} />
        ) : (
          <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
            Find who you&apos;re asked for: one buddy, a whole{"\n"}group, or the one in the right
            hat. Visit the park,{"\n"}beach, snowy hill and a dark night park.{"\n"}Grab ⏰ for time
            and ⭐ for points!
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

/** "Find Kit!", "Find all 3 Buns! 1/3" or "Find Kit in the Crown!" */
function MissionCard({ scene, got }) {
  const { type, target, hat, count } = scene.mission;
  const name = MASCOTS[target].name;
  const text =
    type === "many"
      ? `Find all ${count} ${plural(name)}!`
      : type === "hat"
        ? `Find ${name} in the ${HAT_NAMES[hat]}!`
        : `Find ${name}!`;
  return (
    <Animated.View key={scene.n} entering={ZoomIn.duration(240)} style={{ flexShrink: 1 }}>
      <View
        style={cardShadow}
        className="flex-row items-center rounded-full bg-white py-1 pl-1 pr-3"
      >
        <View className="rounded-full bg-[#EAF8E2]">
          <Mascot variant={target} size={40} animated={false} outfit={hat ? { hat } : null} />
        </View>
        <View className="ml-1 flex-shrink">
          <Text numberOfLines={1} className="font-body-black text-sm text-ink">
            {text}
          </Text>
          <Text className="font-body-bold text-[11px] text-ink-soft">
            {PLACES[scene.theme].label}
            {count > 1 ? ` · ${got}/${count}` : ""}
          </Text>
        </View>
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
  const [got, setGot] = useState(0); // targets found in this scene
  const [bonusTaken, setBonusTaken] = useState(false);
  const [floaters, setFloaters] = useState([]);
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
  const wanderClock = useSharedValue(0);
  const torchClock = useSharedValue(0);

  useEffect(() => {
    wanderClock.set(
      withRepeat(withTiming(Math.PI * 40, { duration: 120000, easing: Easing.linear }), -1),
    );
    torchClock.set(
      withRepeat(
        withTiming(TORCH_PERIOD, { duration: TORCH_PERIOD * 1000, easing: Easing.linear }),
        -1,
      ),
    );
  }, [wanderClock, torchClock]);

  const float = (text, x, y) =>
    setFloaters((f) => [...f.slice(-3), { text, x, y, n: Date.now() + Math.random() }]);

  const deal = useCallback(() => {
    setScene({ ...makeScene(round.current, rand.current, cfg), n: round.current });
    round.current += 1;
    setMarks({});
    setGot(0);
    setBonusTaken(false);
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
      if (secondsSince(shownAt.current) > HINT_AFTER) setHint(true);
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
    setFloaters([]);
    endAt.current = Date.now() + cfg.duration * 1000;
    setTimeLeft(cfg.duration);
    setPhase("playing");
    sfx("go");
    deal();
  };

  const W = area?.w ?? 0;
  const H = area?.h ?? 0;

  const tap = (i) => {
    if (phase !== "playing" || busy.current || !scene || marks[i]) return;
    const s = stats.current;
    const b = scene.buddies[i];
    if (scene.targets.includes(i)) {
      const nextGot = got + 1;
      setGot(nextGot);
      setMarks((m) => ({ ...m, [i]: "right" }));
      haptic.success();
      if (nextGot < scene.mission.count) {
        sfx("select");
        float(`${nextGot}/${scene.mission.count}`, b.x * W, b.y * H);
        return;
      }
      busy.current = true;
      const pts = findPoints(secondsSince(shownAt.current), s.streak, scene.mission.count);
      s.found += 1;
      s.score += pts;
      s.streak += 1;
      setHud({ ...s });
      float(`+${pts}`, b.x * W, b.y * H);
      sfx(popFor(Math.min(4, 1 + Math.floor(s.streak / 3))));
      setTimeout(deal, 700);
      return;
    }
    s.streak = 0;
    setHud({ ...s });
    setMarks((m) => ({ ...m, [i]: "wrong" }));
    endAt.current -= cfg.penalty * 1000;
    float(`−${cfg.penalty} s`, b.x * W, b.y * H);
    haptic.error();
    sfx("wrong");
  };

  const takeBonus = () => {
    if (phase !== "playing" || bonusTaken || !scene?.bonus) return;
    setBonusTaken(true);
    const { kind, x, y } = scene.bonus;
    if (kind === "clock") {
      endAt.current += CLOCK_SECONDS * 1000;
      float(`+${CLOCK_SECONDS} s`, x * W, y * H);
    } else {
      stats.current.score += STAR_POINTS;
      setHud({ ...stats.current });
      float(`+${STAR_POINTS}`, x * W, y * H);
    }
    sfx("star");
    haptic.success();
  };

  const ratio = Math.max(0, Math.min(1, timeLeft / cfg.duration));
  const theme = scene?.theme ?? "park";

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Find It"}
        score={hud.score}
        best={challenge.level ? challenge.bestLabel : best}
      />

      <View className="mt-3 px-5">
        <View className="flex-row items-center justify-between">
          {phase === "playing" && scene ? <MissionCard scene={scene} got={got} /> : <View />}
          <View className="ml-2 items-end">
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
        {area && <Backdrop theme={phase === "ready" ? "park" : theme} W={W} H={H} />}
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
                clock={wanderClock}
                mark={marks[i]}
                hint={hint && scene.targets.includes(i) && !marks[i]}
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
                ].map(([x, y, sz], k) => (
                  <View
                    key={k}
                    style={{
                      position: "absolute",
                      left: x * bush.r * W * 2,
                      top: y * bush.r * W * 1.6,
                      width: sz * bush.r * W * 2,
                      height: sz * bush.r * W * 2,
                      borderRadius: bush.r * W,
                      backgroundColor: PLACES[theme].bush[k === 2 ? 1 : 0],
                    }}
                  />
                ))}
              </View>
            ))}
            {scene.bonus && !bonusTaken && (
              <Bonus bonus={scene.bonus} W={W} H={H} onTap={takeBonus} />
            )}
            {theme === "night" && <Torch W={W} H={H} clock={torchClock} />}
            {floaters.map((f) => (
              <Floater key={f.n} {...f} />
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
              {result.found} scenes cleared
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
