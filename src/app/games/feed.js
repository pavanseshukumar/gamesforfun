import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
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
import Mascot from "../../components/Mascot";
import { FEED_DEFAULTS } from "../../games/feed/levels";
import { createFeedGame } from "../../games/feed/logic";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("feed");
const METRIC_UNITS = { served: "fed", score: "pts", streak: "in a row" };
const TICK_MS = 50;
const TABLE = "#C98A55";

/** Patience bar colour: green, then amber, then red. */
/** A plain copy of the café for drawing (the live game stays in a ref). */
const snapshot = (cafe) => ({
  seats: cafe.seats.map((seat) => ({ ...seat, want: [...seat.want] })),
  menu: cafe.menu,
  score: cafe.score,
  served: cafe.served,
  streak: cafe.streak,
  lives: cafe.lives,
  timeLeft: cafe.timeLeft,
});

const moodColour = (f) => (f > 0.5 ? "#2BC46E" : f > 0.25 ? "#FFB020" : "#F0453A");

/** The café front: a scalloped awning and a sign, above the table. */
function CafeFront({ width, height }) {
  const stripes = Math.max(6, Math.round(width / 46));
  const sw = width / stripes;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height }}>
      <View style={{ flexDirection: "row" }}>
        {Array.from({ length: stripes }, (_, i) => (
          <View
            key={i}
            style={{
              width: sw,
              height: 44,
              backgroundColor: i % 2 ? "#FFFFFF" : "#FF7E5F",
              borderBottomLeftRadius: sw / 2,
              borderBottomRightRadius: sw / 2,
            }}
          />
        ))}
      </View>
      <View className="mt-4 items-center">
        <View style={{ width: 2, height: 14, backgroundColor: "#8A5A3A" }} />
        <View
          style={[cardShadow, { backgroundColor: "#3B2A22" }]}
          className="items-center rounded-2xl px-5 py-2"
        >
          <Text style={[display(24), { color: "#FFF3E0" }]}>Buddy Café</Text>
          <Text className="font-body-bold text-[11px] text-[#FFD9B0]">open for snacks</Text>
        </View>
      </View>
    </View>
  );
}

/** A "+12" that floats up from a fed buddy. */
function Floater({ text }) {
  const y = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    y.set(withTiming(-46, { duration: 800, easing: Easing.out(Easing.cubic) }));
    o.set(withDelay(450, withTiming(0, { duration: 350 })));
  }, [y, o]);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0 }, style]}>
      <Text style={[display(26), { color: "#F0653E" }]}>{text}</Text>
    </Animated.View>
  );
}

/** One place at the table: the buddy, their order bubble and patience bar. */
function Seat({ seat, width, mascot, shake, floater, highlight, onPress }) {
  const shakeX = useSharedValue(0);
  useEffect(() => {
    if (!shake) return;
    const t = { duration: 50 };
    shakeX.set(
      withSequence(withTiming(-9, t), withTiming(9, t), withTiming(-6, t), withTiming(0, t)),
    );
  }, [shake, shakeX]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const f = seat.state === "waiting" ? seat.patience / seat.max : 0;
  const mood =
    seat.state === "happy" ? "cheer" : seat.state === "upset" || f < 0.3 ? "wow" : "happy";
  const bubble =
    seat.state === "waiting" ? seat.want.join(" ") : seat.state === "happy" ? "😋" : "💢";

  return (
    <View
      style={{ width, alignItems: "center", justifyContent: "flex-end" }}
      onStartShouldSetResponder={() => seat.state === "waiting"}
      onResponderGrant={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        seat.state === "waiting" ? `Buddy wants ${seat.want.join(" and ")}` : "Empty seat"
      }
    >
      {seat.state !== "empty" && seat.buddy && (
        <Animated.View
          key={seat.id}
          entering={ZoomIn.duration(260)}
          exiting={FadeOut.duration(250)}
          style={{ alignItems: "center" }}
        >
          <Animated.View style={[{ alignItems: "center" }, style]}>
            {/* order bubble */}
            <View
              style={[
                cardShadow,
                {
                  borderWidth: 3,
                  borderColor: highlight ? "#F0653E" : "#FFFFFF",
                },
              ]}
              className="mb-1 items-center rounded-2xl bg-white px-2.5 pb-1.5 pt-1"
            >
              <Text style={{ fontSize: Math.min(30, width * 0.26) }}>{bubble}</Text>
              <View
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F3E9E0]"
                style={{ width: width * 0.5 }}
              >
                <View
                  style={{
                    width: `${f * 100}%`,
                    height: "100%",
                    borderRadius: 99,
                    backgroundColor: moodColour(f),
                  }}
                />
              </View>
            </View>
            <Mascot variant={seat.buddy} size={mascot} mood={mood} delay={seat.id * 137} />
          </Animated.View>
        </Animated.View>
      )}
      {seat.state === "empty" && (
        <View
          style={{ width: mascot * 0.7, height: mascot * 0.45, marginBottom: 4 }}
          className="rounded-t-3xl bg-white/50"
        />
      )}
      {floater && <Floater key={floater.n} text={floater.text} />}
    </View>
  );
}

/** A plate on the tray: drag it to a buddy, or tap it and then tap the buddy. */
function Plate({ food, size, selected, onDrop, onTap, onDragStart, drag }) {
  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 4,
    onActivate: () => onDragStart(food),
    onUpdate: (e) => {
      drag.x.set(e.translationX);
      drag.y.set(e.translationY);
    },
    onDeactivate: (e) => onDrop(food, e.translationX, e.translationY),
  });
  const tap = useTapGesture({ runOnJS: true, onActivate: () => onTap(food) });
  const gesture = useExclusiveGestures(pan, tap);
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityRole="button"
        accessibilityLabel={`Snack ${food}`}
        style={[
          cardShadow,
          {
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: "#FFFFFF",
            borderWidth: 4,
            borderColor: selected ? "#F0653E" : "#FFE9D2",
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.5 }}>{food}</Text>
      </View>
    </GestureDetector>
  );
}

function StartCard({ onPress, challenge }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1.06, { duration: 650 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <View className="items-center px-6">
      <Animated.View entering={ZoomIn.duration(320)}>
        <View className="flex-row items-end">
          <Mascot variant="bun" size={76} mood="happy" delay={300} />
          <Mascot variant="pom" size={96} mood="cheer" />
          <Mascot variant="kit" size={86} mood="wow" delay={600} />
        </View>
      </Animated.View>
      <Text style={[display(40), { marginTop: 6 }]}>Snack time!</Text>
      {challenge.level ? (
        <ChallengeGoal level={challenge.level} n={challenge.n} />
      ) : (
        <Text className="mt-2 text-center font-body-semi text-sm leading-5 text-ink-soft">
          Drag the snack each buddy asks for onto them,{"\n"}or tap a snack and then the buddy.
          {"\n"}Don’t keep them waiting: each one that leaves{"\n"}hungry costs a ❤️.
        </Text>
      )}
      <Animated.View entering={FadeIn.delay(200)}>
        <Animated.View style={[{ marginTop: 16 }, style]}>
          <PrimaryButton title="Open the café" icon="restaurant" onPress={onPress} />
        </Animated.View>
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
  );
}

// Remount per level so every level starts from a clean slate.
export default function FeedScreen() {
  const { level } = useLocalSearchParams();
  return <Feed key={level ?? "endless"} />;
}

function Feed() {
  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);
  const challenge = useChallenge(GAME.id);
  const levelConfig = challenge.level?.config;
  const cfg = useMemo(() => ({ ...FEED_DEFAULTS, ...(levelConfig ?? {}) }), [levelConfig]);

  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const game = useRef(null);
  const [g, setSnap] = useState(null); // what's on screen, copied from `game` each tick
  const [stage, setStage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null); // { food, x, y }: the snack in your hand
  const [shakes, setShakes] = useState({}); // seat → n
  const [floaters, setFloaters] = useState({}); // seat → { text, n }
  const [result, setResult] = useState(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const drag = useMemo(() => ({ x: dragX, y: dragY }), [dragX, dragY]);
  const events = useRef(0);

  const seats = g?.seats ?? [];
  const menu = g?.menu ?? [];

  // Layout inside the stage: buddies along the top, the tray along the bottom.
  const W = stage?.w ?? 0;
  const H = stage?.h ?? 0;
  const seatW = seats.length ? W / seats.length : W;
  const mascot = Math.min(seatW * 0.78, H * 0.26, 120);
  const perRow = menu.length > 4 ? Math.ceil(menu.length / 2) : menu.length;
  const trayRows = menu.length ? Math.ceil(menu.length / perRow) : 1;
  const plate = Math.min(84, (W - 32) / Math.max(perRow, 1) - 14);
  const trayH = trayRows * (plate + 14) + 18;
  const trayTop = H - trayH;
  const plateCentre = (i) => {
    const r = Math.floor(i / perRow);
    const inRow = Math.min(perRow, menu.length - r * perRow);
    const gap = (W - inRow * plate) / (inRow + 1);
    const c = i % perRow;
    return {
      x: gap + c * (plate + gap) + plate / 2,
      y: trayTop + 16 + r * (plate + 14) + plate / 2,
    };
  };

  const finish = useCallback(
    (cafe) => {
      setPhase("over");
      setDragging(null);
      const stats = { served: cafe.served, score: cafe.score, streak: cafe.bestStreak };
      setTimeout(() => {
        if (challenge.level) {
          const res = challenge.complete(stats, {});
          setResult({ ...res, challenge: true });
          return;
        }
        const outcome = recordGame(GAME.id, cafe.score, { xp: 10 + Math.floor(cafe.score / 10) });
        setResult({ ...outcome, ...stats });
      }, 500);
    },
    [challenge, recordGame],
  );

  const handle = useCallback((list) => {
    for (const e of list) {
      events.current += 1;
      const n = events.current;
      if (e.type === "arrive") sfx("tap");
      else if (e.type === "served") {
        sfx(popFor(Math.min(4, e.streak)));
        haptic.success();
        setFloaters((f) => ({ ...f, [e.seat]: { text: `+${e.points}`, n } }));
      } else if (e.type === "partial") {
        sfx("select");
        haptic.tap();
        setFloaters((f) => ({ ...f, [e.seat]: { text: "+3", n } }));
      } else if (e.type === "wrong") {
        sfx("wrong");
        haptic.error();
        setShakes((s) => ({ ...s, [e.seat]: n }));
      } else if (e.type === "upset") {
        sfx("warn");
        haptic.error();
        setShakes((s) => ({ ...s, [e.seat]: n }));
      } else if (e.type === "time") sfx("win");
      else if (e.type === "out") sfx("gameover");
    }
  }, []);

  // The café clock.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const cafe = game.current;
      handle(cafe.tick(Math.min(0.2, (now - last) / 1000)));
      last = now;
      setSnap(snapshot(cafe));
      if (cafe.over) {
        clearInterval(id);
        finish(cafe);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, finish, handle]);

  const serve = (seatIndex, food) => {
    const cafe = game.current;
    if (!cafe || phase !== "playing") return;
    cafe.serve(seatIndex, food);
    handle(cafe.tick(0));
    setSelected(null);
    setSnap(snapshot(cafe));
  };

  const seatAt = (x, y) => {
    if (y > trayTop - 6 || y < 0) return -1;
    const i = Math.floor(x / seatW);
    return i >= 0 && i < seats.length ? i : -1;
  };

  const start = () => {
    game.current = createFeedGame(cfg, (Date.now() % 100000) + 1);
    setSelected(null);
    setShakes({});
    setFloaters({});
    setResult(null);
    setPhase("playing");
    setSnap(snapshot(game.current));
    sfx("go");
  };

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { scale: 1.15 }],
  }));

  const timeLeft = g && cfg.duration ? g.timeLeft : null;
  const ratio = timeLeft == null ? 1 : timeLeft / cfg.duration;

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Feed"}
        score={g?.score ?? 0}
        best={challenge.level ? challenge.bestLabel : best}
      />

      <View className="mt-3 px-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-body-black text-sm text-ink">
            {"❤️".repeat(Math.max(0, g?.lives ?? cfg.lives))}
            <Text className="text-ink-mute">
              {"🤍".repeat(Math.max(0, cfg.lives - (g?.lives ?? cfg.lives)))}
            </Text>
          </Text>
          <View className="flex-row items-center gap-2">
            {(g?.streak ?? 0) >= 2 && (
              <Text className="font-body-black text-xs text-[#F0653E]">🔥 ×{g.streak}</Text>
            )}
            <View className="rounded-full bg-white px-3 py-1">
              <Text className="font-body-black text-xs text-ink">😋 {g?.served ?? 0} fed</Text>
            </View>
          </View>
        </View>
        {timeLeft != null && (
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
        )}
      </View>

      <View
        style={{ flex: 1, marginTop: 8 }}
        onLayout={(e) =>
          setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {phase === "ready" && (
          <View className="flex-1 items-center justify-center">
            <StartCard onPress={start} challenge={challenge} />
          </View>
        )}

        {phase !== "ready" && stage && g && (
          <>
            <CafeFront width={W} height={trayTop} />
            {/* the table */}
            <View
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                top: trayTop - 40 - mascot * 0.15,
                height: 26,
                borderRadius: 14,
                backgroundColor: TABLE,
              }}
            />
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: trayTop - 30,
                flexDirection: "row",
                alignItems: "flex-end",
              }}
            >
              {seats.map((seat, i) => (
                <Seat
                  key={i}
                  seat={seat}
                  width={seatW}
                  mascot={mascot}
                  shake={shakes[i]}
                  floater={floaters[i]}
                  highlight={selected != null && seat.state === "waiting"}
                  onPress={() => selected != null && serve(i, selected)}
                />
              ))}
            </View>

            {/* the tray */}
            <View
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                top: trayTop,
                bottom: 8,
                borderRadius: 28,
                backgroundColor: "rgba(255,255,255,0.55)",
              }}
            />
            {menu.map((food, i) => {
              const c = plateCentre(i);
              const lifted = dragging?.food === food;
              return (
                <View
                  key={food}
                  style={{
                    position: "absolute",
                    left: c.x - plate / 2,
                    top: c.y - plate / 2,
                    opacity: lifted ? 0.35 : 1,
                  }}
                >
                  <Plate
                    food={food}
                    size={plate}
                    selected={selected === food}
                    drag={drag}
                    onTap={(f) => {
                      haptic.select();
                      setSelected((s) => (s === f ? null : f));
                    }}
                    onDragStart={(f) => {
                      dragX.set(0);
                      dragY.set(0);
                      setDragging({ food: f, x: c.x, y: c.y });
                      setSelected(null);
                      haptic.tap();
                    }}
                    onDrop={(f, dx, dy) => {
                      setDragging(null);
                      const seat = seatAt(c.x + dx, c.y + dy);
                      if (seat >= 0) serve(seat, f);
                    }}
                  />
                </View>
              );
            })}

            {/* the snack following your finger */}
            {dragging && (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    left: dragging.x - plate / 2,
                    top: dragging.y - plate / 2,
                    width: plate,
                    height: plate,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  dragStyle,
                ]}
              >
                <Text style={{ fontSize: plate * 0.62 }}>{dragging.food}</Text>
              </Animated.View>
            )}
          </>
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
          title={g?.lives > 0 ? "Café closed!" : "Out of hearts!"}
          game={GAME}
          score={g?.score ?? 0}
          best={best}
          result={result}
          mood={g?.lives > 0 ? "success" : undefined}
          onPlayAgain={start}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {result.served} buddies fed · best streak {result.streak}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
