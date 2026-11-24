import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
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

import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import { IconButton } from "../../components/Buttons";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { BOUNCY } from "../../lib/motion";
import { useGameStore } from "../../store/useGameStore";

const GAME = getGame("memory");
const COLS = 4;
const PAIRS = 8;
const GAP = 10;
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
function newDeck() {
  deckId++;
  const picks = shuffle(EMOJIS).slice(0, PAIRS);
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

export default function Memory() {
  const { width } = useWindowDimensions();
  const boardWidth = Math.min(width - 32, 420);
  const size = (boardWidth - GAP * (COLS - 1)) / COLS;

  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);

  const [deck, setDeck] = useState(newDeck);
  const [open, setOpen] = useState([]); // indexes of face-up unmatched cards
  const [moves, setMoves] = useState(0);
  const [shake, setShake] = useState(null); // { ids: [], n }
  const [over, setOver] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const locked = useRef(false);

  useEffect(() => {
    if (!started || over) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, over]);

  const matchedCount = deck.filter((c) => c.matched).length / 2;

  const flip = (index) => {
    const card = deck[index];
    if (locked.current || card.flipped || card.matched || over) return;
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
    setDeck(newDeck());
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
        title="Memory"
        score={moves}
        scoreLabel="Moves"
        best={best}
        right={<IconButton icon="shuffle" label="New deck" onPress={restart} />}
      />

      <View className="mt-4 flex-row items-center justify-between px-5">
        <Text className="font-body-black text-sm text-ink">
          ⏱ {mm}:{ss}
        </Text>
        <View className="flex-row gap-1">
          {Array.from({ length: PAIRS }, (_, i) => (
            <View
              key={i}
              className={`h-2.5 w-5 rounded-full ${i < matchedCount ? "bg-ink" : "bg-white/70"}`}
            />
          ))}
        </View>
      </View>

      <View className="flex-1 items-center justify-center">
        <View
          key={deck[0].key}
          style={[{ width: boardWidth, flexDirection: "row", flexWrap: "wrap", gap: GAP }]}
        >
          {deck.map((card, i) => (
            <Card
              key={card.key}
              card={card}
              index={i}
              size={size}
              onPress={() => flip(i)}
              shake={shake && shake.ids.includes(i) ? shake.n : null}
            />
          ))}
        </View>
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
      </View>

      {over && (
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
