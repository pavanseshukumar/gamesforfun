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
import { IconButton } from "../../components/Buttons";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import { addRandomTile, canMove, maxTile, move, newBoard, SIZE } from "../../games/fusion/logic";
import { getGame } from "../../games/registry";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { BOUNCY } from "../../lib/motion";
import { useGameStore } from "../../store/useGameStore";

const GAME = getGame("fusion");
const GAP = 10;
const SLIDE_MS = 110;
const GOAL = 2048;

// [background, text] per value: soft pastels first, then saturated candy.
const TILE_COLORS = {
  2: ["#FFFFFF", "#141414"],
  4: ["#FFF3B8", "#141414"],
  8: ["#FFD43B", "#141414"],
  16: ["#FF9F1C", "#FFFFFF"],
  32: ["#FF6B3D", "#FFFFFF"],
  64: ["#FF3D8B", "#FFFFFF"],
  128: ["#B15CFF", "#FFFFFF"],
  256: ["#6B5CFF", "#FFFFFF"],
  512: ["#3F8CFF", "#FFFFFF"],
  1024: ["#13B5D6", "#FFFFFF"],
  2048: ["#1FBF7A", "#FFFFFF"],
};
const colorsFor = (v) => TILE_COLORS[v] ?? ["#141414", "#FFD43B"];

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
          borderRadius: 18,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          zIndex: tile.dead ? 1 : 2,
          shadowColor: tile.value >= 16 ? bg : "#1A1A40",
          shadowOpacity: tile.value >= 16 ? 0.5 : 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 4,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: fg,
          fontSize: fontSize * 1.05,
          fontFamily: "Anton_400Regular",
          includeFontPadding: false,
        }}
      >
        {tile.value}
      </Text>
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
      sfx(result.gained >= 128 ? "star" : result.gained ? "merge" : "whoosh");

      if (!reachedGoal.current && maxTile(next) >= GOAL) {
        reachedGoal.current = true;
        haptic.success();
        sfx("levelup");
        setToast(`${GOAL} fused! Keep going 🚀`);
        setTimeout(() => setToast(null), 2200);
      }

      if (stuck) {
        setTimeout(() => {
          haptic.error();
          setOver(
            recordGame(GAME.id, nextScore, {
              xp: 10 + Math.floor(nextScore / 25),
              records: { fusionTile: maxTile(next) },
            }),
          );
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
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={GAME.title}
        score={score}
        best={best}
        right={<IconButton icon="refresh" label="Restart" onPress={restart} />}
      />

      <GestureDetector gesture={swipe}>
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <View
              style={{
                width: boardSize,
                height: boardSize,
                padding: GAP,
                borderRadius: 30,
                backgroundColor: "rgba(255,255,255,0.45)",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.95)",
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
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.55)",
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

          <View className="mt-5 flex-row items-center">
            <Mascot variant={GAME.mascot} size={54} mood="happy" />
            <View className="ml-2 rounded-2xl bg-white px-4 py-2.5">
              <Text className="font-body-bold text-sm text-ink">Swipe to slide · fuse twins!</Text>
            </View>
          </View>
        </View>
      </GestureDetector>

      {toast && (
        <Animated.View
          entering={FadeInUp.springify()}
          exiting={FadeOut}
          style={{ position: "absolute", top: 120, alignSelf: "center", zIndex: 40 }}
        >
          <View className="rounded-full bg-ink px-5 py-2.5">
            <Text className="font-body-black text-white">{toast}</Text>
          </View>
        </Animated.View>
      )}

      {over && (
        <GameOverModal
          title="No moves left"
          game={GAME}
          score={score}
          best={best}
          result={over}
          onPlayAgain={restart}
          extra={
            <Text className="mt-2 font-body-semi text-sm text-ink-mute">
              Biggest tile: {maxTile(tiles)}
            </Text>
          }
        />
      )}
    </GradientScreen>
  );
}
