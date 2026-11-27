import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { IconButton } from "../../components/Buttons";
import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import { MEMORY_DEFAULTS } from "../../games/memory/levels";
import { MAX_PEEKS, matchReward, newDeck, PEEK_MS, xpFor } from "../../games/memory/logic";
import { getGame } from "../../games/registry";
import { fmtTime } from "../../games/timeStars";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { popFor, sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

const GAME = getGame("memory");
const COLS = 4;
const GAP = 10;
const METRIC_UNITS = { moves: "moves", seconds: "seconds", pairs: "pairs" };
const FLIP = { duration: 300, easing: Easing.inOut(Easing.cubic) };
const GOLD = ["#FFF6BF", "#FFD84D"];

function Card({ card, index, size, onPress, shake }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const burst = useSharedValue(0);
  const h = size * 1.25;
  const up = card.flipped || card.matched;

  useEffect(() => {
    rotation.set(withTiming(up ? 180 : 0, FLIP));
  }, [up, rotation]);

  useEffect(() => {
    if (!card.matched) return;
    scale.set(
      withSequence(
        withTiming(1.12, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(0.96, { duration: 260, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
    burst.set(0);
    burst.set(withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }));
  }, [card.matched, scale, burst]);

  useEffect(() => {
    if (!shake) return;
    const t = { duration: 50 };
    shakeX.set(
      withSequence(
        withTiming(-8, t),
        withTiming(8, t),
        withTiming(-6, t),
        withTiming(6, t),
        withTiming(0, t),
      ),
    );
  }, [shake, shakeX]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.value}deg` }],
    opacity: interpolate(rotation.value, [89, 91], [1, 0], "clamp"),
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.value + 180}deg` }],
    opacity: interpolate(rotation.value, [89, 91], [0, 1], "clamp"),
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.value > 0 && burst.value < 1 ? 1 - burst.value : 0,
    transform: [{ scale: 0.9 + burst.value * 0.45 }],
  }));

  const face = {
    position: "absolute",
    width: size,
    height: h,
    borderRadius: size * 0.22,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  };
  const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

  return (
    <Animated.View entering={ZoomIn.delay(index * 30).duration(320)}>
      <Animated.View style={wrapperStyle}>
        {/* match burst: a ring that grows and fades around the card */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: -6,
              top: -6,
              width: size + 12,
              height: h + 12,
              borderRadius: size * 0.28,
              borderWidth: 4,
              borderColor: card.golden ? "#FFC400" : "#FFFFFF",
            },
            burstStyle,
          ]}
        />
        <PressableScale
          onPress={onPress}
          hapticFeedback={false}
          scaleTo={0.93}
          style={[cardShadow, { width: size, height: h, borderRadius: size * 0.22 }]}
          accessibilityLabel={up ? card.emoji : "Hidden card"}
        >
          {/* back */}
          <Animated.View style={[face, backStyle]}>
            <LinearGradient
              colors={GAME.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={fill}
            />
            <View
              style={{
                position: "absolute",
                right: -size * 0.22,
                top: -size * 0.22,
                width: size * 0.75,
                height: size * 0.75,
                borderRadius: size,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            />
            <View
              style={{
                position: "absolute",
                left: -size * 0.15,
                bottom: -size * 0.2,
                width: size * 0.55,
                height: size * 0.55,
                borderRadius: size,
                backgroundColor: "rgba(255,255,255,0.12)",
              }}
            />
            <View
              style={{
                width: size * 0.52,
                height: size * 0.52,
                borderRadius: size,
                borderWidth: 2.5,
                borderColor: "rgba(255,255,255,0.65)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="sparkles" size={size * 0.26} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* face */}
          <Animated.View
            style={[
              face,
              frontStyle,
              { backgroundColor: card.tint, borderColor: card.golden ? "#FFC400" : "#FFFFFF" },
            ]}
          >
            {card.golden && (
              <LinearGradient
                colors={GOLD}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={fill}
              />
            )}
            <Text style={{ fontSize: size * 0.46 }}>{card.emoji}</Text>
            {card.golden && (
              <Text style={{ position: "absolute", top: 4, left: 6, fontSize: size * 0.18 }}>
                ✨
              </Text>
            )}
            {card.matched && (
              <View
                style={{
                  position: "absolute",
                  right: 5,
                  top: 5,
                  width: size * 0.24,
                  height: size * 0.24,
                  borderRadius: size,
                  backgroundColor: "#1FB865",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={size * 0.17} color="#FFFFFF" />
              </View>
            )}
          </Animated.View>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

/** "Combo ×3", "Golden pair!": pops in over the board, then fades. */
function Banner({ banner }) {
  const s = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    if (!banner) return;
    s.set(0.5);
    o.set(1);
    s.set(withTiming(1, { duration: 280, easing: Easing.out(Easing.back(2.4)) }));
    o.set(withDelay(750, withTiming(0, { duration: 300 })));
  }, [banner, s, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  if (!banner) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", top: "38%", alignSelf: "center", zIndex: 10 }, style]}
    >
      <View
        style={cardShadow}
        className={`rounded-full px-5 py-2.5 ${banner.gold ? "bg-[#FFD84D]" : "bg-ink"}`}
      >
        <Text
          style={[display(26), { color: banner.gold ? "#1A1A1A" : "#FFFFFF", textAlign: "center" }]}
        >
          {banner.text}
        </Text>
        {banner.peek && (
          <Text
            className={`text-center font-body-black text-xs ${banner.gold ? "text-ink" : "text-white"}`}
          >
            +1 Peek 👀
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

/** Things the buddy says as you play. */
const CHATTER = {
  start: "Find the matching pairs! Psst… one pair is golden ✨",
  match: ["Nice one!", "You've got it!", "Great memory!", "Sharp!"],
  combo: ["On a roll! 🔥", "Unstoppable!", "Combo time!"],
  miss: ["So close!", "Hmm, not those two", "Remember where they were!"],
  peek: "Quick, look! 👀",
  half: "Halfway there!",
  done: "All done! 🎉",
};
const pick = (list, n) => list[n % list.length];

// Remount per level so every level starts from a clean slate.
export default function MemoryScreen() {
  const { level } = useLocalSearchParams();
  return <Memory key={level ?? "endless"} />;
}

function Memory() {
  const { width } = useWindowDimensions();
  const challenge = useChallenge(GAME.id);
  const cfg = useMemo(
    () => ({ ...MEMORY_DEFAULTS, ...(challenge.level?.config ?? {}) }),
    [challenge.level],
  );
  const PAIRS = cfg.pairs;
  const rows = (PAIRS * 2) / COLS;
  // The board's own measured space (between the status row and the footer).
  const [area, setArea] = useState(null);
  const boardWidth = Math.min(width - 32, 420);
  // Cards are 1.25× taller than wide; bigger decks shrink to fit the height.
  const byWidth = (boardWidth - GAP * (COLS - 1)) / COLS;
  const byHeight = area ? (area.h - 12 - GAP * (rows - 1)) / rows / 1.25 : byWidth;
  const size = Math.max(40, Math.min(byWidth, byHeight));
  const gridWidth = size * COLS + GAP * (COLS - 1);

  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);

  const [deck, setDeck] = useState(() => newDeck(cfg.pairs));
  const [memorising, setMemorising] = useState(cfg.peek > 0); // levels with a peek at the start
  const [peeking, setPeeking] = useState(false); // a Peek power-up in use
  const finished = useRef(false);
  const [open, setOpen] = useState([]); // indexes of face-up unmatched cards
  const [moves, setMoves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [peeks, setPeeks] = useState(0);
  const [banner, setBanner] = useState(null);
  const [say, setSay] = useState(CHATTER.start);
  const [mood, setMood] = useState("happy");
  const [shake, setShake] = useState(null); // { ids: [], n }
  const [over, setOver] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const locked = useRef(false);
  const events = useRef(0); // varies the chatter

  const talk = (text, m = "happy") => {
    setSay(text);
    setMood(m);
  };

  // Peek levels: everything face up for a moment, then the clock starts.
  const beginMemorise = useCallback(() => {
    if (cfg.peek <= 0) return undefined;
    const id = setTimeout(() => {
      setMemorising(false);
      sfx("flip");
      setStarted(true);
    }, cfg.peek * 1000);
    return () => clearTimeout(id);
  }, [cfg.peek]);
  useEffect(() => beginMemorise(), [beginMemorise]);

  useEffect(() => {
    if (!started || over) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, over]);

  /** Level end: judged on moves / time / pairs; unfinished decks don't score moves or time. */
  const finishLevel = useCallback(
    (cleared, finalMoves, pairsFound) => {
      if (finished.current) return;
      finished.current = true;
      const res = challenge.complete(
        {
          moves: cleared ? finalMoves : Infinity,
          seconds: cleared ? seconds : Infinity,
          pairs: pairsFound,
          score: pairsFound,
        },
        {},
      );
      setOver({ ...res, challenge: true });
    },
    [challenge, seconds],
  );

  // Time-limited levels end when the clock runs out.
  useEffect(() => {
    if (!challenge.level || !cfg.timeLimit || !started || over) return;
    if (seconds >= cfg.timeLimit) {
      locked.current = true;
      haptic.error();
      finishLevel(false, moves, deck.filter((c) => c.matched).length / 2);
    }
  }, [challenge.level, cfg.timeLimit, deck, finishLevel, moves, over, seconds, started]);

  const matchedCount = deck.filter((c) => c.matched).length / 2;

  const flip = (index) => {
    const card = deck[index];
    if (locked.current || memorising || peeking || card.flipped || card.matched || over) return;
    setStarted(true);
    haptic.tap();
    sfx("flip");

    const nextDeck = deck.map((c, i) => (i === index ? { ...c, flipped: true } : c));
    const nextOpen = [...open, index];
    setDeck(nextDeck);

    if (nextOpen.length < 2) {
      setOpen(nextOpen);
      return;
    }

    const [a, b] = nextOpen;
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setOpen([]);
    events.current++;

    if (nextDeck[a].symbol === nextDeck[b].symbol) {
      const run = streak + 1;
      const golden = nextDeck[a].golden;
      const reward = matchReward(run, golden);
      setStreak(run);
      setBestStreak((s) => Math.max(s, run));
      if (reward.peek) setPeeks((p) => Math.min(MAX_PEEKS, p + 1));
      haptic.success();
      setTimeout(() => sfx(golden ? "star" : run >= 2 ? popFor(run - 1) : "match"), 120);
      if (reward.peek && !golden) setTimeout(() => sfx("powerup"), 380);
      setBanner({
        text: reward.label,
        gold: golden,
        peek: reward.peek && peeks < MAX_PEEKS,
        n: events.current,
      });

      const matchedDeck = nextDeck.map((c, i) =>
        i === a || i === b ? { ...c, matched: true, flipped: false } : c,
      );
      setTimeout(() => setDeck(matchedDeck), 250);
      const found = matchedCount + 1;
      if (found === PAIRS) talk(CHATTER.done, "cheer");
      else if (run >= 3) talk(pick(CHATTER.combo, events.current), "cheer");
      else if (found === Math.ceil(PAIRS / 2)) talk(CHATTER.half, "cheer");
      else talk(pick(CHATTER.match, events.current), "happy");

      if (matchedDeck.every((c) => c.matched)) {
        setTimeout(() => {
          if (challenge.level) {
            finishLevel(true, nextMoves, PAIRS);
            return;
          }
          const topStreak = Math.max(bestStreak, run);
          setOver(
            recordGame(GAME.id, nextMoves, {
              lowerIsBetter: true,
              xp: xpFor(nextMoves, PAIRS, topStreak),
            }),
          );
        }, 1000);
      }
    } else {
      setStreak(0);
      if (streak >= 2 || events.current % 2 === 0) talk(pick(CHATTER.miss, events.current), "wow");
      locked.current = true;
      setTimeout(() => {
        haptic.error();
        sfx("wrong");
        setShake({ ids: [a, b], n: Date.now() });
      }, 450);
      setTimeout(() => {
        setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
        sfx("flip");
        locked.current = false;
      }, 900);
    }
  };

  /** Power-up: every face-down card shows for a moment. Not a move. */
  const triggerPeek = () => {
    if (peeks <= 0 || locked.current || memorising || peeking || over) return;
    setPeeks((p) => p - 1);
    setStarted(true);
    setPeeking(true);
    locked.current = true;
    haptic.success();
    sfx("whoosh");
    talk(CHATTER.peek, "wow");
    setTimeout(() => {
      setPeeking(false);
      sfx("flip");
      locked.current = false;
    }, PEEK_MS);
  };

  const restart = () => {
    if (challenge.level) {
      challenge.retry();
      return;
    }
    setDeck(newDeck(cfg.pairs));
    setOpen([]);
    setMoves(0);
    setStreak(0);
    setBestStreak(0);
    setPeeks(0);
    setBanner(null);
    talk(CHATTER.start);
    setSeconds(0);
    setOver(null);
    setStarted(false);
    locked.current = false;
  };

  const showAll = memorising || peeking;
  const limit = cfg.timeLimit;

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Memory"}
        score={moves}
        scoreLabel="Moves"
        best={challenge.level ? challenge.bestLabel : best}
        right={<IconButton icon="shuffle" label="New deck" onPress={restart} />}
      />

      {/* time · pairs found · combo · Peek */}
      <View className="mt-3 flex-row items-center gap-2 px-5">
        <View style={cardShadow} className="flex-1 rounded-2xl bg-white px-3 py-2">
          <View className="flex-row items-center justify-between">
            <Text
              className={`font-body-black text-sm ${limit && limit - seconds <= 10 ? "text-[#E5484D]" : "text-ink"}`}
            >
              ⏱ {limit ? fmtTime(Math.max(0, limit - seconds)) : fmtTime(seconds)}
            </Text>
            {streak >= 2 ? (
              <Text className="font-body-black text-xs text-[#FF6A00]">🔥 ×{streak}</Text>
            ) : (
              <Text className="font-body-bold text-xs text-ink-mute">
                {matchedCount}/{PAIRS} pairs
              </Text>
            )}
          </View>
          <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EEF3FF]">
            <View
              className="h-full rounded-full bg-[#3F6DFF]"
              style={{ width: `${(matchedCount / PAIRS) * 100}%` }}
            />
          </View>
        </View>
        <PressableScale
          onPress={triggerPeek}
          accessibilityLabel={`Peek, ${peeks} left`}
          accessibilityState={{ disabled: peeks === 0 }}
        >
          <View
            style={peeks ? cardShadow : null}
            className={`h-[52px] flex-row items-center rounded-2xl px-3.5 ${peeks ? "bg-ink" : "bg-white/60"}`}
          >
            <Ionicons name="eye" size={18} color={peeks ? "#FFFFFF" : "#9A93A8"} />
            <Text
              className={`ml-1.5 font-body-black text-sm ${peeks ? "text-white" : "text-ink-mute"}`}
            >
              Peek {peeks > 0 ? `×${peeks}` : ""}
            </Text>
          </View>
        </PressableScale>
      </View>

      <View
        className="flex-1 items-center justify-center"
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {/* Dealt once the space is measured, so cards never start oversized. */}
        {area && (
          <View
            key={deck[0].key}
            style={[{ width: gridWidth, flexDirection: "row", flexWrap: "wrap", gap: GAP }]}
          >
            {deck.map((card, i) => (
              <Card
                key={card.key}
                card={showAll && !card.matched ? { ...card, flipped: true } : card}
                index={i}
                size={size}
                onPress={() => flip(i)}
                shake={shake && shake.ids.includes(i) ? shake.n : null}
              />
            ))}
          </View>
        )}
        {memorising && (
          <View
            pointerEvents="none"
            className="absolute top-1 self-center rounded-full bg-ink px-4 py-1.5"
          >
            <Text className="font-body-black text-sm text-white">👀 Memorise!</Text>
          </View>
        )}
        <Banner banner={banner} />
      </View>

      {/* Footer: fixed height for the whole round, so the board never shifts. */}
      <View className="items-center px-5 pb-3">
        {challenge.level ? (
          <ChallengeGoal level={challenge.level} n={challenge.n} />
        ) : (
          <>
            <View className="mt-2 flex-row items-center">
              <Mascot variant={GAME.mascot} size={54} mood={mood} />
              <View
                style={cardShadow}
                className="ml-2 flex-shrink rounded-2xl bg-white px-4 py-2.5"
              >
                <Text className="font-body-bold text-sm text-ink">{say}</Text>
              </View>
            </View>
            {/* Levels shows before the first flip; its space stays reserved after. */}
            <View
              pointerEvents={started ? "none" : "auto"}
              style={{ opacity: started ? 0 : 1, marginTop: 8 }}
            >
              <LevelsButton
                gameId={GAME.id}
                count={challenge.count}
                onPress={challenge.openLevels}
              />
            </View>
          </>
        )}
      </View>

      {over?.challenge && (
        <ChallengeResult
          game={GAME}
          challenge={challenge}
          result={over}
          unit={METRIC_UNITS[challenge.level.metric]}
        />
      )}
      {over && !over.challenge && (
        <GameOverModal
          mood="success"
          title="All pairs found!"
          game={GAME}
          score={moves}
          best={best}
          result={over}
          onPlayAgain={restart}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              {fmtTime(seconds)} · best combo ×{bestStreak}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
