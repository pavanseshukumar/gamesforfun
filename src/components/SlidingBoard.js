import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";

import { blankOf, sizeOf } from "../games/sliding";
import PressableScale from "./PressableScale";
import PuzzleArt from "./PuzzleArt";

const GAP = 6;
const PAD = 8;
const TILE_SPRING = { damping: 18, stiffness: 260, mass: 0.6 };

function Tile({ id, index, size, tile, variant, inner, showNumber, onPress }) {
  const cell = tile + GAP;
  const x = useSharedValue((index % size) * cell);
  const y = useSharedValue(Math.floor(index / size) * cell);

  useEffect(() => {
    x.set(withSpring((index % size) * cell, TILE_SPRING));
    y.set(withSpring(Math.floor(index / size) * cell, TILE_SPRING));
  }, [index, size, cell, x, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  // Where this piece of the picture lives in the solved image.
  const homeC = id % size;
  const homeR = Math.floor(id / size);
  const badge = Math.max(18, Math.min(24, tile * 0.3));

  return (
    <Animated.View style={[{ position: "absolute", width: tile, height: tile }, style]}>
      <PressableScale onPress={onPress} scaleTo={0.93} hapticFeedback={false}>
        <View
          style={{
            width: tile,
            height: tile,
            borderRadius: Math.min(14, tile * 0.18),
            overflow: "hidden",
          }}
        >
          <View style={{ position: "absolute", left: -homeC * cell, top: -homeR * cell }}>
            <PuzzleArt variant={variant} size={inner} />
          </View>
          {showNumber && (
            <View
              style={{ minWidth: badge, height: badge, borderRadius: badge / 2 }}
              className="absolute left-1 top-1 items-center justify-center bg-white/90 px-1"
            >
              <Text style={{ fontSize: badge * 0.48 }} className="font-body-black text-ink">
                {id + 1}
              </Text>
            </View>
          )}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * An N×N sliding picture board (N from the board's length). Tiles spring to
 * their cells; when `solved`, the whole picture fades in with the mascot alive.
 */
export default function SlidingBoard({ board, variant, boardSize, showNumbers, solved, onTap }) {
  const size = sizeOf(board);
  const inner = boardSize - 2 * PAD;
  const tile = (inner - GAP * (size - 1)) / size;
  const blank = blankOf(size);

  return (
    <Animated.View entering={ZoomIn.springify().damping(14)}>
      <View
        style={{
          width: boardSize,
          height: boardSize,
          padding: PAD,
          borderRadius: 26,
          backgroundColor: "rgba(255,255,255,0.6)",
          borderWidth: 2,
          borderColor: "#FFFFFF",
        }}
      >
        <View style={{ flex: 1 }}>
          {board.map((id, index) =>
            id === blank ? null : (
              <Tile
                key={id}
                id={id}
                index={index}
                size={size}
                tile={tile}
                variant={variant}
                inner={inner}
                showNumber={showNumbers && !solved}
                onPress={() => onTap(index)}
              />
            ),
          )}
          {solved && (
            <Animated.View
              entering={FadeIn.duration(500)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <PuzzleArt variant={variant} size={inner} animated mood="cheer" />
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
