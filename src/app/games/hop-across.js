import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Ellipse, Path } from "react-native-svg";

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import { HOP_DEFAULTS } from "../../games/hopAcross/levels";
import {
  createHopWorld,
  FLY_POINTS,
  MAX_PADS,
  ROW_H,
  STEP_S,
  VIS_ROWS,
  W,
} from "../../games/hopAcross/world";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("hop-across");
const METRIC_UNITS = { rows: "rows", flies: "flies", score: "pts" };
const PAD_W = 112; // world width the pad sprite is drawn at (scaled per row)
const ENDINGS = {
  splash: "Splash!",
  sank: "The pad sank!",
  swept: "Swept away!",
  time: "Time's up!",
};
const STEP_MS = STEP_S * 1000;

/** Where a world y lands on screen: Hop's row sits low, rows ahead go up. */
function screenY(worldY, cam, rowPx, baseY) {
  "worklet";
  return baseY - ((worldY - cam) / ROW_H) * rowPx;
}

function LilyPad({ size }) {
  return (
    <Svg width={size} height={size * 0.62} viewBox="0 0 100 62">
      <Ellipse cx={50} cy={34} rx={48} ry={27} fill="#1F9E5A" />
      <Path
        d="M50 31 L50 8 Q72 6 94 26 Q98 34 94 42 Q72 62 50 60 Q28 62 6 42 Q2 34 6 26 Q26 8 42 7 Z"
        fill="#37C46F"
      />
      <Path d="M50 31 L52 6 L62 7 Z" fill="#2FB0D6" />
      <Path
        d="M50 31 L24 18 M50 31 L76 18 M50 31 L20 44 M50 31 L80 44 M50 31 L50 56"
        stroke="#7EE29F"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Ellipse cx={34} cy={20} rx={9} ry={4} fill="#FFFFFF" opacity={0.35} />
    </Svg>
  );
}

function Fly({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Ellipse cx={13} cy={14} rx={9} ry={6} fill="#D9F4FF" opacity={0.9} />
      <Ellipse cx={27} cy={14} rx={9} ry={6} fill="#D9F4FF" opacity={0.9} />
      <Ellipse cx={20} cy={23} rx={8} ry={9} fill="#2A2A3A" />
      <Ellipse cx={17} cy={19} rx={2.4} ry={2.4} fill="#FF5C5C" />
      <Ellipse cx={23} cy={19} rx={2.4} ry={2.4} fill="#FF5C5C" />
    </Svg>
  );
}

/** One pad slot: row s (from the row behind Hop), pad j. Reads only the poses. */
function PadSprite({ poses, slot, sx, rowPx, baseY }) {
  const o = 6 + slot * 4;
  const size = PAD_W * sx;
  const s = Math.floor(slot / MAX_PADS);
  const style = useAnimatedStyle(() => {
    const p = poses.value;
    const w = p[o + 1] ?? 0;
    const sink = p[o + 3] ?? 0;
    const y = screenY((p[5] + s) * ROW_H, p[0], rowPx, baseY);
    const k = (w / PAD_W) * (1 - 0.3 * sink);
    return {
      opacity: w > 0 ? 1 - 0.55 * sink : 0,
      transform: [
        { translateX: (p[o] ?? -999) * sx - size / 2 },
        { translateY: y - size * 0.31 },
        // a sinking pad starts to wobble
        { rotate: `${sink > 0.6 ? Math.sin(sink * 60) * 5 : 0}deg` },
        { scale: k },
      ],
    };
  });
  const flyStyle = useAnimatedStyle(() => ({ opacity: poses.value[o + 2] ?? 0 }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <LilyPad size={size} />
      <Animated.View
        style={[{ position: "absolute", left: size * 0.32, top: -size * 0.12 }, flyStyle]}
      >
        <Fly size={size * 0.36} />
      </Animated.View>
    </Animated.View>
  );
}

function Frog({ poses, sx, rowPx, baseY, mood, hidden }) {
  const size = Math.min(78 * sx, rowPx * 0.95);
  const style = useAnimatedStyle(() => {
    const p = poses.value;
    const hp = p[3] ?? 0;
    const arc = Math.sin(hp * Math.PI);
    const y = screenY(p[2] ?? 0, p[0] ?? 0, rowPx, baseY);
    return {
      opacity: hidden ? 0 : 1,
      transform: [
        { translateX: (p[1] ?? W / 2) * sx - size / 2 },
        { translateY: y - size * 0.82 - arc * rowPx * 0.35 },
        { scaleX: 1 - 0.12 * arc },
        { scaleY: 1 + 0.16 * arc },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <Mascot variant="hop" size={size} mood={mood} animated={false} />
    </Animated.View>
  );
}

/** The grassy start bank, scrolling away as Hop crosses. */
function Bank({ poses, rowPx, baseY, width }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: screenY(0, poses.value[0] ?? 0, rowPx, baseY) - rowPx * 0.35 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height: rowPx * 3,
          backgroundColor: "#7BD88F",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
        style,
      ]}
    >
      <View
        style={{
          height: 10,
          backgroundColor: "#5BC274",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
      />
    </Animated.View>
  );
}

/** Ripples drift past to show the water moving under the camera. */
function Ripples({ poses, rowPx, baseY, width }) {
  const marks = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({ x: ((i * 37) % 90) + 5, row: i * 0.9 })),
    [],
  );
  return marks.map((m, i) => (
    <Ripple key={i} {...m} poses={poses} rowPx={rowPx} baseY={baseY} width={width} />
  ));
}

function Ripple({ x, row, poses, rowPx, baseY, width }) {
  const style = useAnimatedStyle(() => {
    const cam = poses.value[0] ?? 0;
    const span = 9 * ROW_H;
    const wy = cam - 2 * ROW_H + ((((row * ROW_H - cam) % span) + span) % span);
    return { transform: [{ translateY: screenY(wy, cam, rowPx, baseY) }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: (x / 100) * width,
          top: 0,
          width: 26,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.35)",
        },
        style,
      ]}
    />
  );
}

function StartCard({ onPress, challenge }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.06, { duration: 650 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View entering={ZoomIn.duration(320)} style={{ width: "100%", alignItems: "center" }}>
      <View style={cardShadow} className="w-full items-center rounded-3xl bg-white px-5 py-5">
        <Text style={display(36)}>Hop Across</Text>
        {challenge.level ? (
          <ChallengeGoal level={challenge.level} n={challenge.n} />
        ) : (
          <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
            Tap to hop to the next row of lily pads.{"\n"}Pads drift and slowly sink, so keep
            moving!{"\n"}Land on a fly for +{FLY_POINTS}.
          </Text>
        )}
        <Animated.View style={[{ marginTop: 16 }, style]}>
          <PrimaryButton title="Start" icon="play" onPress={onPress} />
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
export default function HopAcrossScreen() {
  const { level } = useLocalSearchParams();
  return <HopAcross key={level ?? "endless"} />;
}

function HopAcross() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;
  const cfg = useMemo(() => ({ ...HOP_DEFAULTS, ...(levelConfig ?? {}) }), [levelConfig]);

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [world, setWorld] = useState(() => createHopWorld(cfg, 1));
  const [hud, setHud] = useState({ rows: 0, flies: 0, score: 0, time: 0 });
  const [ending, setEnding] = useState(null);
  const [result, setResult] = useState(null);
  const [area, setArea] = useState(null);
  const poses = useSharedValue(world.poses());

  const sx = area ? area.w / W : 1;
  const rowPx = area ? Math.min(ROW_H * sx * 1.05, area.h / 6.2) : 80;
  const baseY = area ? area.h - rowPx * 0.9 : 0;

  const finish = useCallback(
    (w) => {
      setPhase("over");
      setEnding(w.reason);
      const stats = { rows: w.rows, flies: w.flies, score: w.score };
      setTimeout(() => {
        if (challenge.level) {
          const res = challenge.complete(stats, {});
          setResult({ ...res, challenge: true });
          return;
        }
        const outcome = recordGame(GAME.id, w.score, { xp: 10 + w.score });
        setResult({ ...outcome, ...stats });
      }, 700);
    },
    [challenge, recordGame],
  );

  // Fixed 60 Hz steps; poses pushed to the sprites every frame.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    let raf;
    let last = performance.now();
    let acc = 0;
    let shown = "";
    const tick = (now) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= STEP_MS && !world.over) {
        acc -= STEP_MS;
        for (const e of world.step()) {
          if (e.type === "jump") sfx("jump");
          else if (e.type === "land") {
            sfx("land");
            haptic.tap();
          } else if (e.type === "fly") {
            sfx(popFor(3));
            haptic.success();
          } else if (e.type === "splash" || e.type === "sank" || e.type === "swept") {
            sfx("wrong");
            haptic.error();
          } else if (e.type === "time") sfx("win");
        }
      }
      poses.set(world.poses());
      const key = `${world.rows}|${world.flies}|${Math.floor(world.time)}`;
      if (key !== shown || world.over) {
        shown = key;
        setHud({ rows: world.rows, flies: world.flies, score: world.score, time: world.time });
      }
      if (world.over) {
        finish(world);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, world, poses, finish]);

  const start = () => {
    const w = createHopWorld(cfg, (Date.now() % 100000) + 1);
    setWorld(w);
    poses.set(w.poses());
    setHud({ rows: 0, flies: 0, score: 0, time: 0 });
    setEnding(null);
    setResult(null);
    setPhase("playing");
    sfx("go");
  };

  const timeLeft = cfg.duration ? Math.max(0, cfg.duration - hud.time) : null;

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : GAME.title}
        score={hud.score}
        best={challenge.level ? challenge.bestLabel : best}
      />

      <View className="mt-3 flex-row items-center justify-between px-5">
        <View className="flex-row gap-2">
          <View className="rounded-full bg-white px-3 py-1.5">
            <Text className="font-body-black text-xs text-ink">
              🪷 {hud.rows} {hud.rows === 1 ? "row" : "rows"}
            </Text>
          </View>
          <View className="rounded-full bg-white px-3 py-1.5">
            <Text className="font-body-black text-xs text-ink">🪰 {hud.flies}</Text>
          </View>
        </View>
        {timeLeft != null && (
          <Text
            className={`font-body-black text-sm ${timeLeft <= 5 && phase === "playing" ? "text-[#E5484D]" : "text-ink"}`}
          >
            ⏱ {Math.ceil(timeLeft)}s
          </Text>
        )}
      </View>

      <View
        style={{ flex: 1, margin: 16, marginTop: 12, borderRadius: 28, overflow: "hidden" }}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => phase === "playing"}
        onResponderGrant={() => world.hop()}
        accessibilityRole="button"
        accessibilityLabel="Hop"
      >
        <LinearGradient
          colors={["#2EA8E0", "#46C3E8", "#6FD9EA"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {area && (
          <>
            <Ripples poses={poses} rowPx={rowPx} baseY={baseY} width={area.w} />
            <Bank poses={poses} rowPx={rowPx} baseY={baseY} width={area.w} />
            {Array.from({ length: VIS_ROWS * MAX_PADS }, (_, slot) => (
              <PadSprite key={slot} poses={poses} slot={slot} sx={sx} rowPx={rowPx} baseY={baseY} />
            ))}
            <Frog
              poses={poses}
              sx={sx}
              rowPx={rowPx}
              baseY={baseY}
              mood={phase === "over" ? "wow" : hud.flies > 0 ? "cheer" : "happy"}
              hidden={ending === "splash" || ending === "sank"}
            />
          </>
        )}
        {ending && ending !== "time" && (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <Animated.View entering={ZoomIn.duration(240)}>
              <View style={cardShadow} className="rounded-full bg-white px-5 py-2.5">
                <Text style={display(30)}>
                  {ending === "swept" ? "🌊 " : "💦 "}
                  {ENDINGS[ending]}
                </Text>
              </View>
            </Animated.View>
          </View>
        )}
        {phase === "ready" && (
          <View className="absolute inset-0 items-center justify-center px-5">
            <StartCard onPress={start} challenge={challenge} />
          </View>
        )}
        {phase === "playing" && hud.rows === 0 && hud.time < 3 && (
          <View
            pointerEvents="none"
            className="absolute top-4 self-center rounded-full bg-white px-4 py-2"
          >
            <Text className="font-body-bold text-sm text-ink">👆 Tap anywhere to hop</Text>
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
          title={ENDINGS[ending] ?? "Round over!"}
          game={GAME}
          score={hud.score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.rows} {result.rows === 1 ? "row" : "rows"} · {result.flies}{" "}
              {result.flies === 1 ? "fly" : "flies"}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
