import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Line, Path } from "react-native-svg";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import { FISHING_DEFAULTS } from "../../games/fishing/levels";
import { CAST_S, CATCHES, judge, nibbling, planCast, REEL_S } from "../../games/fishing/logic";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { createRng } from "../../lib/random";
import { sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("fishing");
const METRIC_UNITS = { score: "pts", fish: "fish", rare: "rare fish" };
const RARE = ["puffer", "rainbow", "golden"];
const EASE = Easing.inOut(Easing.cubic);
const AnimatedLine = Animated.createAnimatedComponent(Line);

/** A catch: a little fish in its colour (or an old boot). */
function CatchArt({ kind, size }) {
  const k = CATCHES[kind];
  if (k.junk) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M30 15 H58 V58 L86 64 Q92 66 92 74 V84 H26 Z" fill={k.colour} />
        <Path d="M26 84 H92 V90 H26 Z" fill="#5A4636" />
        <Path d="M34 24 H52 M34 34 H52 M34 44 H52" stroke="#5A4636" strokeWidth={4} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M70 50 L96 30 L92 50 L96 70 Z" fill={k.colour} opacity={0.85} />
      <Ellipse cx={44} cy={50} rx={34} ry={22} fill={k.colour} />
      <Path d="M40 30 Q50 16 60 32 Z" fill={k.colour} opacity={0.8} />
      <Ellipse cx={34} cy={42} rx={12} ry={6} fill="#FFFFFF" opacity={0.35} />
      <Circle cx={24} cy={46} r={6} fill="#FFFFFF" />
      <Circle cx={23} cy={47} r={3.4} fill="#141414" />
      <Path d="M14 58 Q20 62 26 58" stroke="#5A1A1A" strokeWidth={3} fill="none" />
      {kind === "golden" && (
        <Path d="M70 14 L73 22 L81 25 L73 28 L70 36 L67 28 L59 25 L67 22 Z" fill="#FFFFFF" />
      )}
      {kind === "rainbow" && (
        <Path d="M30 54 Q46 62 64 54" stroke="#FF8FC0" strokeWidth={5} fill="none" />
      )}
    </Svg>
  );
}

function Bobber({ size }) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 40 56">
      <Line x1={20} y1={0} x2={20} y2={14} stroke="#3B2A22" strokeWidth={3} />
      <Circle cx={20} cy={30} r={15} fill="#FFFFFF" />
      <Path d="M5 30 A15 15 0 0 1 35 30 Z" fill="#F0453A" />
      <Circle cx={14} cy={24} r={3.5} fill="#FFFFFF" opacity={0.7} />
    </Svg>
  );
}

/** Expanding ring on the water. */
function Ripple({ x, y, delay = 0 }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) })));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - p.value),
    transform: [{ scaleX: 0.3 + 1.6 * p.value }, { scaleY: 0.15 + 0.8 * p.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x - 30,
          top: y - 30,
          width: 60,
          height: 60,
          borderRadius: 30,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.9)",
        },
        style,
      ]}
    />
  );
}

/** The catch leaping out of the water toward the bucket. */
function Leap({ kind, from, to, size }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 800, easing: EASE }));
  }, [t]);
  const style = useAnimatedStyle(() => {
    const x = from.x + (to.x - from.x) * t.value;
    const y = from.y + (to.y - from.y) * t.value - Math.sin(t.value * Math.PI) * 120;
    return {
      opacity: t.value > 0.92 ? (1 - t.value) / 0.08 : 1,
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { rotate: `${-30 + 360 * t.value}deg` },
        { scale: 0.6 + 0.6 * Math.sin(t.value * Math.PI) },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <CatchArt kind={kind} size={size} />
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
        <View className="flex-row items-center">
          <CatchArt kind="sunny" size={40} />
          <Text style={[display(30), { marginHorizontal: 6 }]}>Fishing Fun</Text>
          <CatchArt kind="golden" size={40} />
        </View>
        {challenge.level ? (
          <ChallengeGoal level={challenge.level} n={challenge.n} />
        ) : (
          <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
            Tap the pond to cast. Little twitches are just{"\n"}nibbles: wait! When the bobber
            DIVES, tap fast.{"\n"}Rare fish bite quick. Golden fish are worth 150!
          </Text>
        )}
        <Animated.View style={[{ marginTop: 16 }, style]}>
          <PrimaryButton title="Go fishing" icon="fish" onPress={onPress} />
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
export default function FishingScreen() {
  const { level } = useLocalSearchParams();
  return <Fishing key={level ?? "endless"} />;
}

function Fishing() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;
  const cfg = useMemo(() => ({ ...FISHING_DEFAULTS, ...(levelConfig ?? {}) }), [levelConfig]);

  // ready | idle | flying | waiting | reeling | over
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, fish: 0, rare: 0 });
  const [bucket, setBucket] = useState([]); // recent catches
  const [timeLeft, setTimeLeft] = useState(cfg.duration);
  const [say, setSay] = useState("Tap the pond to cast!");
  const [ripples, setRipples] = useState([]);
  const [leap, setLeap] = useState(null);
  const [biting, setBiting] = useState(null); // { x, y } while a fish is on
  const [area, setArea] = useState(null);
  const [result, setResult] = useState(null);

  const rand = useRef(null);
  const plan = useRef(null);
  const landedAt = useRef(0);
  const endAt = useRef(0);
  const stats = useRef({ score: 0, fish: 0, rare: 0 });
  const spot = useRef({ x: 0, y: 0 });
  const phaseRef = useRef("ready");
  const go = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Bobber position, dip (0 floating → 1 under) and twitch.
  const bx = useSharedValue(0);
  const by = useSharedValue(0);
  const dip = useSharedValue(0);
  const twitch = useSharedValue(0);
  const shown = useSharedValue(0);

  const W = area?.w ?? 300;
  const H = area?.h ?? 400;
  const tip = { x: W * 0.36, y: H - 150 };
  const bucketAt = { x: W - 50, y: H - 50 };

  const finish = useCallback(() => {
    go("over");
    shown.set(withTiming(0, { duration: 200 }));
    const s = stats.current;
    setTimeout(() => {
      if (challenge.level) {
        const res = challenge.complete({ score: s.score, fish: s.fish, rare: s.rare }, {});
        setResult({ ...res, challenge: true });
        return;
      }
      const outcome = recordGame(GAME.id, s.score, { xp: 10 + Math.floor(s.score / 6) });
      setResult({ ...outcome, ...s });
    }, 500);
  }, [challenge, recordGame, shown]);

  const ripple = (x, y) =>
    setRipples((r) => [...r.slice(-4), { x, y, n: Date.now() + Math.random() }]);

  const backToIdle = useCallback(
    (ms) => {
      setTimeout(() => {
        if (phaseRef.current === "over") return;
        shown.set(withTiming(0, { duration: 200 }));
        dip.set(0);
        setBiting(null);
        go("idle");
        setSay("Tap the pond to cast!");
      }, ms);
    },
    [dip, shown],
  );

  // The pond clock: game time, nibbles, bites and fish that get away.
  useEffect(() => {
    if (phase === "ready" || phase === "over") return undefined;
    let lastNibble = false;
    let bitten = false;
    const id = setInterval(() => {
      const left = Math.max(0, (endAt.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        sfx("win");
        finish();
        return;
      }
      if (phaseRef.current !== "waiting" || !plan.current) return;
      const t = (Date.now() - landedAt.current) / 1000;
      const nib = nibbling(plan.current, t);
      if (nib && !lastNibble) {
        twitch.set(
          withSequence(
            withTiming(1, { duration: 60 }),
            withTiming(-1, { duration: 80 }),
            withTiming(0, { duration: 60 }),
          ),
        );
        ripple(spot.current.x, spot.current.y);
        sfx("tick");
      }
      lastNibble = nib;
      if (!bitten && t >= plan.current.bite) {
        bitten = true;
        setBiting({ ...spot.current }); // where the "!" pops up
        dip.set(withTiming(1, { duration: 120 }));
        ripple(spot.current.x, spot.current.y);
        haptic.medium();
        sfx("pop2");
        setSay("NOW! Tap!");
      }
      if (judge(plan.current, t) === "late") {
        bitten = false;
        setBiting(null);
        go("missed");
        dip.set(withTiming(0, { duration: 200 }));
        setSay("It got away… 🐟💨");
        sfx("wrong");
        backToIdle(800);
      }
    }, 30);
    return () => clearInterval(id);
  }, [phase, finish, backToIdle, dip, twitch]);

  const start = () => {
    rand.current = createRng(Date.now() % 1000003);
    stats.current = { score: 0, fish: 0, rare: 0 };
    setHud({ score: 0, fish: 0, rare: 0 });
    setBucket([]);
    setResult(null);
    endAt.current = Date.now() + cfg.duration * 1000;
    setTimeLeft(cfg.duration);
    setSay("Tap the pond to cast!");
    go("idle");
    sfx("go");
  };

  const cast = () => {
    const x = W * (0.2 + rand.current() * 0.6);
    const y = H * (0.12 + rand.current() * 0.38);
    spot.current = { x, y };
    plan.current = planCast(rand.current, cfg);
    go("flying");
    setSay("Wait for it…");
    sfx("whoosh");
    haptic.tap();
    dip.set(0);
    bx.set(tip.x);
    by.set(tip.y);
    shown.set(1);
    bx.set(withTiming(x, { duration: CAST_S * 1000, easing: Easing.out(Easing.quad) }));
    by.set(
      withSequence(
        withTiming(Math.min(tip.y, y) - 70, {
          duration: CAST_S * 450,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(y, { duration: CAST_S * 550, easing: Easing.in(Easing.quad) }),
      ),
    );
    setTimeout(() => {
      if (phaseRef.current !== "flying") return;
      landedAt.current = Date.now();
      ripple(x, y);
      sfx("land");
      go("waiting");
    }, CAST_S * 1000);
  };

  const tapPond = () => {
    const p = phaseRef.current;
    if (p === "idle") return cast();
    if (p !== "waiting") return;
    const t = (Date.now() - landedAt.current) / 1000;
    const verdict = judge(plan.current, t);
    if (verdict === "early") {
      go("missed");
      setSay("Too soon! You scared it off");
      haptic.error();
      sfx("wrong");
      shown.set(withTiming(0, { duration: 250 }));
      backToIdle(700);
      return;
    }
    if (verdict !== "caught") return;
    const kind = plan.current.kind;
    const k = CATCHES[kind];
    const s = stats.current;
    s.score += k.points;
    if (!k.junk) s.fish += 1;
    if (RARE.includes(kind)) s.rare += 1;
    setHud({ ...s });
    go("reeling");
    setBiting(null);
    shown.set(withTiming(0, { duration: 150 }));
    setLeap({ kind, from: { ...spot.current }, n: Date.now() });
    setTimeout(() => setBucket((b) => [...b.slice(-5), { kind, n: Date.now() }]), 750);
    if (k.junk) {
      setSay("An old boot! 👢 No points");
      sfx("select");
      haptic.tap();
    } else {
      setSay(`${k.name}! +${k.points}`);
      sfx(kind === "golden" ? "win" : RARE.includes(kind) ? "star" : "catch");
      haptic.success();
    }
    backToIdle(REEL_S * 1000);
  };

  const bobberStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [
      { translateX: bx.value - 14 + twitch.value * 4 },
      { translateY: by.value - 30 + dip.value * 16 },
      { scale: 1 - 0.45 * dip.value },
      { rotate: `${twitch.value * 14}deg` },
    ],
  }));
  const lineProps = useAnimatedProps(() => ({
    x2: bx.value,
    y2: by.value - 26 + dip.value * 16,
    opacity: shown.value,
  }));
  const ratio = Math.max(0, Math.min(1, timeLeft / cfg.duration));

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Fishing"}
        score={hud.score}
        best={challenge.level ? challenge.bestLabel : best}
      />

      <View className="mt-3 px-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-body-black text-sm text-ink">⏱ {Math.ceil(timeLeft)}s</Text>
          <View className="flex-row gap-2">
            <View className="rounded-full bg-white px-3 py-1">
              <Text className="font-body-black text-xs text-ink">🐟 {hud.fish}</Text>
            </View>
            <View className="rounded-full bg-white px-3 py-1">
              <Text className="font-body-black text-xs text-ink">✨ {hud.rare} rare</Text>
            </View>
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
        onStartShouldSetResponder={() => phase !== "ready" && phase !== "over"}
        onResponderGrant={tapPond}
        accessibilityRole="button"
        accessibilityLabel={biting ? "Reel it in" : "Pond"}
      >
        <LinearGradient
          colors={["#5CC6EA", "#3FA6DE", "#2B84C9"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* lily pads and reeds */}
        {[
          [0.08, 0.1, 38],
          [0.82, 0.18, 30],
          [0.12, 0.55, 26],
          [0.9, 0.5, 34],
        ].map(([x, y, s], i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: W * x - s / 2,
              top: H * y,
              width: s,
              height: s * 0.6,
              borderRadius: s,
              backgroundColor: "#3FBF74",
              opacity: 0.9,
            }}
          />
        ))}
        {/* the dock */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: -10,
            bottom: 0,
            width: W * 0.5,
            height: 70,
            backgroundColor: "#C98A55",
            borderTopRightRadius: 18,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: (W * 0.5 * i) / 5,
                top: 0,
                bottom: 0,
                width: 3,
                backgroundColor: "#A86E3E",
              }}
            />
          ))}
        </View>
        {ripples.map((r) => (
          <Ripple key={r.n} x={r.x} y={r.y} />
        ))}
        {area && (
          <Svg width={W} height={H} style={{ position: "absolute" }} pointerEvents="none">
            {/* the rod */}
            <Line
              x1={W * 0.2}
              y1={H - 64}
              x2={tip.x}
              y2={tip.y}
              stroke="#5A3A22"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <AnimatedLine
              x1={tip.x}
              y1={tip.y}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth={1.5}
              animatedProps={lineProps}
            />
          </Svg>
        )}
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", left: 0, top: 0 }, bobberStyle]}
        >
          <Bobber size={28} />
        </Animated.View>
        {biting && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: biting.x - 14, top: biting.y - 70 }}
          >
            <Animated.View entering={ZoomIn.duration(140)}>
              <Text style={[display(34), { color: "#FFFFFF" }]}>!</Text>
            </Animated.View>
          </View>
        )}
        {/* Pengu on the dock */}
        <View pointerEvents="none" style={{ position: "absolute", left: W * 0.04, bottom: 40 }}>
          <Mascot
            variant="pengu"
            size={86}
            mood={biting ? "wow" : phase === "reeling" ? "cheer" : "happy"}
            animated={phase !== "over"}
          />
        </View>
        {/* the bucket of recent catches */}
        <View
          pointerEvents="none"
          style={{ position: "absolute", right: 14, bottom: 12, alignItems: "center" }}
        >
          <View className="mb-1 flex-row">
            {bucket.slice(-3).map((c) => (
              <Animated.View key={c.n} entering={ZoomIn.duration(200)}>
                <CatchArt kind={c.kind} size={26} />
              </Animated.View>
            ))}
          </View>
          <View
            style={{
              width: 64,
              height: 46,
              backgroundColor: "#8FA3B8",
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className="font-body-black text-sm text-white">{hud.fish}</Text>
          </View>
        </View>
        {leap && <Leap key={leap.n} kind={leap.kind} from={leap.from} to={bucketAt} size={56} />}

        {phase !== "ready" && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: 12, left: 0, right: 0, alignItems: "center" }}
          >
            <View
              style={cardShadow}
              className={`rounded-full px-4 py-2 ${biting ? "bg-[#F0453A]" : "bg-white"}`}
            >
              <Text className={`font-body-black text-sm ${biting ? "text-white" : "text-ink"}`}>
                {say}
              </Text>
            </View>
          </View>
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
          title="Time to pack up!"
          game={GAME}
          score={hud.score}
          best={best}
          result={result}
          mood="success"
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.fish} fish · {result.rare} rare
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
