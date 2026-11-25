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
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ARCADE } from "../games/registry";
import { haptic } from "../lib/haptics";
import { sfx } from "../lib/sound";
import { cardShadow, INK } from "../theme";
import Mascot from "./Mascot";

/** Each tab wears its screen's colour. */
const TABS = {
  index: { on: "home", off: "home-outline", label: "Home", color: "#FF4FA0" },
  profile: { on: "person", off: "person-outline", label: "Profile", color: "#3F86FF" },
  awards: { on: "trophy", off: "trophy-outline", label: "Trophies", color: "#1FB865" },
  settings: { on: "options", off: "options-outline", label: "Settings", color: "#8A5CFF" },
};
const ORDER = ["index", "profile", "awards", "settings"];
const COLORS = ORDER.map((k) => TABS[k].color);

const BAR_H = 66;
const PAD = 8;
const CENTER = 84; // gap left for the raised Play bubble
const BLOB_W = 50;
const BLOB_H = 32;
const EDGE = 8; // closest the blob may get to the bar's rounded ends
const MUTED = "#9A97AE";
// Every tab-bar motion uses one smooth ease-in-out: no springs, no overshoot.
const EASE = Easing.inOut(Easing.cubic);
const SLIDE = { duration: 380, easing: EASE };

function Tab({ name, focused, onPress, width }) {
  const pop = useSharedValue(1);
  useEffect(() => {
    if (focused) {
      pop.set(
        withSequence(
          withTiming(0.86, { duration: 140, easing: EASE }),
          withTiming(1, { duration: 220, easing: EASE }),
        ),
      );
    }
  }, [focused, pop]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const t = TABS[name];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={t.label}
      accessibilityState={{ selected: focused }}
      style={{ width, height: BAR_H, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={[
          { width: BLOB_W, height: BLOB_H, alignItems: "center", justifyContent: "center" },
          iconStyle,
        ]}
      >
        <Ionicons name={focused ? t.on : t.off} size={21} color={focused ? "#FFFFFF" : MUTED} />
      </Animated.View>
      <Text
        style={{
          marginTop: 2,
          fontFamily: focused ? "Outfit_800ExtraBold" : "Outfit_600SemiBold",
          fontSize: 11,
          color: focused ? t.color : MUTED,
        }}
      >
        {t.label}
      </Text>
    </Pressable>
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
      onPressIn={() => scale.set(withTiming(0.9, { duration: 120, easing: EASE }))}
      onPressOut={() => scale.set(withTiming(1, { duration: 180, easing: EASE }))}
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
 * Floating candy tab bar: four labelled tabs around a raised Play bubble. A
 * coloured blob glides (ease-in-out) to the active tab and takes on that screen's colour.
 */
export default function TabBar({ state, emitter, navigateToTab }) {
  const insets = useSafeAreaInsets();
  const [barW, setBarW] = useState(0);
  const pos = useSharedValue(state.index);

  useEffect(() => {
    pos.set(withTiming(state.index, SLIDE));
  }, [state.index, pos]);

  const tabW = barW ? (barW - PAD * 2 - CENTER) / 4 : 0;
  // Centre x of each tab's icon, with the Play gap between tabs 2 and 3.
  const centres = [0, 1, 2, 3].map((i) => PAD + tabW * (i + 0.5) + (i >= 2 ? CENTER : 0));

  const blobStyle = useAnimatedStyle(() => {
    const p = pos.value;
    const i = Math.min(2, Math.max(0, Math.floor(p)));
    const raw = centres[i] + (centres[i + 1] - centres[i]) * (p - i);
    // Stretch a little while travelling, like jelly.
    const travel = Math.abs(p - Math.round(p));
    const scaleX = 1 + travel * 0.5;
    // The ease never overshoots, so this limit only guards the bar's rounded ends.
    const half = (BLOB_W / 2) * scaleX;
    const x = Math.min(barW - EDGE - half, Math.max(EDGE + half, raw));
    return {
      backgroundColor: interpolateColor(p, [0, 1, 2, 3], COLORS),
      transform: [{ translateX: x - BLOB_W / 2 }, { scaleX }],
    };
  });

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
        width={tabW}
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
            borderRadius: 30,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "rgba(138,92,255,0.12)",
          },
          cardShadow,
        ]}
      >
        {barW > 0 && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  top: (BAR_H - 16 - BLOB_H) / 2,
                  left: 0,
                  width: BLOB_W,
                  height: BLOB_H,
                  borderRadius: BLOB_H / 2,
                },
                blobStyle,
              ]}
            />
            <View style={{ flexDirection: "row", paddingHorizontal: PAD }}>
              {tab(0)}
              {tab(1)}
              <View style={{ width: CENTER }} />
              {tab(2)}
              {tab(3)}
            </View>
          </>
        )}
      </View>
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: -26, left: 0, right: 0, alignItems: "center" }}
      >
        <PlayBubble />
      </View>
    </View>
  );
}
