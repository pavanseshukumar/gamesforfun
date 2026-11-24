import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ARCADE } from "../games/registry";
import { haptic } from "../lib/haptics";
import { BOUNCY, SPRING } from "../lib/motion";
import { cardShadow, INK } from "../theme";

const ICONS = {
  index: ["home", "home-outline", "Home"],
  profile: ["person", "person-outline", "Profile"],
  awards: ["trophy", "trophy-outline", "Trophies"],
  settings: ["options", "options-outline", "Settings"],
};

const SIZE = 46;

function TabIcon({ name, focused, onPress }) {
  const active = useSharedValue(focused ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    active.set(withTiming(focused ? 1 : 0, { duration: 220 }));
    if (focused) pop.set(withSequence(withTiming(0.85, { duration: 80 }), withSpring(1, BOUNCY)));
  }, [focused, active, pop]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(active.value, [0, 1], ["rgba(20,20,20,0)", INK]),
    transform: [{ scale: pop.value }],
  }));

  const [on, off, label] = ICONS[name];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View
        style={[
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        <Ionicons name={focused ? on : off} size={20} color={focused ? "#FFFFFF" : INK} />
      </Animated.View>
    </Pressable>
  );
}

function Group({ children }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        padding: 3,
        borderRadius: 99,
        borderWidth: 1.5,
        borderColor: INK,
      }}
    >
      {children}
    </View>
  );
}

/** Centre button: jumps straight into a random game. */
function QuickPlay() {
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
        spin.set(withTiming(spin.get() + 360, { duration: 450 }));
        const game = ARCADE[Math.floor(Math.random() * ARCADE.length)];
        setTimeout(() => router.push(game.route), 260);
      }}
    >
      <Animated.View
        style={[
          {
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: INK,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        <Ionicons name="game-controller" size={26} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

/** Floating pill tab bar: two tab groups around a black quick-play button. */
export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const go = (route, index) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) {
      haptic.select();
      navigation.navigate(route.name);
    }
  };
  const tab = (i) => {
    const route = state.routes[i];
    return (
      <TabIcon
        key={route.key}
        name={route.name}
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
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, 12) + 4,
        alignItems: "center",
      }}
    >
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 8,
            borderRadius: 99,
            backgroundColor: "#FFFFFF",
          },
          cardShadow,
        ]}
      >
        <Group>
          {tab(0)}
          {tab(1)}
        </Group>
        <QuickPlay />
        <Group>
          {tab(2)}
          {tab(3)}
        </Group>
      </View>
    </View>
  );
}
