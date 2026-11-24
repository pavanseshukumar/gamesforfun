import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Platform, Switch, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import PressableScale from "../components/PressableScale";
import Screen from "../components/Screen";
import { haptic } from "../lib/haptics";
import { useGameStore } from "../store/useGameStore";

function confirm(title, message, onYes) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Reset", style: "destructive", onPress: onYes },
  ]);
}

function Row({ icon, title, subtitle, right, index }) {
  return (
    <Animated.View entering={FadeInDown.delay(80 * index).springify()}>
      <View className="flex-row items-center rounded-3xl border border-white/10 bg-white/5 p-4">
        <View className="mr-4 h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-white">{title}</Text>
          {subtitle ? <Text className="mt-0.5 text-xs text-mist">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </Animated.View>
  );
}

export default function Settings() {
  const haptics = useGameStore((s) => s.haptics);
  const setHaptics = useGameStore((s) => s.setHaptics);
  const resetStats = useGameStore((s) => s.resetStats);

  return (
    <Screen>
      <View className="flex-1 p-4">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-3xl font-black text-white">Settings</Text>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Close">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="close" size={22} color="#fff" />
            </View>
          </PressableScale>
        </View>

        <View className="gap-3">
          <Row
            index={0}
            icon="phone-portrait-outline"
            title="Haptics"
            subtitle={Platform.OS === "web" ? "Only on phones" : "Feel taps, hits and wins"}
            right={
              <Switch
                value={haptics}
                onValueChange={(v) => {
                  setHaptics(v);
                  if (v) haptic.medium();
                }}
                trackColor={{ true: "#22C9A8", false: "#2A2752" }}
                thumbColor="#fff"
              />
            }
          />
          <PressableScale
            scaleTo={0.97}
            onPress={() =>
              confirm("Reset all stats?", "Best scores and play counts will be erased.", () => {
                resetStats();
                haptic.success();
              })
            }
          >
            <Row
              index={1}
              icon="refresh"
              title="Reset stats"
              subtitle="Clear every best score and play count"
              right={<Ionicons name="chevron-forward" size={18} color="#A9A6D6" />}
            />
          </PressableScale>
        </View>

        <Text className="mt-auto text-center text-xs text-mist-500">Games for Fun · v1.0.0</Text>
      </View>
    </Screen>
  );
}
