import { router } from "expo-router";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";

import { IconButton } from "../../components/Buttons";
import DailyBanner from "../../components/DailyBanner";
import GameCard from "../../components/GameCard";
import GradientScreen from "../../components/GradientScreen";
import Mascot from "../../components/Mascot";
import XpBar from "../../components/XpBar";
import { ARCADE } from "../../games/registry";
import useAchievements from "../../games/useAchievements";
import { levelInfo, rankFor } from "../../lib/progress";
import useFocusKey from "../../lib/useFocusKey";
import { useGameStore } from "../../store/useGameStore";
import { cardShadow, display } from "../../theme";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { width } = useWindowDimensions();
  const focusKey = useFocusKey();
  const name = useGameStore((s) => s.name);
  const avatar = useGameStore((s) => s.avatar);
  const best = useGameStore((s) => s.best);
  const xp = useGameStore((s) => s.xp);
  const streak = useGameStore((s) => s.streak);
  const { unseen } = useAchievements();

  const lv = levelInfo(xp);
  const rank = rankFor(lv.level);
  const heroSize = Math.min(width, 440);
  const cardWidth = Math.min(width * 0.62, 260);
  const firstName = (name || "Player").split(" ")[0];

  return (
    <GradientScreen theme="home">
      <ScrollView
        key={focusKey}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <Animated.View entering={FadeIn.duration(400)}>
          <View className="flex-row items-center justify-between px-5 pt-2">
            <IconButton label="Profile" onPress={() => router.navigate("/profile")}>
              <View style={{ marginTop: 6 }}>
                <Mascot variant={avatar} size={40} animated={false} />
              </View>
            </IconButton>
            <View className="rounded-full bg-white/70 px-4 py-2">
              <Text className="font-body-bold text-xs text-ink">{greeting()} ✌️</Text>
            </View>
            <IconButton
              icon="notifications-outline"
              label="Trophies"
              badge={unseen || null}
              onPress={() => router.navigate("/awards")}
            />
          </View>
        </Animated.View>

        {/* Hero: giant greeting with the mascot crew stepping in front */}
        <View style={{ alignItems: "center", marginTop: 14 }}>
          <Animated.Text
            entering={ZoomIn.springify().damping(12)}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              display(Math.min(84, heroSize * 0.2)),
              { paddingHorizontal: 16, textAlign: "center" },
            ]}
          >
            Hey {firstName}!
          </Animated.Text>
          <View
            style={{ flexDirection: "row", alignItems: "flex-end", marginTop: -heroSize * 0.07 }}
          >
            <Animated.View
              entering={FadeInUp.delay(150).springify()}
              style={{ marginRight: -18, zIndex: 1 }}
            >
              <Mascot variant="bloop" size={heroSize * 0.27} mood="cool" delay={300} />
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(50).springify()} style={{ zIndex: 2 }}>
              <Mascot variant="zip" size={heroSize * 0.36} mood="cheer" />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(250).springify()}
              style={{ marginLeft: -18, zIndex: 1 }}
            >
              <Mascot variant="gloop" size={heroSize * 0.27} mood="wow" delay={600} />
            </Animated.View>
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View className="mt-2 items-center px-5">
            <Text className="font-body-black text-2xl text-ink">Pick a game, beat your best</Text>
            <View
              style={[{ marginTop: 14, alignSelf: "stretch" }, cardShadow]}
              className="flex-row items-center rounded-full bg-white px-5 py-3.5"
            >
              <Text style={{ fontSize: 18 }}>{streak > 0 ? "🔥" : "✨"}</Text>
              <Text className="ml-3 flex-1 font-body-semi text-sm text-ink-mute">
                {streak > 0
                  ? `${streak}-day streak! Play today to keep it alive`
                  : "Play a round today to start a streak"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Today's puzzle */}
        <Animated.View
          entering={FadeInUp.delay(280).springify()}
          style={{ paddingHorizontal: 20, marginTop: 22 }}
        >
          <DailyBanner />
        </Animated.View>

        {/* Game carousel */}
        <View className="mt-8 flex-row items-end justify-between px-5">
          <Text style={display(30)}>Games</Text>
          <Text className="mb-1.5 font-body-bold text-sm text-ink-mute">
            {ARCADE.length} to play
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + 16}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
            gap: 16,
          }}
        >
          {ARCADE.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} best={best[game.id]} width={cardWidth} />
          ))}
        </ScrollView>

        {/* Level card */}
        <Animated.View entering={FadeInUp.delay(450).springify()} style={{ paddingHorizontal: 20 }}>
          <View style={cardShadow} className="rounded-[28px] bg-white p-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-body-bold text-xs uppercase tracking-[2px] text-ink-mute">
                  Your level
                </Text>
                <Text style={[display(40), { marginTop: 2 }]}>Level {lv.level}</Text>
              </View>
              <View className="items-center rounded-2xl bg-[#FFF6CC] px-3 py-2">
                <Text style={{ fontSize: 22 }}>{rank.emoji}</Text>
                <Text className="font-body-bold text-[11px] text-ink">{rank.name}</Text>
              </View>
            </View>
            <View className="mt-4">
              <XpBar ratio={lv.into / lv.needed} />
            </View>
            <Text className="mt-2 font-body-semi text-xs text-ink-mute">
              {xp} XP · {lv.toNext} XP to level {lv.level + 1}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </GradientScreen>
  );
}
