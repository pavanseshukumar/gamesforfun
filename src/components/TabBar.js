import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ARCADE } from "../games/registry";
import { haptic } from "../lib/haptics";
import { sfx } from "../lib/sound";
import { INK } from "../theme";

const TABS = {
  index: { icon: "home", label: "Home" },
  profile: { icon: "person", label: "Profile" },
  awards: { icon: "trophy", label: "Trophies" },
  settings: { icon: "settings-sharp", label: "Settings" },
};

const BAR_H = 64;
const GAP = 12;
const MUTED = "#A4A3AE";
const SURFACE = "#F6F6F8";
// Every tab-bar motion uses one smooth ease-in-out: no springs, no overshoot.
const EASE = Easing.inOut(Easing.cubic);
const FADE = { duration: 260, easing: EASE };

/** Soft, raised surface shared by the pill and the round button. */
const surface = {
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.95)",
  shadowColor: "#1A1A40",
  shadowOpacity: 0.14,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
};

/** One icon tab: the grey icon fades into a dark one when its screen is open. */
function Tab({ name, focused, onPress }) {
  const on = useSharedValue(focused ? 1 : 0);
  const pop = useSharedValue(1);
  useEffect(() => {
    on.set(withTiming(focused ? 1 : 0, FADE));
    if (focused) {
      pop.set(
        withSequence(
          withTiming(0.85, { duration: 130, easing: EASE }),
          withTiming(1, { duration: 220, easing: EASE }),
        ),
      );
    }
  }, [focused, on, pop]);
  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const darkStyle = useAnimatedStyle(() => ({ opacity: on.value }));
  const greyStyle = useAnimatedStyle(() => ({ opacity: 1 - on.value }));
  const t = TABS[name];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={t.label}
      accessibilityState={{ selected: focused }}
      hitSlop={6}
      style={{ flex: 1, height: BAR_H, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={[{ width: 28, height: 28 }, wrapStyle]}>
        <Animated.View style={[{ position: "absolute" }, greyStyle]}>
          <Ionicons name={t.icon} size={26} color={MUTED} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute" }, darkStyle]}>
          <Ionicons name={t.icon} size={26} color={INK} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** The round button beside the bar: jumps into a random game. */
function PlayButton() {
  const scale = useSharedValue(1);
  const spin = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${spin.value}deg` }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quick play a random game"
      onPressIn={() => scale.set(withTiming(0.9, { duration: 120, easing: EASE }))}
      onPressOut={() => scale.set(withTiming(1, { duration: 180, easing: EASE }))}
      onPress={() => {
        haptic.medium();
        sfx("whoosh");
        spin.set(withTiming(spin.get() + 180, { duration: 420, easing: EASE }));
        const game = ARCADE[Math.floor(Math.random() * ARCADE.length)];
        setTimeout(() => router.push(game.route), 240);
      }}
    >
      <View
        style={[
          surface,
          {
            width: BAR_H,
            height: BAR_H,
            borderRadius: BAR_H / 2,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Animated.View style={style}>
          <Ionicons name="shuffle" size={28} color={INK} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

/**
 * Floating tab bar: a soft pill of four icon tabs, with a round Play button
 * beside it. The open tab's icon turns dark; the others stay grey.
 */
export default function TabBar({ state, emitter, navigateToTab }) {
  const insets = useSafeAreaInsets();

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

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: Math.max(insets.bottom, 10) + 8,
        flexDirection: "row",
        alignItems: "center",
        gap: GAP,
      }}
    >
      <View
        style={[
          surface,
          {
            flex: 1,
            height: BAR_H,
            borderRadius: BAR_H / 2,
            flexDirection: "row",
            paddingHorizontal: 10,
          },
        ]}
      >
        {state.routes.map((route, i) => (
          <Tab
            key={route.key}
            name={route.name}
            focused={state.index === i}
            onPress={() => go(route, i)}
          />
        ))}
      </View>
      <PlayButton />
    </View>
  );
}
