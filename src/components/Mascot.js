import { useEffect, useId } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * The game's mascot cast: round, squishy blobs drawn in SVG with soft 3D
 * shading. Each one has its own colour and accessory.
 */
export const MASCOTS = {
  zip: { name: "Zip", base: "#FF9F1C", light: "#FFD27A", dark: "#E06C00" },
  bloop: { name: "Bloop", base: "#4D8CFF", light: "#9CC6FF", dark: "#2557D6" },
  gloop: { name: "Gloop", base: "#2BD67B", light: "#9AF5C0", dark: "#11A058" },
  pip: { name: "Pip", base: "#FF6FB1", light: "#FFB8D9", dark: "#D63F86" },
  sunny: { name: "Sunny", base: "#FFD43B", light: "#FFF08A", dark: "#E0A100" },
};

const W = 200;
const H = 220;
const EYE_Y = 112;

function Accessory({ variant, c }) {
  switch (variant) {
    case "zip": // sweatband with a lightning bolt
      return (
        <G>
          <Path d="M38 86 Q100 52 162 86 L158 100 Q100 68 42 100 Z" fill="#FF4D4D" />
          <Path d="M104 66 L92 86 L102 86 L96 100 L112 78 L102 78 L108 66 Z" fill="#FFF3B0" />
        </G>
      );
    case "bloop": // round specs, drawn over the eyes
      return null;
    case "gloop": // antenna with a glowing orb
      return (
        <G>
          <Path
            d="M100 54 Q96 34 108 20"
            stroke={c.dark}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={110} cy={18} r={13} fill="#FFF56B" />
          <Circle cx={106} cy={14} r={4} fill="#FFFFFF" opacity={0.9} />
        </G>
      );
    case "pip": // bow
      return (
        <G>
          <Path d="M100 58 L72 42 Q64 58 72 74 Z" fill="#FFE14D" />
          <Path d="M100 58 L128 42 Q136 58 128 74 Z" fill="#FFE14D" />
          <Circle cx={100} cy={58} r={9} fill="#FFC300" />
        </G>
      );
    case "sunny": // little sprout
      return (
        <G>
          <Path d="M100 56 L100 34" stroke="#1FA35B" strokeWidth={5} strokeLinecap="round" />
          <Path d="M100 38 Q80 18 70 36 Q86 46 100 38 Z" fill="#3DDC84" />
          <Path d="M100 34 Q118 12 132 28 Q116 42 100 34 Z" fill="#2BC46E" />
        </G>
      );
    default:
      return null;
  }
}

function Eyes({ variant, mood }) {
  const cool = mood === "cool";
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      {cool ? (
        <G>
          <Rect x={52} y={98} width={44} height={28} rx={12} fill="#141414" />
          <Rect x={104} y={98} width={44} height={28} rx={12} fill="#141414" />
          <Rect x={94} y={106} width={12} height={5} fill="#141414" />
          <Rect x={60} y={103} width={14} height={5} rx={2.5} fill="#FFFFFF" opacity={0.6} />
          <Rect x={112} y={103} width={14} height={5} rx={2.5} fill="#FFFFFF" opacity={0.6} />
        </G>
      ) : (
        <G>
          <Ellipse cx={78} cy={EYE_Y} rx={17} ry={20} fill="#FFFFFF" />
          <Ellipse cx={122} cy={EYE_Y} rx={17} ry={20} fill="#FFFFFF" />
          <Circle cx={82} cy={EYE_Y + 3} r={10} fill="#141414" />
          <Circle cx={118} cy={EYE_Y + 3} r={10} fill="#141414" />
          <Circle cx={86} cy={EYE_Y - 2} r={3.5} fill="#FFFFFF" />
          <Circle cx={122} cy={EYE_Y - 2} r={3.5} fill="#FFFFFF" />
          {variant === "bloop" && (
            <G>
              <Circle cx={78} cy={EYE_Y} r={25} stroke="#141414" strokeWidth={5} fill="none" />
              <Circle cx={122} cy={EYE_Y} r={25} stroke="#141414" strokeWidth={5} fill="none" />
              <Path d="M96 108 Q100 102 104 108" stroke="#141414" strokeWidth={5} fill="none" />
            </G>
          )}
        </G>
      )}
    </Svg>
  );
}

function Mouth({ mood }) {
  if (mood === "wow") {
    return <Ellipse cx={100} cy={152} rx={11} ry={13} fill="#5A1A1A" />;
  }
  if (mood === "cheer") {
    return (
      <G>
        <Path d="M76 144 Q100 178 124 144 Z" fill="#5A1A1A" />
        <Path d="M88 158 Q100 170 112 158 Q100 152 88 158 Z" fill="#FF6B81" />
      </G>
    );
  }
  return (
    <Path
      d="M84 146 Q100 162 116 146"
      stroke="#5A1A1A"
      strokeWidth={5}
      fill="none"
      strokeLinecap="round"
    />
  );
}

/**
 * @param {object} props
 * @param {keyof MASCOTS} props.variant
 * @param {number} props.size   width in px (height is 1.1×)
 * @param {"happy"|"cheer"|"wow"|"cool"} [props.mood]
 * @param {boolean} [props.animated]  idle bob + blink
 * @param {number} [props.delay]      offsets the idle loop so groups don't move in sync
 */
export default function Mascot({
  variant = "zip",
  size = 120,
  mood = "happy",
  animated = true,
  delay = 0,
}) {
  const c = MASCOTS[variant] ?? MASCOTS.zip;
  const bob = useSharedValue(0);
  const blink = useSharedValue(1);
  const armsUp = mood === "cheer";

  useEffect(() => {
    if (!animated) return;
    bob.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true),
      ),
    );
    blink.set(
      withDelay(
        delay + 800,
        withRepeat(
          withSequence(
            withDelay(2600 + (delay % 900), withTiming(0.1, { duration: 70 })),
            withTiming(1, { duration: 90 }),
          ),
          -1,
        ),
      ),
    );
  }, [animated, bob, blink, delay]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -size * 0.05 * bob.value },
      { scaleX: 1 + 0.025 * (1 - bob.value) },
      { scaleY: 1 - 0.025 * (1 - bob.value) },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - 0.18 * bob.value }],
    opacity: 0.22 - 0.08 * bob.value,
  }));
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  // Unique per drawing: on web, SVG ids are page-global, and a duplicate id
  // inside a hidden screen would make this gradient resolve to nothing.
  const gid = `g-${variant}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const height = size * (H / W);

  return (
    <View style={{ width: size, height }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: height * 0.015,
            left: size * 0.22,
            width: size * 0.56,
            height: size * 0.07,
            borderRadius: size,
            backgroundColor: "#1A1A40",
          },
          shadowStyle,
        ]}
      />
      <Animated.View style={[{ width: size, height }, bodyStyle]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <RadialGradient id={gid} cx="38%" cy="30%" r="75%">
              <Stop offset="0" stopColor={c.light} />
              <Stop offset="0.55" stopColor={c.base} />
              <Stop offset="1" stopColor={c.dark} />
            </RadialGradient>
          </Defs>
          {/* feet */}
          <Ellipse cx={74} cy={196} rx={22} ry={12} fill={c.dark} />
          <Ellipse cx={126} cy={196} rx={22} ry={12} fill={c.dark} />
          {/* arms */}
          {armsUp ? (
            // arms flung up and out to the sides, with little round hands
            <G>
              <Ellipse
                cx={20}
                cy={104}
                rx={12}
                ry={24}
                fill={c.base}
                rotation={-38}
                origin="20,104"
              />
              <Ellipse
                cx={180}
                cy={104}
                rx={12}
                ry={24}
                fill={c.base}
                rotation={38}
                origin="180,104"
              />
              <Circle cx={8} cy={86} r={11} fill={c.light} />
              <Circle cx={192} cy={86} r={11} fill={c.light} />
            </G>
          ) : (
            <G>
              <Ellipse
                cx={30}
                cy={140}
                rx={13}
                ry={22}
                fill={c.dark}
                rotation={20}
                origin="30,140"
              />
              <Ellipse
                cx={170}
                cy={140}
                rx={13}
                ry={22}
                fill={c.dark}
                rotation={-20}
                origin="170,140"
              />
            </G>
          )}
          {/* body */}
          <Path
            d="M100 50 C150 50 176 88 176 128 C176 170 144 196 100 196 C56 196 24 170 24 128 C24 88 50 50 100 50 Z"
            fill={`url(#${gid})`}
          />
          {/* gloss */}
          <Ellipse
            cx={70}
            cy={80}
            rx={20}
            ry={11}
            fill="#FFFFFF"
            opacity={0.5}
            rotation={-25}
            origin="70,80"
          />
          {/* cheeks */}
          <Ellipse cx={56} cy={140} rx={12} ry={7} fill="#FF5C8A" opacity={0.35} />
          <Ellipse cx={144} cy={140} rx={12} ry={7} fill="#FF5C8A" opacity={0.35} />
          <Mouth mood={mood} />
          <Accessory variant={variant} c={c} />
        </Svg>
        <Animated.View
          style={[
            { position: "absolute", top: 0, left: 0, width: size, height },
            { transformOrigin: `50% ${(EYE_Y / H) * 100}%` },
            eyeStyle,
          ]}
        >
          <Eyes variant={variant} mood={mood} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
