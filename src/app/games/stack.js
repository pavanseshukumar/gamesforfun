import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
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

import { PrimaryButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import ScorePopup from "../../components/ScorePopup";
import { getGame } from "../../games/registry";
import { STACK_DEFAULTS } from "../../games/stack/levels";
import { colorFor, dropBlock, scoreFor, speedFor } from "../../games/stack/logic";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { BOUNCY } from "../../lib/motion";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

const GAME = getGame("stack");
const BH = 30; // block height
const GLOOP = 52;

let pieceId = 0;
let popupId = 0;

/** A chunky slab with a lighter top edge and darker underside. */
function Slab({ width, level }) {
  const c = colorFor(level);
  return (
    <View
      style={{ width, height: BH, borderRadius: 8, overflow: "hidden", backgroundColor: c.face }}
    >
      <View style={{ height: 6, backgroundColor: c.top }} />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          backgroundColor: c.side,
        }}
      />
    </View>
  );
}

/** The sliced-off overhang: drops, spins away and fades. */
function FallingPiece({ piece, top }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }));
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * 0.9,
    transform: [
      { translateX: piece.dir * 40 * t.value },
      { translateY: 420 * t.value },
      { rotate: `${piece.dir * 70 * t.value}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: piece.x, top }, style]}>
      <Slab width={piece.w} level={piece.level} />
    </Animated.View>
  );
}

function MovingBlock({ sim, top, level }) {
  const style = useAnimatedStyle(() => ({
    width: sim.value.w,
    transform: [{ translateX: sim.value.x }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top }, style]}>
      <Slab width="100%" level={level} />
    </Animated.View>
  );
}

const METRIC_UNITS = {
  height: "blocks",
  perfects: "perfects",
  perfectRun: "in a row",
  score: "pts",
};

// Remount per level so every level starts from a clean slate.
export default function StackTowerScreen() {
  const { level } = useLocalSearchParams();
  return <StackTower key={level ?? "endless"} />;
}

function StackTower() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const cfg = { ...STACK_DEFAULTS, ...(challenge.level?.config ?? {}) };

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [field, setField] = useState({ w: 350, h: 560 });
  const [tower, setTower] = useState([]); // [{ level, x, w }]
  const [pieces, setPieces] = useState([]); // falling slices
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mood, setMood] = useState("happy");
  const [popups, setPopups] = useState([]);
  const [result, setResult] = useState(null);

  const run = useRef({ height: 0, perfects: 0, bestRun: 0 });
  const busy = useRef(false);

  const baseW = Math.min(field.w * 0.6, 210) * cfg.baseScale;
  const baseY = field.h - 70; // top of the base block
  const topOf = (level) => baseY - level * BH;
  const rowsVisible = Math.floor((field.h * 0.5) / BH);

  // UI-thread state for the sliding block.
  const sim = useSharedValue({ running: false, x: 0, w: 100, dir: 1, speed: 200, max: 250 });
  const cam = useSharedValue(0);
  const hop = useSharedValue(0);
  const gx = useSharedValue(field.w / 2);
  const flash = useSharedValue(0);
  const dusk = useSharedValue(0);
  const night = useSharedValue(0);

  const loop = useFrameCallback((frame) => {
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    sim.modify((s) => {
      "worklet";
      if (!s.running) return s;
      s.x += s.dir * s.speed * dt;
      if (s.x > s.max) {
        s.x = s.max;
        s.dir = -1;
      } else if (s.x < 0) {
        s.x = 0;
        s.dir = 1;
      }
      return s;
    });
  }, false);

  const level = tower.length; // level the moving block is on
  const top = tower[tower.length - 1];

  // Gloop rides the top block; camera keeps the top of the tower in view.
  useEffect(() => {
    if (!top) return;
    gx.set(withSpring(top.x + top.w / 2 - GLOOP / 2, { damping: 15, stiffness: 160 }));
    cam.set(
      withSpring(Math.max(0, (tower.length - rowsVisible) * BH), { damping: 18, stiffness: 120 }),
    );
    dusk.set(withTiming(Math.min(1, Math.max(0, (tower.length - 15) / 15)), { duration: 900 }));
    night.set(withTiming(Math.min(1, Math.max(0, (tower.length - 35) / 15)), { duration: 900 }));
  }, [top, tower.length, rowsVisible, gx, cam, dusk, night]);

  const addPopup = useCallback(
    (text, color) => {
      const id = ++popupId;
      setPopups((p) => [...p, { id, x: field.w / 2, y: field.h * 0.32, text, color }]);
      setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 700);
    },
    [field.w, field.h],
  );

  /** Puts a fresh block on `lvl`, entering from alternating sides. */
  const launch = useCallback(
    (lvl, width) => {
      const fromLeft = lvl % 2 === 1;
      const max = field.w - width;
      sim.set({
        running: true,
        x: fromLeft ? 0 : max,
        w: width,
        dir: fromLeft ? 1 : -1,
        speed: speedFor(lvl) * cfg.speedScale,
        max,
      });
    },
    [cfg.speedScale, field.w, sim],
  );

  const start = () => {
    run.current = { height: 0, perfects: 0, bestRun: 0 };
    const base = { level: 0, x: (field.w - baseW) / 2, w: baseW };
    setTower([base]);
    setPieces([]);
    setPopups([]);
    setScore(0);
    setStreak(0);
    setMood("happy");
    setResult(null);
    cam.set(0);
    gx.set(base.x + base.w / 2 - GLOOP / 2);
    busy.current = false;
    launch(1, baseW);
    setPhase("playing");
    loop.setActive(true);
    sfx("go");
  };

  const finish = useCallback(() => {
    loop.setActive(false);
    setPhase("over");
    haptic.heavy();
    const r = run.current;
    const records = {
      stackHeight: r.height,
      stackPerfectRun: r.bestRun,
      stackPerfects: r.perfects,
    };
    if (challenge.level) {
      const res = challenge.complete(
        {
          height: r.height,
          perfects: r.perfects,
          perfectRun: r.bestRun,
          score: scoreFor(r.height, r.perfects),
        },
        records,
      );
      setResult({ ...res, challenge: true });
      return;
    }
    const outcome = recordGame(GAME.id, scoreFor(r.height, r.perfects), {
      xp: 10 + r.height,
      records,
    });
    setResult({ ...outcome, height: r.height, bestRun: r.bestRun });
  }, [challenge, loop, recordGame]);

  const drop = () => {
    if (phase !== "playing" || busy.current || !top) return;
    const s = sim.get();
    const moving = { x: s.x, w: s.w };
    const res = dropBlock(top, moving, streak, cfg.grow ? baseW : 0);
    const r = run.current;

    if (res.miss) {
      busy.current = true;
      sim.modify((v) => {
        "worklet";
        v.running = false;
        return v;
      });
      setPieces((p) => [
        ...p,
        { id: ++pieceId, level, x: moving.x, w: moving.w, dir: moving.x < top.x ? -1 : 1 },
      ]);
      setMood("wow");
      haptic.error();
      sfx("wrong");
      setTimeout(finish, 1000);
      return;
    }

    const placed = { level, ...res.placed };
    setTower((t) => [...t, placed]);
    r.height = level;

    hop.set(withSequence(withTiming(1, { duration: 120 }), withSpring(0, BOUNCY)));
    if (res.perfect) {
      r.perfects++;
      r.bestRun = Math.max(r.bestRun, res.streak);
      setMood("cheer");
      flash.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 420 })));
      haptic.success();
      sfx(res.grew ? "levelup" : popFor(Math.min(4, res.streak)));
      addPopup(
        res.grew ? "PERFECT · GROW!" : res.streak > 1 ? `PERFECT ×${res.streak}` : "PERFECT!",
        "#8A5CFF",
      );
    } else {
      setPieces((p) => [
        ...p,
        { id: ++pieceId, level, ...res.cut, dir: res.cut.x < placed.x ? -1 : 1 },
      ]);
      // A big slice makes Gloop nervous.
      setMood(res.cut.w > placed.w * 0.5 ? "wow" : "happy");
      haptic.tap();
      sfx("land");
      setTimeout(() => sfx("flip"), 40);
    }
    setStreak(res.streak);
    setScore(scoreFor(r.height, r.perfects));
    launch(level + 1, placed.w);
  };

  // Drop old falling pieces once they're off screen.
  useEffect(() => {
    if (!pieces.length) return undefined;
    const id = setTimeout(() => setPieces((p) => p.slice(-4)), 1000);
    return () => clearTimeout(id);
  }, [pieces]);

  const worldStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cam.value }] }));
  const gloopStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gx.value }, { translateY: -14 * hop.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.5 }));
  const duskStyle = useAnimatedStyle(() => ({ opacity: dusk.value }));
  const nightStyle = useAnimatedStyle(() => ({ opacity: night.value }));
  const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

  // Only render the blocks near the top; the rest are below the screen.
  const visible = tower.slice(-rowsVisible - 4);

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Stack"}
        score={score}
        best={challenge.level ? undefined : best}
      />

      <View
        style={{ flex: 1, margin: 20, marginTop: 14, borderRadius: 32, overflow: "hidden" }}
        onLayout={(e) =>
          setField({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
        onStartShouldSetResponder={() => phase === "playing"}
        onResponderGrant={drop}
        accessibilityRole="button"
        accessibilityLabel="Drop block"
      >
        {/* Sky: day → sunset → space as the tower grows */}
        <LinearGradient colors={["#9FD8FF", "#E9DEFF"]} style={fill} />
        <Animated.View pointerEvents="none" style={[fill, duskStyle]}>
          <LinearGradient colors={["#FF9A76", "#FFD1B8"]} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[fill, nightStyle]}>
          <LinearGradient colors={["#14123A", "#4B2F8F"]} style={{ flex: 1 }} />
        </Animated.View>

        <Text
          pointerEvents="none"
          style={[
            display(120),
            { position: "absolute", top: 8, alignSelf: "center", color: "rgba(255,255,255,0.55)" },
          ]}
        >
          {Math.max(0, tower.length - 1)}
        </Text>

        <Animated.View pointerEvents="none" style={[fill, worldStyle]}>
          {visible.map((b) => (
            <View key={b.level} style={{ position: "absolute", left: b.x, top: topOf(b.level) }}>
              <Slab width={b.w} level={b.level} />
            </View>
          ))}
          {phase === "playing" && <MovingBlock sim={sim} top={topOf(level)} level={level} />}
          {pieces.map((p) => (
            <FallingPiece key={p.id} piece={p} top={topOf(p.level)} />
          ))}
          {top && (
            <Animated.View
              style={[
                { position: "absolute", left: 0, top: topOf(top.level) - GLOOP * 1.1 + 4 },
                gloopStyle,
              ]}
            >
              <Mascot variant={GAME.mascot} size={GLOOP} mood={mood} />
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[fill, { backgroundColor: "#FFFFFF" }, flashStyle]}
        />
        {popups.map((p) => (
          <ScorePopup key={p.id} {...p} />
        ))}

        {phase === "playing" && tower.length <= 1 && (
          <Animated.View
            entering={FadeIn.delay(300)}
            exiting={FadeOut}
            pointerEvents="none"
            style={{ position: "absolute", bottom: 14, alignSelf: "center" }}
          >
            <View className="rounded-full bg-white px-4 py-2">
              <Text className="font-body-bold text-sm text-ink">👆 Tap to drop the block</Text>
            </View>
          </Animated.View>
        )}

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
                backgroundColor: "rgba(250,246,255,0.85)",
              },
            ]}
          >
            <Animated.View entering={ZoomIn.springify().damping(11)}>
              <Mascot variant={GAME.mascot} size={120} mood="cheer" />
            </Animated.View>
            <Text style={[display(44), { marginTop: 6 }]}>Stack Tower</Text>
            {challenge.level ? (
              <ChallengeGoal level={challenge.level} n={challenge.n} />
            ) : (
              <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
                Tap to drop each sliding block onto the tower.{"\n"}Overhangs get sliced off, so
                line them up!{"\n"}3 perfects in a row grows your block back.
              </Text>
            )}
            <PrimaryButton
              title="Start stacking"
              icon="layers"
              onPress={start}
              style={{ marginTop: 18 }}
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
          title="Toppled!"
          game={GAME}
          score={score}
          best={best}
          result={result}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              Height {result.height} · best perfect run {result.bestRun}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
