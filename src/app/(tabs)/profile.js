import { router } from "expo-router";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";

import { IconButton } from "../../components/Buttons";
import GradientScreen from "../../components/GradientScreen";
import HexBadge from "../../components/HexBadge";
import Mascot from "../../components/Mascot";
import XpBar from "../../components/XpBar";
import { GAMES } from "../../games/registry";
import useAchievements from "../../games/useAchievements";
import { levelInfo, rankFor } from "../../lib/progress";
import useFocusKey from "../../lib/useFocusKey";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

function BigStat({ value, label }) {
  return (
    <View className="items-center">
      <Text style={display(40)}>{value}</Text>
      <Text className="font-body-semi text-xs text-ink-soft">{label}</Text>
    </View>
  );
}

function Stat({ icon, value, label }) {
  return (
    <View className="w-1/2 flex-row items-center py-2">
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <View className="ml-2">
        <Text className="font-body-black text-base text-ink">{value}</Text>
        <Text className="font-body text-xs text-ink-mute">{label}</Text>
      </View>
    </View>
  );
}

export default function Profile() {
  const { width } = useWindowDimensions();
  const focusKey = useFocusKey();
  const name = useGameStore((s) => s.name);
  const avatar = useGameStore((s) => s.avatar);
  const xp = useGameStore((s) => s.xp);
  const plays = useGameStore((s) => s.plays);
  const best = useGameStore((s) => s.best);
  const streak = useGameStore((s) => s.streak);
  const bestStreak = useGameStore((s) => s.bestStreak);
  const { list, earned } = useAchievements();

  const lv = levelInfo(xp);
  const rank = rankFor(lv.level);
  const totalPlays = Object.values(plays).reduce((a, b) => a + b, 0);
  // Show earned badges first, then the closest locked ones.
  const showcase = [...list].sort((a, b) => b.done - a.done || b.ratio - a.ratio).slice(0, 3);

  return (
    <GradientScreen theme="profile">
      <ScrollView
        key={focusKey}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(350)}>
          <View className="flex-row items-center justify-between px-5 pt-2">
            <View className="h-12 w-12" />
            <Text className="font-body-bold text-lg text-ink">Overview</Text>
            <IconButton
              icon="create-outline"
              label="Edit profile"
              onPress={() => router.navigate("/settings")}
            />
          </View>
        </Animated.View>

        <Animated.Text
          entering={ZoomIn.springify().damping(12)}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            display(Math.min(92, width * 0.22)),
            { textAlign: "center", marginTop: 12, paddingHorizontal: 16 },
          ]}
        >
          {name || "Player"}
        </Animated.Text>

        <View className="mt-1 flex-row items-center justify-between px-8">
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <BigStat value={lv.level} label="level" />
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(100).springify().damping(11)}>
            <Mascot variant={avatar} size={Math.min(200, width * 0.48)} mood="cool" />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <BigStat value={totalPlays} label="games" />
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.delay(250).springify()}
          style={{ paddingHorizontal: 20, marginTop: 8 }}
        >
          <View style={cardShadow} className="rounded-[28px] bg-white p-5">
            <View className="flex-row flex-wrap">
              <Stat icon="🔥" value={`${streak} days`} label={`Best streak ${bestStreak}`} />
              <Stat
                icon="⭐"
                value={`${xp.toLocaleString()} XP`}
                label={`${lv.toNext} to next level`}
              />
              <Stat icon="🏆" value={`${earned.length}/${list.length}`} label="Trophies" />
              <Stat icon={rank.emoji} value={rank.name} label="Rank" />
            </View>
            <View className="mt-3">
              <XpBar ratio={lv.into / lv.needed} colors={["#8FC1FF", "#3F6DFF"]} />
            </View>

            <View className="mt-6 flex-row justify-around">
              {showcase.map((a, i) => (
                <Animated.View
                  key={a.id}
                  entering={ZoomIn.delay(400 + i * 120)
                    .springify()
                    .damping(10)}
                >
                  <View className="items-center">
                    <HexBadge
                      id={`p-${a.id}`}
                      emoji={a.emoji}
                      colors={a.colors}
                      locked={!a.done}
                      label={a.done ? "✓" : a.label}
                      size={70}
                    />
                    <Text className="mt-2 font-body-bold text-xs text-ink">{a.title}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(400).springify()}
          style={{ paddingHorizontal: 20, marginTop: 24 }}
        >
          <Text style={display(28)}>Personal bests</Text>
          <View className="mt-3 gap-3">
            {GAMES.map((g) => (
              <View
                key={g.id}
                style={cardShadow}
                className="flex-row items-center rounded-3xl bg-white p-3"
              >
                <View
                  className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl"
                  style={{ backgroundColor: g.colors[0] }}
                >
                  <View style={{ marginTop: 10 }}>
                    <Mascot variant={g.mascot} size={50} animated={false} />
                  </View>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-body-black text-base text-ink">{g.title}</Text>
                  <Text className="font-body text-xs text-ink-mute">{plays[g.id] ?? 0} played</Text>
                </View>
                <Text style={display(26)}>{best[g.id] ?? "–"}</Text>
                <Text className="ml-1 mt-2 font-body-semi text-xs text-ink-mute">
                  {best[g.id] != null ? g.unit : ""}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </GradientScreen>
  );
}
