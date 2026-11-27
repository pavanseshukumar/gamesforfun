import { useEffect } from "react";
import { Text, View } from "react-native";
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { blankOf, sizeOf } from "../games/sliding";
import PuzzleArt from "./PuzzleArt";

const GAP = 6;
const PAD = 8;
const TILE_SPRING = { damping: 18, stiffness: 260, mass: 0.6 };

/**
 * One picture tile. Tap it, or drag it toward the gap: it follows the finger
 * along that one direction (never past the gap), and slides in once dragged
 * about a third of the way or flicked; otherwise it springs back.
 * `dx`/`dy` point toward the gap when this tile is next to it (else both 0).
 */
function Tile({ id, index, size, tile, variant, inner, showNumber, onMove, dx, dy }) {
  const cell = tile + GAP;
  const x = useSharedValue((index % size) * cell);
  const y = useSharedValue(Math.floor(index / size) * cell);
  const drag = useSharedValue(0); // how far the finger has pulled it toward the gap
  const press = useSharedValue(1);

  useEffect(() => {
    x.set(withSpring((index % size) * cell, TILE_SPRING));
    y.set(withSpring(Math.floor(index / size) * cell, TILE_SPRING));
  }, [index, size, cell, x, y]);

  const movable = dx !== 0 || dy !== 0;

  const pan = usePanGesture({
    minDistance: 6,
    onBegin: () => {
      "worklet";
      press.set(withTiming(0.95, { duration: 80 }));
    },
    onUpdate: (e) => {
      "worklet";
      if (!movable) return;
      const along = e.translationX * dx + e.translationY * dy;
      drag.set(Math.max(0, Math.min(cell, along)));
    },
    onDeactivate: (e) => {
      "worklet";
      if (!movable) return;
      const speed = e.velocityX * dx + e.velocityY * dy;
      if (drag.value > cell * 0.35 || (speed > 450 && drag.value > 4)) {
        // Keep the tile where the finger left it; the board update springs it home.
        x.set(x.value + drag.value * dx);
        y.set(y.value + drag.value * dy);
        drag.set(0);
        scheduleOnRN(onMove);
      } else {
        drag.set(withSpring(0, TILE_SPRING));
      }
    },
    onFinalize: () => {
      "worklet";
      press.set(withSpring(1, TILE_SPRING));
    },
  });
  const tap = useTapGesture({
    onBegin: () => {
      "worklet";
      press.set(withTiming(0.93, { duration: 70 }));
    },
    onActivate: () => {
      "worklet";
      scheduleOnRN(onMove);
    },
    onFinalize: () => {
      "worklet";
      press.set(withSpring(1, TILE_SPRING));
    },
  });
  // A drag wins over a tap, so sliding never also counts as a tap.
  const gesture = useExclusiveGestures(pan, tap);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + drag.value * dx },
      { translateY: y.value + drag.value * dy },
      { scale: press.value },
    ],
  }));

  // Where this piece of the picture lives in the solved image.
  const homeC = id % size;
  const homeR = Math.floor(id / size);
  const badge = Math.max(18, Math.min(24, tile * 0.3));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={`Tile ${id + 1}`}
        style={[{ position: "absolute", width: tile, height: tile }, style]}
      >
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
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * An N×N sliding picture board (N from the board's length). Tap a tile or drag
 * it into the gap; tiles spring to their cells; when `solved`, the whole picture
 * fades in with the mascot alive.
 */
export default function SlidingBoard({ board, variant, boardSize, showNumbers, solved, onTap }) {
  const size = sizeOf(board);
  const inner = boardSize - 2 * PAD;
  const tile = (inner - GAP * (size - 1)) / size;
  const blank = blankOf(size);
  const gapAt = board.indexOf(blank);
  const gapX = gapAt % size;
  const gapY = Math.floor(gapAt / size);

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
          {board.map((id, index) => {
            if (id === blank) return null;
            // Tiles touching the gap can be dragged toward it (not once solved).
            const tx = index % size;
            const ty = Math.floor(index / size);
            const nextToGap = !solved && Math.abs(tx - gapX) + Math.abs(ty - gapY) === 1;
            return (
              <Tile
                key={id}
                id={id}
                index={index}
                size={size}
                tile={tile}
                variant={variant}
                inner={inner}
                showNumber={showNumbers && !solved}
                onMove={() => onTap(index)}
                dx={nextToGap ? gapX - tx : 0}
                dy={nextToGap ? gapY - ty : 0}
              />
            );
          })}
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
