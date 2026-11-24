import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

import GradientScreen from "../../components/GradientScreen";
import HexBadge from "../../components/HexBadge";
import Mascot from "../../components/Mascot";
import XpBar from "../../components/XpBar";
import useAchievements from "../../games/useAchievements";
import useFocusKey from "../../lib/useFocusKey";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

export default function Awards() {
  const { width } = useWindowDimensions();
  const focusKey = useFocusKey();
  const { list, earned } = useAchievements();
  const markAwardsSeen = useGameStore((s) => s.markAwardsSeen);
  const earnedIds = earned.map((a) => a.id).join(",");

  // Opening this tab clears the bell badge on the home screen.
  useFocusEffect(
    useCallback(() => {
      markAwardsSeen(earnedIds ? earnedIds.split(",") : []);
    }, [earnedIds, markAwardsSeen]),
  );

  const col = (Math.min(width, 480) - 40 - 24) / 3;

  return (
    <GradientScreen theme="awards">
      <ScrollView
        key={focusKey}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(350)}>
          <View className="flex-row items-end justify-between px-5 pt-4">
            <View className="flex-1">
              <Text style={display(64)}>Trophies</Text>
              <Text className="font-body-bold text-base text-ink-soft">
                {earned.length} of {list.length} unlocked
              </Text>
            </View>
            <Mascot variant="sunny" size={96} mood="cheer" />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={{ paddingHorizontal: 20, marginTop: 12 }}
        >
          <XpBar
            ratio={earned.length / list.length}
            colors={["#8BE04E", "#1FBF7A"]}
            track="rgba(255,255,255,0.7)"
          />
        </Animated.View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            paddingHorizontal: 20,
            marginTop: 20,
          }}
        >
          {list.map((a, i) => (
            <Animated.View
              key={a.id}
              entering={ZoomIn.delay(150 + i * 60)
                .springify()
                .damping(12)}
            >
              <View
                style={[{ width: col, opacity: a.done ? 1 : 0.85 }, cardShadow]}
                className="items-center rounded-[24px] bg-white px-2 pb-3 pt-4"
              >
                <HexBadge
                  id={`a-${a.id}`}
                  emoji={a.emoji}
                  colors={a.colors}
                  locked={!a.done}
                  label={a.done ? "✓" : a.label}
                  size={col * 0.62}
                />
                <Text numberOfLines={1} className="mt-3 font-body-black text-[13px] text-ink">
                  {a.title}
                </Text>
                <Text
                  numberOfLines={2}
                  className="mt-0.5 text-center font-body text-[11px] leading-[14px] text-ink-mute"
                >
                  {a.desc}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </GradientScreen>
  );
}
