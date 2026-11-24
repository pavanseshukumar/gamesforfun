import { Ionicons } from "@expo/vector-icons";
import { Alert, Platform, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import GradientScreen from "../../components/GradientScreen";
import Mascot, { MASCOTS } from "../../components/Mascot";
import PressableScale from "../../components/PressableScale";
import { haptic } from "../../lib/haptics";
import useFocusKey from "../../lib/useFocusKey";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display, INK } from "../../theme";

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

function Section({ title, children, delay }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ marginTop: 18 }}>
      <Text className="mb-2 ml-1 font-body-bold text-xs uppercase tracking-[2px] text-ink-soft">
        {title}
      </Text>
      <View style={cardShadow} className="rounded-[28px] bg-white p-4">
        {children}
      </View>
    </Animated.View>
  );
}

export default function Settings() {
  const focusKey = useFocusKey();
  const name = useGameStore((s) => s.name);
  const avatar = useGameStore((s) => s.avatar);
  const haptics = useGameStore((s) => s.haptics);
  const setName = useGameStore((s) => s.setName);
  const setAvatar = useGameStore((s) => s.setAvatar);
  const setHaptics = useGameStore((s) => s.setHaptics);
  const resetStats = useGameStore((s) => s.resetStats);

  return (
    <GradientScreen theme="settings">
      <ScrollView
        key={focusKey}
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(350)}>
          <Text style={display(64)}>Settings</Text>
        </Animated.View>

        <Section title="Your name" delay={80}>
          <View className="flex-row items-center rounded-2xl bg-[#F3F1FA] px-4">
            <Ionicons name="person-outline" size={18} color={INK} />
            <TextInput
              value={name}
              onChangeText={(t) => setName(t.slice(0, 14))}
              placeholder="Player"
              placeholderTextColor="#9A98A8"
              maxLength={14}
              autoCorrect={false}
              className="ml-3 flex-1 py-3.5 font-body-bold text-base text-ink"
            />
          </View>
        </Section>

        <Section title="Pick your buddy" delay={160}>
          <View className="flex-row justify-between">
            {Object.entries(MASCOTS).map(([key, m]) => {
              const selected = key === avatar;
              return (
                <PressableScale
                  key={key}
                  onPress={() => setAvatar(key)}
                  accessibilityLabel={`Choose ${m.name}`}
                  accessibilityState={{ selected }}
                >
                  <View className="items-center">
                    <View
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 29,
                        borderWidth: 3,
                        borderColor: selected ? INK : "transparent",
                        backgroundColor: selected ? "#F3F1FA" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Mascot
                        variant={key}
                        size={44}
                        animated={selected}
                        mood={selected ? "cheer" : "happy"}
                      />
                    </View>
                    <Text
                      className={`mt-1 text-xs ${selected ? "font-body-black text-ink" : "font-body text-ink-mute"}`}
                    >
                      {m.name}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </Section>

        <Section title="Feel" delay={240}>
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F3F1FA]">
              <Ionicons name="phone-portrait-outline" size={20} color={INK} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-body-bold text-base text-ink">Haptics</Text>
              <Text className="font-body text-xs text-ink-mute">
                {Platform.OS === "web" ? "Works on phones" : "Feel taps, hits and wins"}
              </Text>
            </View>
            <Switch
              value={haptics}
              onValueChange={(v) => {
                setHaptics(v);
                if (v) haptic.medium();
              }}
              trackColor={{ true: INK, false: "#D9D6E5" }}
              thumbColor="#fff"
              activeThumbColor="#fff"
            />
          </View>
        </Section>

        <Section title="Danger zone" delay={320}>
          <PressableScale
            scaleTo={0.97}
            onPress={() =>
              confirm(
                "Reset all progress?",
                "Best scores, XP, streaks and trophies will be erased.",
                () => {
                  resetStats();
                  haptic.success();
                },
              )
            }
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#FFE4E4]">
                <Ionicons name="refresh" size={20} color="#E5484D" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-body-bold text-base text-[#E5484D]">Reset progress</Text>
                <Text className="font-body text-xs text-ink-mute">Start fresh from level 1</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9A98A8" />
            </View>
          </PressableScale>
        </Section>

        <Text className="mt-8 text-center font-body text-xs text-ink-mute">
          Games for Fun · v2.0
        </Text>
      </ScrollView>
    </GradientScreen>
  );
}
