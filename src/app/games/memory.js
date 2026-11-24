import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { ChallengeGoal, ChallengeResult, LevelsButton } from "../../components/Challenge";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import { IconButton } from "../../components/Buttons";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import { MEMORY_DEFAULTS } from "../../games/memory/levels";
import { getGame } from "../../games/registry";
import useChallenge from "../../games/useChallenge";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { BOUNCY } from "../../lib/motion";
import { useGameStore } from "../../store/useGameStore";

const GAME = getGame("memory");
const COLS = 4;
const GAP = 10;
const METRIC_UNITS = { moves: "moves", seconds: "seconds", pairs: "pairs" };
const EMOJIS = ["🍕", "🚀", "🎸", "🦊", "🌈", "🍩", "⚽", "🐙", "🌵", "🎈", "🍉", "🦄", "🐢", "🍔"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let deckId = 0;
function newDeck(pairs = MEMORY_DEFAULTS.pairs) {
  deckId++;
  const picks = shuffle(EMOJIS).slice(0, pairs);
  return shuffle([...picks, ...picks]).map((emoji, i) => ({
    key: `${deckId}-${i}`,
    emoji,
    flipped: false,
    matched: false,
  }));
}

function Card({ card, index, size, onPress, shake }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    rotation.set(
      withSpring(card.flipped || card.matched ? 180 : 0, {
        damping: 15,
        stiffness: 170,
      }),
    );
  }, [card.flipped, card.matched, rotation]);

  useEffect(() => {
    if (card.matched) {
      scale.set(
        withDelay(150, withSequence(withTiming(1.15, { duration: 120 }), withSpring(1, BOUNCY))),
      );
    }
  }, [card.matched, scale]);

  useEffect(() => {
    if (shake) {
      shakeX.set(
        withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming(6, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        ),
      );
    }
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

  const face = {
    position: "absolute",
    width: size,
    height: size * 1.25,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  };

  return (
    <Animated.View
      entering={ZoomIn.delay(index * 35)
        .springify()
        .damping(13)}
    >
      <Animated.View style={wrapperStyle}>
        <PressableScale
          onPress={onPress}
          hapticFeedback={false}
          scaleTo={0.92}
          style={{ width: size, height: size * 1.25 }}
          accessibilityLabel={card.flipped || card.matched ? card.emoji : "Hidden card"}
        >
          <Animated.View style={[face, backStyle]}>
            <LinearGradient
              colors={GAME.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  right: -size * 0.2,
                  top: -size * 0.2,
                  width: size * 0.7,
                  height: size * 0.7,
                  borderRadius: size,
                  backgroundColor: "rgba(255,255,255,0.18)",
                }}
              />
              <Text
                style={{ fontFamily: "Anton_400Regular", fontSize: size * 0.42, color: "#FFFFFF" }}
              >
                ?
              </Text>
            </LinearGradient>
          </Animated.View>
          <Animated.View
            style={[
              face,
              frontStyle,
              {
                backgroundColor: card.matched ? "#E3FBD0" : "#FFFFFF",
                borderColor: card.matched ? "#2BD67B" : "#FFFFFF",
              },
            ]}
          >
            <Text style={{ fontSize: size * 0.48 }}>{card.emoji}</Text>
          </Animated.View>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

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
  const [area, setArea] = useState(null);
  const boardWidth = Math.min(width - 32, 420);
  // Cards are 1.25× taller than wide; bigger decks shrink to fit the height.
  const byWidth = (boardWidth - GAP * (COLS - 1)) / COLS;
  const byHeight = area
    ? (area.h - (challenge.level ? 170 : 110) - GAP * (rows - 1)) / rows / 1.25
    : byWidth;
  const size = Math.max(40, Math.min(byWidth, byHeight));
  const gridWidth = size * COLS + GAP * (COLS - 1);

  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);

  const [deck, setDeck] = useState(() => newDeck(cfg.pairs));
  const [peeking, setPeeking] = useState(cfg.peek > 0);
  const finished = useRef(false);
  const [open, setOpen] = useState([]); // indexes of face-up unmatched cards
  const [moves, setMoves] = useState(0);
  const [shake, setShake] = useState(null); // { ids: [], n }
  const [over, setOver] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const locked = useRef(false);

  // Peek levels: everything face up for a moment, then the clock starts.
  const beginPeek = useCallback(() => {
    if (cfg.peek <= 0) return undefined;
    const id = setTimeout(() => {
      setPeeking(false);
      sfx("flip");
      setStarted(true);
    }, cfg.peek * 1000);
    return () => clearTimeout(id);
  }, [cfg.peek]);
  useEffect(() => beginPeek(), [beginPeek]);

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
    if (locked.current || peeking || card.flipped || card.matched || over) return;
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

    if (nextDeck[a].emoji === nextDeck[b].emoji) {
      haptic.success();
      setTimeout(() => sfx("match"), 120);
      const matchedDeck = nextDeck.map((c, i) =>
        i === a || i === b ? { ...c, matched: true, flipped: false } : c,
      );
      setTimeout(() => setDeck(matchedDeck), 250);
      if (matchedDeck.every((c) => c.matched)) {
        setTimeout(() => {
          if (challenge.level) {
            finishLevel(true, nextMoves, PAIRS);
            return;
          }
          // Fewer moves earn more XP: a perfect 8-move clear is worth 58.
          const xp = 10 + Math.max(0, 48 - (nextMoves - 8) * 3);
          setOver(recordGame(GAME.id, nextMoves, { lowerIsBetter: true, xp }));
        }, 900);
      }
    } else {
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

  const restart = () => {
    if (challenge.level) {
      challenge.retry();
      return;
    }
    setDeck(newDeck(cfg.pairs));
    setOpen([]);
    setMoves(0);
    setSeconds(0);
    setOver(null);
    setStarted(false);
    locked.current = false;
  };

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={challenge.level ? `Level ${challenge.n}` : "Memory"}
        score={moves}
        scoreLabel="Moves"
        best={challenge.level ? undefined : best}
        right={<IconButton icon="shuffle" label="New deck" onPress={restart} />}
      />

      <View className="mt-4 flex-row items-center justify-between px-5">
        <Text className="font-body-black text-sm text-ink">
          ⏱ {mm}:{ss}
          {cfg.timeLimit
            ? ` / ${Math.floor(cfg.timeLimit / 60)}:${String(cfg.timeLimit % 60).padStart(2, "0")}`
            : ""}
        </Text>
        <View className="flex-row gap-1">
          {Array.from({ length: PAIRS }, (_, i) => (
            <View
              key={i}
              className={`h-2.5 rounded-full ${PAIRS > 8 ? "w-3" : "w-5"} ${i < matchedCount ? "bg-ink" : "bg-white/70"}`}
            />
          ))}
        </View>
      </View>

      <View
        className="flex-1 items-center justify-center"
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {peeking && (
          <View className="mb-2 rounded-full bg-ink px-4 py-1.5">
            <Text className="font-body-black text-sm text-white">👀 Memorise!</Text>
          </View>
        )}
        <View
          key={deck[0].key}
          style={[{ width: gridWidth, flexDirection: "row", flexWrap: "wrap", gap: GAP }]}
        >
          {deck.map((card, i) => (
            <Card
              key={card.key}
              card={peeking ? { ...card, flipped: true } : card}
              index={i}
              size={size}
              onPress={() => flip(i)}
              shake={shake && shake.ids.includes(i) ? shake.n : null}
            />
          ))}
        </View>
        {challenge.level ? (
          <View className="mt-3 w-full px-5">
            <ChallengeGoal level={challenge.level} n={challenge.n} />
          </View>
        ) : (
          <View className="mt-5 flex-row items-center">
            <Mascot
              variant={GAME.mascot}
              size={54}
              mood={matchedCount >= PAIRS / 2 ? "cheer" : "happy"}
            />
            <View className="ml-2 rounded-2xl bg-white px-4 py-2.5">
              <Text className="font-body-bold text-sm text-ink">
                {matchedCount === 0
                  ? "Find the matching pairs!"
                  : matchedCount === PAIRS
                    ? "All done! 🎉"
                    : `${PAIRS - matchedCount} pairs to go!`}
              </Text>
            </View>
          </View>
        )}
        {!challenge.level && !started && (
          <LevelsButton
            gameId={GAME.id}
            count={challenge.count}
            onPress={challenge.openLevels}
            style={{ marginTop: 10 }}
          />
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
              Time: {mm}:{ss}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
