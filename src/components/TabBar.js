import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ARCADE } from "../games/registry";
import { haptic } from "../lib/haptics";
import { sfx } from "../lib/sound";
import { SPRING } from "../lib/motion";
import { cardShadow, INK } from "../theme";
import Mascot from "./Mascot";

/** Each tab wears its screen's colour. */
const TABS = {
  index: { on: "home", off: "home-outline", label: "Home", color: "#FF4FA0" },
  profile: { on: "person", off: "person-outline", label: "Profile", color: "#3F86FF" },
  awards: { on: "trophy", off: "trophy-outline", label: "Trophies", color: "#1FB865" },
  settings: { on: "options", off: "options-outline", label: "Settings", color: "#8A5CFF" },
};

const BAR_H = 64;
const PAD = 8;
const CENTER = 78; // gap left for the raised Play bubble
const ICON_W = 44; // an inactive tab: just its icon
const PILL_H = 52;
const MUTED = "#9A97AE";
// One smooth glide for everything: no overshoot, so nothing ever pokes out of the bar.
const GLIDE = { duration: 320, easing: Easing.out(Easing.cubic) };

/**
 * One tab. Inactive it's a grey icon; active it grows into a pill in its
 * screen's colour with the label under the icon. Width, colour and label all
 * glide together; the label's height grows from 0 so the icon stays centred.
 */
function Tab({ name, focused, onPress, width }) {
  const t = TABS[name];
  const on = useSharedValue(focused ? 1 : 0);
  const w = useSharedValue(width);
  const [labelW, setLabelW] = useState(0);

  useEffect(() => {
    on.set(withTiming(focused ? 1 : 0, GLIDE));
  }, [focused, on]);
  useEffect(() => {
    w.set(withTiming(width, GLIDE));
  }, [width, w]);

  // Show the label only if it fits across the pill (it always does on phones).
  const showLabel = labelW > 0 && labelW + 14 <= width - 6;

  const boxStyle = useAnimatedStyle(() => ({ width: w.value }));
  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], ["rgba(255,255,255,0)", t.color]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    height: showLabel ? on.value * 15 : 0,
    opacity: showLabel ? on.value : 0,
  }));

  return (
    <Animated.View style={[{ height: BAR_H, justifyContent: "center" }, boxStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: focused }}
        style={{ height: PILL_H, marginHorizontal: 3 }}
      >
        <Animated.View
          style={[
            {
              flex: 1,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            },
            pillStyle,
          ]}
        >
          <Ionicons name={focused ? t.on : t.off} size={22} color={focused ? "#FFFFFF" : MUTED} />
          <Animated.View style={[{ overflow: "hidden", alignItems: "center" }, labelStyle]}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: "Outfit_800ExtraBold", fontSize: 11, color: "#FFFFFF" }}
            >
              {t.label}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
      {/* Invisible copy that measures the label's natural width once. */}
      <Text
        onLayout={(e) => setLabelW(Math.ceil(e.nativeEvent.layout.width))}
        style={{
          position: "absolute",
          opacity: 0,
          fontFamily: "Outfit_800ExtraBold",
          fontSize: 11,
        }}
        pointerEvents="none"
        accessible={false}
      >
        {t.label}
      </Text>
    </Animated.View>
  );
}

/** Raised centre bubble: Zip bounces in it; tapping jumps into a random game. */
function PlayBubble() {
  const spin = useSharedValue(0);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${spin.value}deg` }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quick play a random game"
      onPressIn={() => scale.set(withSpring(0.88, SPRING))}
      onPressOut={() => scale.set(withSpring(1, SPRING))}
      onPress={() => {
        haptic.medium();
        sfx("whoosh");
        spin.set(withTiming(spin.get() + 360, { duration: 450 }));
        const game = ARCADE[Math.floor(Math.random() * ARCADE.length)];
        setTimeout(() => router.push(game.route), 260);
      }}
      style={{ alignItems: "center" }}
    >
      <Animated.View
        style={[
          {
            width: 70,
            height: 70,
            borderRadius: 35,
            borderWidth: 4,
            borderColor: "#FFFFFF",
            overflow: "hidden",
          },
          cardShadow,
          style,
        ]}
      >
        <LinearGradient
          colors={["#FF8CC6", "#C9A8FF", "#8FCBFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}
        >
          <View style={{ marginBottom: -4 }}>
            <Mascot variant="zip" size={52} mood="cheer" />
          </View>
        </LinearGradient>
      </Animated.View>
      <Text style={{ marginTop: 3, fontFamily: "Outfit_800ExtraBold", fontSize: 11, color: INK }}>
        Play
      </Text>
    </Pressable>
  );
}

/**
 * Floating candy tab bar: four tabs around a raised Play bubble. The active tab
 * expands into a pill in its screen's colour with its label; the others shrink
 * to icons. Each side of the Play bubble shares its half of the bar.
 */
export default function TabBar({ state, emitter, navigateToTab }) {
  const insets = useSafeAreaInsets();
  const [barW, setBarW] = useState(0);

  const side = barW ? (barW - PAD * 2 - CENTER) / 2 : 0;
  const widthOf = (i) => {
    const partner = i ^ 1; // 0↔1 on the left, 2↔3 on the right
    if (state.index === i) return side - ICON_W;
    if (state.index === partner) return ICON_W;
    return side / 2;
  };

  const go = (route, index) => {
    // Expo Router 58 hands custom tab bars an `emitter` and `navigateToTab`
    // (not a `navigation` object), mirroring its built-in BottomTabBar.
    const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) {
      haptic.select();
      sfx("select");
      navigateToTab(route.key);
    }
  };

  const tab = (i) => {
    const route = state.routes[i];
    return (
      <Tab
        key={route.key}
        name={route.name}
        width={widthOf(i)}
        focused={state.index === i}
        onPress={() => go(route, i)}
      />
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 10) + 6,
      }}
    >
      <View
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
        style={[
          {
            height: BAR_H,
            borderRadius: BAR_H / 2,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "rgba(138,92,255,0.12)",
          },
          cardShadow,
        ]}
      >
        {barW > 0 && (
          <View style={{ flexDirection: "row", paddingHorizontal: PAD }}>
            {tab(0)}
            {tab(1)}
            <View style={{ width: CENTER }} />
            {tab(2)}
            {tab(3)}
          </View>
        )}
      </View>
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: -28, left: 0, right: 0, alignItems: "center" }}
      >
        <PlayBubble />
      </View>
    </View>
  );
}
