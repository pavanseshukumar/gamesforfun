import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { IconButton } from "../../components/Buttons";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Grump from "../../components/Grump";
import LevelsHeader from "../../components/LevelsHeader";
import LevelGrid, { Stars, totalStars } from "../../components/LevelGrid";
import Mascot from "../../components/Mascot";
import ScorePopup from "../../components/ScorePopup";
import { LEVELS } from "../../games/blob/levels";
import {
  BALL_R,
  clampPull,
  createWorld,
  GRUMP_R,
  scoreFor,
  SLING,
  starsFor,
  trajectory,
  WORLD,
} from "../../games/blob/world";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

const GAME = getGame("blob-launch");
const SHOTS = 3;
const DOTS = 14;
const MAX_FLIGHT_STEPS = 540;
const MATERIAL_LOOK = {
  wood: { bg: "#F2B36B", border: "#C77B33" },
  stone: { bg: "#A9B1C4", border: "#6F7891" },
  ice: { bg: "rgba(191,232,255,0.85)", border: "#7CC6F0" },
};

let popupId = 0;
// Stable fallback: a fresh {} per render would make the store selector loop forever.
const NO_PROGRESS = {};

// ---- sprites that follow the physics poses --------------------------------------
// poses is a flat array [x, y, angle, x, y, angle, …] in world units:
// index 0 = ball, then blocks, then grumps.

function BlockSprite({ poses, index, block, scale }) {
  const style = useAnimatedStyle(() => {
    const o = index * 3;
    return {
      transform: [
        { translateX: (poses.value[o] - block.w / 2) * scale },
        { translateY: (poses.value[o + 1] - block.h / 2) * scale },
        { rotate: `${poses.value[o + 2]}rad` },
      ],
    };
  });
  const look = MATERIAL_LOOK[block.type];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: block.w * scale,
          height: block.h * scale,
          borderRadius: 3,
          backgroundColor: look.bg,
          borderWidth: 1.5,
          borderColor: look.border,
        },
        style,
      ]}
    />
  );
}

function RoundSprite({ poses, index, radius, scale, children, hidden }) {
  const style = useAnimatedStyle(() => {
    const o = index * 3;
    return {
      opacity: hidden ? 0 : 1,
      transform: [
        { translateX: (poses.value[o] - radius) * scale },
        { translateY: (poses.value[o + 1] - radius) * scale },
        { rotate: `${poses.value[o + 2]}rad` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      {children}
    </Animated.View>
  );
}

/** One stretchy band from a sling post to the ball. */
function Band({ poses, from, scale, color, hidden }) {
  const style = useAnimatedStyle(() => {
    const dx = poses.value[0] - from.x;
    const dy = poses.value[1] - from.y;
    const len = Math.hypot(dx, dy);
    return {
      width: len * scale,
      transform: [
        { translateX: from.x * scale },
        { translateY: from.y * scale - 3 },
        { rotate: `${Math.atan2(dy, dx)}rad` },
      ],
    };
  });
  // The bands snap back once the ball has been released.
  if (hidden) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
          transformOrigin: "0% 50%",
        },
        style,
      ]}
    />
  );
}

function Dot({ dots, i, scale }) {
  const style = useAnimatedStyle(() => {
    const d = dots.value[i];
    return {
      opacity: d ? 1 - i / (DOTS + 2) : 0,
      transform: [
        { translateX: d ? d.x * scale - 4 : -20 },
        { translateY: d ? d.y * scale - 4 : -20 },
      ],
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
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#FFFFFF",
        },
        style,
      ]}
    />
  );
}

// ---- level select -------------------------------------------------------------------

function LevelSelect({ progress, onPick }) {
  const total = totalStars(progress);
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <LevelsHeader
        game={GAME}
        blurb="Drag back to aim, let go to fling Spike. Pop every Grump in 3 shots!"
        stars={total}
        max={LEVELS.length * 3}
      />

      <LevelGrid levels={LEVELS} progress={progress} onPick={onPick} accent={GAME.accent} />
    </ScrollView>
  );
}

// ---- the game -----------------------------------------------------------------------

export default function BlobLaunch() {
  const progress = useGameStore((s) => s.levels?.["blob-launch"] ?? NO_PROGRESS);
  const recordLevel = useGameStore((s) => s.recordLevel);
  const recordGame = useGameStore((s) => s.recordGame);

  const [levelIdx, setLevelIdx] = useState(null); // null = level select
  const [phase, setPhase] = useState("aiming"); // aiming | flying | result
  const [shotsLeft, setShotsLeft] = useState(SHOTS);
  const [popped, setPopped] = useState([]);
  const [popups, setPopups] = useState([]);
  const [result, setResult] = useState(null);
  const [field, setField] = useState({ w: 350, h: 560 });

  const level = levelIdx == null ? null : LEVELS[levelIdx];
  const scale = Math.min(field.w / WORLD.w, field.h / WORLD.h);

  // The loop reads the phase through a ref (updated synchronously at every
  // transition) so it never acts twice on the same frame-late state.
  const phaseRef = useRef("aiming");
  const go = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const world = useRef(null);
  const flightSteps = useRef(0);
  const shotsRef = useRef(SHOTS);
  const lastHit = useRef(0);
  const poses = useSharedValue([]);
  const dots = useSharedValue([]);

  const writePoses = useCallback(() => {
    const w = world.current;
    if (!w) return;
    const arr = [];
    for (const b of [w.ball, ...w.blocks, ...w.grumps])
      arr.push(b.position.x, b.position.y, b.angle);
    poses.set(arr);
  }, [poses]);

  const startLevel = useCallback(
    (i) => {
      world.current = createWorld(LEVELS[i]);
      flightSteps.current = 0;
      shotsRef.current = SHOTS;
      setLevelIdx(i);
      setShotsLeft(SHOTS);
      setPopped([]);
      setPopups([]);
      setResult(null);
      go("aiming");
      dots.set([]);
      writePoses();
      sfx("go");
    },
    [dots, go, writePoses],
  );

  const addPopup = useCallback(
    (x, y, text, color) => {
      const id = ++popupId;
      setPopups((p) => [...p, { id, x: x * scale, y: y * scale, text, color }]);
      setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 700);
    },
    [scale],
  );

  const finishLevel = useCallback(
    (cleared) => {
      const w = world.current;
      const n = levelIdx + 1;
      const used = SHOTS - shotsRef.current;
      go("result");
      if (!cleared) {
        haptic.error();
        setResult({ cleared: false, stars: 0, isNewBest: false, xpGained: 0, levelUp: null });
        return;
      }
      const stars = starsFor(used);
      const score = scoreFor(w.grumps.length, shotsRef.current);
      const { prevStars } = recordLevel(GAME.id, n, stars, score);
      const levels = useGameStore.getState().levels[GAME.id];
      const totalStars = Object.values(levels).reduce((a, l) => a + l.stars, 0);
      // XP for the first clear, plus extra for every newly earned star.
      const gained = Math.max(0, stars - prevStars);
      const outcome = recordGame(GAME.id, totalStars, {
        xp: 10 + gained * 15,
        records: { blobCleared: Object.keys(levels).length },
      });
      haptic.success();
      setResult({
        cleared: true,
        stars,
        score,
        isNewBest: stars > prevStars,
        xpGained: outcome.xpGained,
        levelUp: outcome.levelUp,
      });
    },
    [go, levelIdx, recordGame, recordLevel],
  );

  // Physics loop: fixed 60 Hz steps, poses pushed to the UI thread each frame.
  useEffect(() => {
    if (level == null) return undefined;
    let raf;
    let last = performance.now();
    let acc = 0;
    const tick = (now) => {
      acc += Math.min(100, now - last);
      last = now;
      const w = world.current;
      let steps = 0;
      while (acc >= 1000 / 60 && steps < 3) {
        acc -= 1000 / 60;
        steps++;
        for (const e of w.step()) {
          if (e.type === "pop") {
            setPopped((p) => [...p, e.index]);
            addPopup(e.x, e.y, "+1000", "#8E6CE8");
            haptic.medium();
            sfx("pop3");
          } else if (e.type === "hit" && now - lastHit.current > 120) {
            lastHit.current = now;
            sfx("land");
          }
        }
        if (phaseRef.current === "flying") flightSteps.current++;
      }
      writePoses();

      // End of a turn: everything has stopped (or it's taking too long).
      if (
        phaseRef.current === "flying" &&
        flightSteps.current > 30 &&
        (w.settled() || flightSteps.current > MAX_FLIGHT_STEPS)
      ) {
        if (w.remaining() === 0) finishLevel(true);
        else if (shotsRef.current === 0) finishLevel(false);
        else {
          w.reload();
          go("aiming");
          sfx("tick");
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level, addPopup, finishLevel, go, writePoses]);

  // ---- aiming -------------------------------------------------------------------------
  const pullRef = useRef({ x: 0, y: 0 });
  const aim = usePanGesture({
    runOnJS: true,
    minDistance: 4,
    onUpdate: (e) => {
      if (phaseRef.current !== "aiming" || !world.current) return;
      const pull = clampPull({ x: e.translationX / scale, y: e.translationY / scale });
      pullRef.current = pull;
      world.current.aim(pull);
      dots.set(Math.hypot(pull.x, pull.y) > 12 ? trajectory(pull, DOTS * 3, 3) : []);
    },
    onDeactivate: () => {
      if (phaseRef.current !== "aiming" || !world.current) return;
      const pull = pullRef.current;
      dots.set([]);
      if (Math.hypot(pull.x, pull.y) < 14) {
        world.current.reload(); // too small: treat as a cancel
        return;
      }
      world.current.launch(pull);
      pullRef.current = { x: 0, y: 0 };
      shotsRef.current -= 1;
      setShotsLeft(shotsRef.current);
      flightSteps.current = 0;
      go("flying");
      haptic.medium();
      sfx("jump");
    },
  });

  const worldW = WORLD.w * scale;
  const worldH = WORLD.h * scale;
  const ballSize = BALL_R * 2 * scale;
  const grumpSize = GRUMP_R * 2 * scale;
  const n = levelIdx == null ? 0 : levelIdx + 1;
  const hasNext = levelIdx != null && levelIdx < LEVELS.length - 1;

  const grumpsLeft = useMemo(
    () => (level ? level.grumps.length - popped.length : 0),
    [level, popped],
  );

  if (level == null) {
    return (
      <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text style={display(30)}>Levels</Text>
          <View style={{ width: 48 }} />
        </View>
        <LevelSelect progress={progress} onPick={startLevel} />
      </GradientScreen>
    );
  }

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={`Level ${n}`}
        score={grumpsLeft}
        scoreLabel="Grumps left"
        best={progress[n]?.stars ? "⭐".repeat(progress[n].stars) : undefined}
        right={
          <IconButton icon="refresh" label="Restart level" onPress={() => startLevel(levelIdx)} />
        }
      />

      <View className="mt-3 flex-row items-center justify-between px-5">
        <Text className="font-body-black text-sm text-ink">{level.name}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="mr-1 font-body-bold text-xs text-ink-soft">Shots</Text>
          {Array.from({ length: SHOTS }, (_, i) => (
            <View key={i} style={{ opacity: i < shotsLeft ? 1 : 0.25 }}>
              <Mascot variant="spike" size={22} animated={false} />
            </View>
          ))}
        </View>
      </View>

      <GestureDetector gesture={aim}>
        <View
          style={{
            flex: 1,
            margin: 16,
            marginTop: 10,
            borderRadius: 28,
            overflow: "hidden",
            justifyContent: "flex-end",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.25)",
          }}
          onLayout={(e) =>
            setField({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
        >
          <View style={{ width: worldW, height: worldH }}>
            {/* rolling hills + grassy ground */}
            <Svg
              width={worldW}
              height={worldH}
              viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
              style={{ position: "absolute" }}
            >
              <Path
                d={`M0 ${WORLD.ground - 40} Q100 ${WORLD.ground - 110} 200 ${WORLD.ground - 50} T400 ${WORLD.ground - 60} L400 ${WORLD.ground} L0 ${WORLD.ground} Z`}
                fill="#BFE8A8"
              />
              <Path
                d={`M0 ${WORLD.ground} L400 ${WORLD.ground} L400 ${WORLD.h} L0 ${WORLD.h} Z`}
                fill="#7FCB5F"
              />
              <Path
                d={`M0 ${WORLD.ground} L400 ${WORLD.ground} L400 ${WORLD.ground + 8} L0 ${WORLD.ground + 8} Z`}
                fill="#5FB043"
              />
              {/* sling: back post */}
              <Path
                d={`M${SLING.x - 4} ${WORLD.ground} L${SLING.x - 4} ${SLING.y + 30} L${SLING.x - 16} ${SLING.y - 6}`}
                stroke="#8A5A2B"
                strokeWidth={9}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>

            {(level.ledges ?? []).map((l, i) => (
              <View
                key={`ledge-${i}`}
                style={{
                  position: "absolute",
                  left: (l.x - l.w / 2) * scale,
                  top: (l.y - l.h / 2) * scale,
                  width: l.w * scale,
                  height: l.h * scale,
                  borderRadius: 4,
                  backgroundColor: "#5A4E8C",
                }}
              />
            ))}

            <Band
              poses={poses}
              from={{ x: SLING.x - 16, y: SLING.y - 6 }}
              scale={scale}
              color="#7A3E1E"
              hidden={phase !== "aiming"}
            />
            {level.blocks.map((b, i) => (
              <BlockSprite
                key={`b-${levelIdx}-${i}`}
                poses={poses}
                index={1 + i}
                block={b}
                scale={scale}
              />
            ))}
            {level.grumps.map((g, i) => (
              <RoundSprite
                key={`g-${levelIdx}-${i}`}
                poses={poses}
                index={1 + level.blocks.length + i}
                radius={GRUMP_R}
                scale={scale}
                hidden={popped.includes(i)}
              >
                <Grump size={grumpSize} />
              </RoundSprite>
            ))}
            <RoundSprite poses={poses} index={0} radius={BALL_R} scale={scale}>
              <View
                style={{
                  width: ballSize,
                  height: ballSize,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mascot
                  variant="spike"
                  size={ballSize * 1.25}
                  mood={phase === "flying" ? "cheer" : "happy"}
                  animated={false}
                />
              </View>
            </RoundSprite>
            {/* front post + front band sit in front of the ball */}
            <Band
              poses={poses}
              from={{ x: SLING.x + 14, y: SLING.y - 6 }}
              scale={scale}
              color="#9C5326"
              hidden={phase !== "aiming"}
            />
            <Svg
              width={worldW}
              height={worldH}
              viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
              style={{ position: "absolute" }}
              pointerEvents="none"
            >
              <Path
                d={`M${SLING.x + 4} ${WORLD.ground} L${SLING.x + 4} ${SLING.y + 30} L${SLING.x + 14} ${SLING.y - 6}`}
                stroke="#A86A33"
                strokeWidth={9}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
            {Array.from({ length: DOTS }, (_, i) => (
              <Dot key={i} dots={dots} i={i} scale={scale} />
            ))}
            {popups.map((p) => (
              <ScorePopup key={p.id} {...p} />
            ))}
          </View>

          {phase === "aiming" && shotsLeft === SHOTS && (
            <Animated.View
              entering={FadeIn.delay(400)}
              pointerEvents="none"
              style={{ position: "absolute", top: 14, alignSelf: "center" }}
            >
              <View className="rounded-full bg-white px-4 py-2">
                <Text className="font-body-bold text-sm text-ink">
                  👈 Drag back anywhere, let go to fling
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      </GestureDetector>

      {phase === "result" && result && (
        <GameOverModal
          title={result.cleared ? "Level cleared!" : "Out of shots!"}
          game={GAME}
          score={result.stars}
          best={progress[n]?.stars}
          result={result}
          mood={result.cleared ? "success" : "fail"}
          primaryLabel={result.cleared ? (hasNext ? "Next level" : "Play again") : "Try again"}
          primaryIcon={result.cleared && hasNext ? "arrow-forward" : "refresh"}
          onPlayAgain={() => startLevel(result.cleared && hasNext ? levelIdx + 1 : levelIdx)}
          secondaryLabel="All levels"
          onSecondary={() => setLevelIdx(null)}
          extra={
            <View className="mt-2 items-center">
              <Stars count={result.stars} size={26} />
              {result.cleared && (
                <Text className="mt-1 font-body-semi text-sm text-ink-mute">
                  Score {result.score.toLocaleString()}
                </Text>
              )}
            </View>
          }
        />
      )}
    </GradientScreen>
  );
}
