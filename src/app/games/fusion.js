import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Text, useWindowDimensions, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  FadeInUp,
  FadeOut,
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
import { addRandomTile, canMove, maxTile, move, newBoard, SIZE } from "../../games/fusion/logic";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { BOUNCY } from "../../lib/motion";
import { useGameStore } from "../../store/useGameStore";

const GAME = getGame("fusion");
const GAP = 10;
const SLIDE_MS = 110;
const GOAL = 2048;

const TILE_COLORS = {
  2: ["#1F3B4D", "#BFEFFF"],
  4: ["#1E4E5C", "#C8FFF4"],
  8: ["#14B8A6", "#FFFFFF"],
  16: ["#0EA5E9", "#FFFFFF"],
  32: ["#3B82F6", "#FFFFFF"],
  64: ["#6366F1", "#FFFFFF"],
  128: ["#8B5CF6", "#FFFFFF"],
  256: ["#A855F7", "#FFFFFF"],
  512: ["#D946EF", "#FFFFFF"],
  1024: ["#EC4899", "#FFFFFF"],
  2048: ["#FFC94D", "#2A1A00"],
};
const colorsFor = (v) => TILE_COLORS[v] ?? ["#FF6B5B", "#FFFFFF"];

function Tile({ tile, cell }) {
  const x = useSharedValue(tile.c * (cell + GAP));
  const y = useSharedValue(tile.r * (cell + GAP));
  const scale = useSharedValue(tile.isNew ? 0 : 1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    x.set(withTiming(tile.c * (cell + GAP), { duration: SLIDE_MS }));
    y.set(withTiming(tile.r * (cell + GAP), { duration: SLIDE_MS }));
  }, [tile.r, tile.c, cell, x, y]);

  useEffect(() => {
    if (tile.isNew) scale.set(withDelay(SLIDE_MS, withSpring(1, BOUNCY)));
  }, [tile.isNew, scale]);

  useEffect(() => {
    if (tile.merged) {
      scale.set(
        withDelay(
          SLIDE_MS * 0.6,
          withSequence(withTiming(1.22, { duration: 90 }), withSpring(1, BOUNCY)),
        ),
      );
    }
  }, [tile.value, tile.merged, scale]);

  useEffect(() => {
    if (tile.dead) opacity.set(withDelay(SLIDE_MS, withTiming(0, { duration: 60 })));
  }, [tile.dead, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  const [bg, fg] = colorsFor(tile.value);
  const digits = String(tile.value).length;
  const fontSize = cell * (digits <= 2 ? 0.42 : digits === 3 ? 0.34 : 0.27);

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: cell,
          height: cell,
          borderRadius: 16,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          zIndex: tile.dead ? 1 : 2,
          shadowColor: bg,
          shadowOpacity: tile.value >= 8 ? 0.6 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: tile.value >= 8 ? 6 : 0,
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize, fontWeight: "900" }}>{tile.value}</Text>
    </Animated.View>
  );
}

export default function Fusion() {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 420);
  const cell = (boardSize - GAP * (SIZE + 1)) / SIZE;

  const best = useGameStore((s) => s.best[GAME.id]);
  const recordGame = useGameStore((s) => s.recordGame);

  const [tiles, setTiles] = useState(() => newBoard());
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(null); // { isNewBest }
  const [toast, setToast] = useState(null);
  const reachedGoal = useRef(false);
  const busy = useRef(false);
  // Mirror of the board for the gesture/keyboard handlers, which can fire
  // between renders. React state drives rendering; this ref drives input.
  const game = useRef({ tiles, score, over: false });

  const handleMove = useCallback(
    (dir) => {
      const { tiles: current, score: currentScore, over: isOver } = game.current;
      if (isOver || busy.current) return;
      const result = move(current, dir);
      if (!result.moved) {
        haptic.select();
        return;
      }
      busy.current = true;
      setTimeout(() => {
        busy.current = false;
      }, SLIDE_MS * 0.8);

      const next = addRandomTile(result.tiles);
      const nextScore = currentScore + result.gained;
      const stuck = !canMove(next);
      game.current = { tiles: next, score: nextScore, over: stuck };
      setTiles(next);
      setScore(nextScore);
      if (result.gained >= 128) haptic.medium();
      else if (result.gained) haptic.tap();

      if (!reachedGoal.current && maxTile(next) >= GOAL) {
        reachedGoal.current = true;
        haptic.success();
        setToast(`${GOAL} fused! Keep going 🚀`);
        setTimeout(() => setToast(null), 2200);
      }

      if (stuck) {
        setTimeout(() => {
          haptic.error();
          const isNewBest = recordGame(GAME.id, nextScore);
          setOver({ isNewBest });
        }, 500);
      }
    },
    [recordGame],
  );

  // Arrow keys / WASD on web, for testing on a laptop.
  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const keys = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      a: "left",
      d: "right",
      w: "up",
      s: "down",
    };
    const onKey = (e) => {
      if (keys[e.key]) {
        e.preventDefault();
        handleMove(keys[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleMove]);

  const swipe = usePanGesture({
    runOnJS: true,
    minDistance: 12,
    onDeactivate: (e) => {
      if (e.canceled) return;
      const { translationX: dx, translationY: dy, velocityX: vx, velocityY: vy } = e;
      const far = Math.max(Math.abs(dx), Math.abs(dy)) >= 24;
      const fast = Math.max(Math.abs(vx), Math.abs(vy)) >= 300;
      if (!far && !fast) return;
      if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? "right" : "left");
      else handleMove(dy > 0 ? "down" : "up");
    },
  });

  const restart = () => {
    reachedGoal.current = false;
    const board = newBoard();
    game.current = { tiles: board, score: 0, over: false };
    setTiles(board);
    setScore(0);
    setOver(null);
  };

  return (
    <Screen tint="#22C9A8" secondTint="#3B82F6">
      <GameHeader
        title={GAME.title}
        accent={GAME.accent}
        score={score}
        best={best}
        right={
          <PressableScale onPress={restart} accessibilityLabel="Restart">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="refresh" size={20} color="#fff" />
            </View>
          </PressableScale>
        }
      />

      <GestureDetector gesture={swipe}>
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <View
              style={{
                width: boardSize,
                height: boardSize,
                padding: GAP,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              {/* Empty cell backdrop */}
              {Array.from({ length: SIZE * SIZE }, (_, i) => (
                <View
                  key={i}
                  style={{
                    position: "absolute",
                    left: GAP + (i % SIZE) * (cell + GAP),
                    top: GAP + Math.floor(i / SIZE) * (cell + GAP),
                    width: cell,
                    height: cell,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                />
              ))}
              <View style={{ flex: 1 }}>
                {tiles.map((t) => (
                  <Tile key={t.id} tile={t} cell={cell} />
                ))}
              </View>
            </View>
          </Animated.View>

          <Text className="mt-6 text-center text-sm text-mist">
            Swipe to slide · Fuse twins to double them
          </Text>
        </View>
      </GestureDetector>

      {toast && (
        <Animated.View
          entering={FadeInUp.springify()}
          exiting={FadeOut}
          style={{ position: "absolute", top: 120, alignSelf: "center", zIndex: 40 }}
        >
          <View className="rounded-full bg-gold px-5 py-2">
            <Text className="font-black text-ink">{toast}</Text>
          </View>
        </Animated.View>
      )}

      {over && (
        <GameOverModal
          title="No moves left"
          emoji={GAME.emoji}
          score={score}
          unit={GAME.unit}
          best={best}
          isNewBest={over.isNewBest}
          colors={GAME.colors}
          onPlayAgain={restart}
          extra={<Text className="mt-2 text-sm text-mist-300">Biggest tile: {maxTile(tiles)}</Text>}
        />
      )}
    </Screen>
  );
}
