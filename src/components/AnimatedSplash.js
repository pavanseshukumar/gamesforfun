import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { BACKDROPS, display } from "../theme";
import Mascot from "./Mascot";

/** How long the opening plays before the app may take over. */
export const SPLASH_MS = 2600;
const EXIT_MS = 420;

const CREW = [
  { variant: "bloop", size: 64, mood: "happy" },
  { variant: "pip", size: 70, mood: "happy" },
  { variant: "zip", size: 98, mood: "cheer" },
  { variant: "gloop", size: 70, mood: "wow" },
  { variant: "sunny", size: 64, mood: "happy" },
];
const LETTERS = [
  { ch: "P", colour: "#FF4FA0" },
  { ch: "L", colour: "#FF8A1F" },
  { ch: "A", colour: "#F5B800" },
  { ch: "Y", colour: "#1FB865" },
  { ch: "Z", colour: "#2F6FF0" },
  { ch: "O", colour: "#8A4DF0" },
];
const CONFETTI = ["#FF4FA0", "#FFD43B", "#1FB865", "#FFFFFF", "#8A4DF0", "#FF8A1F"];

/** Slowly turning sunburst behind everything. */
function Rays({ size }) {
  const spin = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.set(withTiming(1, { duration: 500 }));
    spin.set(withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1));
  }, [fade, spin]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ rotate: `${spin.value}deg` }],
  }));
  const r = size / 2;
  const wedges = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const b = a + Math.PI / 14;
    return `M${r} ${r} L${r + r * Math.cos(a)} ${r + r * Math.sin(a)} L${r + r * Math.cos(b)} ${r + r * Math.sin(b)} Z`;
  }).join(" ");
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Path d={wedges} fill="#FFFFFF" opacity={0.13} />
      </Svg>
    </Animated.View>
  );
}

/** A confetti dot drifting upward forever. */
function Dot({ x, y, colour, size, delay, h }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(delay, withRepeat(withTiming(1, { duration: 5200, easing: Easing.linear }), -1)),
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.sin(t.value * Math.PI) * 0.9,
    transform: [{ translateY: -t.value * h * 0.35 }, { rotate: `${t.value * 300}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size * 0.6,
          borderRadius: 3,
          backgroundColor: colour,
        },
        style,
      ]}
    />
  );
}

/** A mascot that drops in, squashes on landing, then hops in the wave. */
function DropIn({ variant, size, mood, delay, hopDelay }) {
  const drop = useSharedValue(-520);
  const hop = useSharedValue(0);
  const squash = useSharedValue(1);
  useEffect(() => {
    drop.set(withDelay(delay, withSpring(0, { damping: 11, stiffness: 150, mass: 0.9 })));
    squash.set(
      withDelay(
        delay + 330,
        withSequence(
          withTiming(0.78, { duration: 90 }),
          withSpring(1, { damping: 6, stiffness: 260 }),
        ),
      ),
    );
    hop.set(
      withDelay(
        hopDelay,
        withSequence(
          withTiming(-26, { duration: 150, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 7, stiffness: 240 }),
        ),
      ),
    );
  }, [drop, hop, squash, delay, hopDelay]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: drop.value + hop.value },
      { scaleY: squash.value },
      { scaleX: 2 - squash.value },
    ],
  }));
  return (
    <Animated.View style={[{ marginHorizontal: -5, transformOrigin: "50% 100%" }, style]}>
      <Mascot variant={variant} size={size} mood={mood} animated={false} />
    </Animated.View>
  );
}

/** One candy letter of the wordmark: pops in with a twist, sitting on a 3D shadow. */
function Letter({ ch, colour, delay, size }) {
  const pop = useSharedValue(0);
  useEffect(() => {
    // A timed pop with one overshoot ("back" easing) lands exactly on time, unlike a
    // loose spring that keeps wobbling while the splash is already leaving.
    pop.set(
      withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.back(2.2)) })),
    );
  }, [pop, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, pop.value * 2)),
    transform: [
      { translateY: (1 - pop.value) * 40 },
      { scale: 0.3 + pop.value * 0.7 },
      { rotate: `${(1 - pop.value) * -30}deg` },
    ],
  }));
  const font = [display(size), { lineHeight: size * 1.08 }];
  return (
    <Animated.View style={[{ marginHorizontal: 1 }, style]}>
      <Text style={[font, { color: "#1B2A6B", position: "absolute", top: size * 0.07 }]}>{ch}</Text>
      <Text style={[font, { color: colour }]}>{ch}</Text>
    </Animated.View>
  );
}

/** A four-point sparkle that twinkles near the logo. */
function Sparkle({ x, y, size, delay }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(withTiming(1, { duration: 260 }), withTiming(0.2, { duration: 420 })),
          -1,
          true,
        ),
      ),
    );
  }, [s, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: s.value,
    transform: [{ scale: s.value }, { rotate: `${s.value * 45}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x, top: y }, style]}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path
          d="M10 0 Q11.5 8.5 20 10 Q11.5 11.5 10 20 Q8.5 11.5 0 10 Q8.5 8.5 10 0 Z"
          fill="#FFFFFF"
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * Branded opening shown over the app while it starts. It picks up from the
 * native splash (same blue) and plays a short sequence: sunburst and confetti,
 * the crew dropping in, the PLAYZO letters popping up, a celebration hop, then
 * a zoom-and-fade into the app once `done` is set.
 */
export default function AnimatedSplash({ done }) {
  const { width, height } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const bar = useSharedValue(0);
  const tag = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    bar.set(withTiming(1, { duration: SPLASH_MS - 250, easing: Easing.inOut(Easing.cubic) }));
    tag.set(withDelay(1350, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })));
  }, [bar, tag]);

  useEffect(() => {
    if (!done) return undefined;
    exit.set(withTiming(1, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) }));
    const id = setTimeout(() => setGone(true), EXIT_MS + 30);
    return () => clearTimeout(id);
  }, [done, exit]);

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: 1 + exit.value * 0.14 }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tag.value,
    transform: [{ translateY: (1 - tag.value) * 14 }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  if (gone) return null;

  const letterSize = Math.min(86, width * 0.2);
  const raySize = Math.max(width, height) * 1.6;
  const confetti = Array.from({ length: 16 }, (_, i) => ({
    x: (((i * 61) % 100) / 100) * width,
    y: height * (0.45 + ((i * 37) % 50) / 100),
    colour: CONFETTI[i % CONFETTI.length],
    size: 8 + (i % 3) * 3,
    delay: (i * 260) % 2600,
  }));

  return (
    <Animated.View
      pointerEvents={done ? "none" : "auto"}
      style={[StyleSheet.absoluteFill, { zIndex: 50 }, sceneStyle]}
    >
      <LinearGradient
        colors={BACKDROPS.welcome}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}
      >
        <Rays size={raySize} />
      </View>
      {confetti.map((c, i) => (
        <Dot key={i} {...c} h={height} />
      ))}

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          {CREW.map((m, i) => (
            <DropIn
              key={m.variant}
              {...m}
              // Outside-in: the edges land first and Zip drops last, in the middle.
              delay={150 + [0, 2, 4, 3, 1][i] * 110}
              hopDelay={1250 + i * 80}
            />
          ))}
        </View>

        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: "row" }}>
            {LETTERS.map((l, i) => (
              <Letter key={l.ch} {...l} size={letterSize} delay={650 + i * 75} />
            ))}
          </View>
          <Sparkle x={-18} y={-6} size={20} delay={1150} />
          <Sparkle x={letterSize * 5.1} y={-14} size={26} delay={1300} />
          <Sparkle x={letterSize * 4.6} y={letterSize * 0.9} size={16} delay={1450} />
        </View>

        <Animated.View style={[{ marginTop: 10 }, tagStyle]}>
          <Text className="text-center font-body-black text-base text-ink">
            Bite-size games, big fun
          </Text>
        </Animated.View>

        <View
          style={{
            marginTop: 28,
            width: 170,
            height: 10,
            borderRadius: 5,
            backgroundColor: "rgba(255,255,255,0.45)",
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={[{ height: "100%", borderRadius: 5, overflow: "hidden" }, barStyle]}
          >
            <LinearGradient
              colors={["#FF4FA0", "#F5B800", "#1FB865", "#2F6FF0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: 170, height: "100%" }}
            />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}
