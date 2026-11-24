import { Ionicons } from "@expo/vector-icons";
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
import PressableScale from "../../components/PressableScale";
import Screen from "../../components/Screen";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
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
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    overflow: "hidden",
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
              <View className="h-1/2 w-1/2 items-center justify-center rounded-2xl border-2 border-white/30">
                <Text className="text-xl font-black text-white/80">?</Text>
              </View>
            </LinearGradient>
          </Animated.View>
          <Animated.View
            style={[
              face,
              frontStyle,
              {
                backgroundColor: card.matched ? "#2B2158" : "#F5F3FF",
                borderWidth: 2,
                borderColor: card.matched ? "#A26BFA" : "transparent",
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
      const matchedDeck = nextDeck.map((c, i) =>
        i === a || i === b ? { ...c, matched: true, flipped: false } : c,
      );
      setTimeout(() => setDeck(matchedDeck), 250);
      if (matchedDeck.every((c) => c.matched)) {
        setTimeout(() => {
          const isNewBest = recordGame(GAME.id, nextMoves, { lowerIsBetter: true });
          setOver({ isNewBest });
        }, 900);
      }
    } else {
      locked.current = true;
      setTimeout(() => {
        haptic.error();
        setShake({ ids: [a, b], n: Date.now() });
      }, 450);
      setTimeout(() => {
        setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
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
    <Screen tint="#A26BFA" secondTint="#F25FB4">
      <GameHeader
        title={GAME.title}
        accent={GAME.accent}
        score={moves}
        scoreLabel="Moves"
        best={best}
        right={
          <PressableScale onPress={restart} accessibilityLabel="New deck">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="shuffle" size={20} color="#fff" />
            </View>
          </PressableScale>
        }
      />

      <View className="mt-4 flex-row items-center justify-between px-4">
        <Text className="font-bold text-mist">
          ⏱ {mm}:{ss}
        </Text>
        <View className="flex-row gap-1">
          {Array.from({ length: PAIRS }, (_, i) => (
            <View
              key={i}
              className={`h-2 w-4 rounded-full ${i < matchedCount ? "bg-flip" : "bg-white/15"}`}
            />
          ))}
        </View>
      </View>

      <View className="flex-1 items-center justify-center">
        <View
          key={deck[0].key}
          style={{ width: boardWidth, flexDirection: "row", flexWrap: "wrap", gap: GAP }}
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
      </View>

      {over && (
        <GameOverModal
          title="All pairs found!"
          emoji={GAME.emoji}
          score={moves}
          unit={GAME.unit}
          best={best}
          isNewBest={over.isNewBest}
          colors={GAME.colors}
          onPlayAgain={restart}
          extra={
            <Text className="mt-2 text-sm text-mist-300">
              Time: {mm}:{ss}
            </Text>
          }
        />
      )}
    </Screen>
  );
}
