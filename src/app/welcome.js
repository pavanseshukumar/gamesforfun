import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

import { PrimaryButton } from "../components/Buttons";
import GradientScreen from "../components/GradientScreen";
import HexBadge from "../components/HexBadge";
import Mascot, { MASCOTS } from "../components/Mascot";
import PressableScale from "../components/PressableScale";
import XpBar from "../components/XpBar";
import { totalLevelCount } from "../games/library";
import { ARCADE } from "../games/registry";
import { haptic } from "../lib/haptics";
import { sfx } from "../lib/sound";
import { useGameStore } from "../store/useGameStore";
import { cardShadow, display, INK } from "../theme";

const PAGES = 4;
const LEVEL_COUNT = totalLevelCount(ARCADE);

function Page({ width, height, children }) {
  return (
    <View
      style={{
        width,
        height,
        paddingHorizontal: 28,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}

function Title({ children }) {
  return (
    <Text style={[display(44), { textAlign: "center", lineHeight: 48, marginTop: 24 }]}>
      {children}
    </Text>
  );
}

function Body({ children }) {
  return (
    <Text className="mt-3 text-center font-body-semi text-base leading-6 text-ink-soft">
      {children}
    </Text>
  );
}

/** Page 1: the crew says hi. */
function Hello({ width, height }) {
  return (
    <Page width={width} height={height}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Mascot variant="bloop" size={86} mood="cool" delay={200} />
        <Mascot variant="zip" size={128} mood="cheer" />
        <Mascot variant="gloop" size={86} mood="wow" delay={500} />
      </View>
      <Title>Hey there!</Title>
      <Body>
        Welcome to Games for Fun: bite-size games starring Zip, Bloop, Gloop, Pip and Sunny.
      </Body>
    </Page>
  );
}

/** Page 2: what there is to play. */
function Games({ width, height, levelCount }) {
  return (
    <Page width={width} height={height}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
        {ARCADE.map((g) => (
          <View
            key={g.id}
            style={[
              cardShadow,
              {
                width: 54,
                height: 54,
                borderRadius: 17,
                backgroundColor: g.colors[0],
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
          </View>
        ))}
      </View>
      <Title>{ARCADE.length} games to play</Title>
      <Body>
        Quick arcade rounds, brainy puzzles and physics fun, with {levelCount}+ levels to clear and
        stars to collect.
      </Body>
    </Page>
  );
}

/** Page 3: progress, trophies and dress-up. */
function Rewards({ width, height }) {
  return (
    <Page width={width} height={height}>
      <View
        style={[cardShadow, { width: "100%" }]}
        className="items-center rounded-[28px] bg-white p-5"
      >
        <View className="flex-row items-center">
          <Mascot
            variant="pip"
            size={96}
            mood="cheer"
            outfit={{ hat: "crown", face: "shades", neck: "bowtie" }}
          />
          <View className="ml-4">
            <HexBadge id="welcome-badge" emoji="🏆" colors={["#FFE680", "#FFB800"]} size={64} />
          </View>
        </View>
        <View className="mt-4 w-full">
          <XpBar ratio={0.65} colors={["#8FC1FF", "#3F6DFF"]} />
          <Text className="mt-2 text-center font-body-bold text-xs text-ink-mute">
            Level 4 · 65% to Level 5
          </Text>
        </View>
      </View>
      <Title>Earn & unlock</Title>
      <Body>
        Every round earns XP. Win trophies, keep a daily streak and unlock hats, shades and more for
        your buddy.
      </Body>
    </Page>
  );
}

/** Page 4: pick a buddy and a name. */
function Setup({ width, height, avatar, setAvatar, name, setName, onDone }) {
  return (
    <Page width={width} height={height}>
      <Mascot variant={avatar} size={130} mood="cheer" />
      <Title>Pick your buddy</Title>
      <View className="mt-4 flex-row" style={{ gap: 8 }}>
        {Object.entries(MASCOTS).map(([key, m]) => {
          const selected = key === avatar;
          return (
            <PressableScale
              key={key}
              onPress={() => setAvatar(key)}
              accessibilityLabel={`Choose ${m.name}`}
              accessibilityState={{ selected }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  borderWidth: 3,
                  borderColor: selected ? INK : "transparent",
                  backgroundColor: "rgba(255,255,255,0.8)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mascot variant={key} size={40} animated={false} />
              </View>
            </PressableScale>
          );
        })}
      </View>
      <View
        style={[cardShadow, { width: "100%", marginTop: 20 }]}
        className="flex-row items-center rounded-full bg-white px-5"
      >
        <Ionicons name="person-outline" size={18} color={INK} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#9A98A8"
          maxLength={14}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onDone}
          accessibilityLabel="Your name"
          className="ml-3 flex-1 py-4 font-body-bold text-base text-ink"
          style={{ outlineStyle: "none" }}
        />
      </View>
    </Page>
  );
}

export default function Welcome() {
  const { width } = useWindowDimensions();
  const scroller = useRef(null);
  const [page, setPage] = useState(0);
  const [pageH, setPageH] = useState(0);
  const storedName = useGameStore((s) => s.name);
  const storedAvatar = useGameStore((s) => s.avatar);
  const setStoredName = useGameStore((s) => s.setName);
  const setStoredAvatar = useGameStore((s) => s.setAvatar);
  const setOnboarded = useGameStore((s) => s.setOnboarded);
  const [name, setName] = useState(storedName === "Player" ? "" : storedName);
  const [avatar, setAvatar] = useState(storedAvatar);

  const goTo = (p) => {
    scroller.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
  };

  const finish = () => {
    setStoredName(name.trim() || "Player");
    setStoredAvatar(avatar);
    haptic.success();
    sfx("levelup");
    // The root layout's protected routes move us on to Home once this flips.
    setOnboarded(true);
  };

  const last = page === PAGES - 1;

  return (
    <GradientScreen theme="welcome" edges={["top", "bottom"]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        <View className="h-14 flex-row items-center justify-end px-5">
          {!last && (
            <PressableScale onPress={() => goTo(PAGES - 1)} accessibilityRole="button">
              <Text className="px-2 py-2 font-body-bold text-base text-ink-soft">Skip</Text>
            </PressableScale>
          )}
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          onScroll={(e) => {
            // Web has no momentum event: track the page as it scrolls.
            const p = Math.round(e.nativeEvent.contentOffset.x / width);
            if (p !== page) setPage(p);
          }}
          style={{ flex: 1 }}
          onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
        >
          <Hello width={width} height={pageH} />
          <Games width={width} height={pageH} levelCount={Math.floor(LEVEL_COUNT / 10) * 10} />
          <Rewards width={width} height={pageH} />
          <Setup
            width={width}
            height={pageH}
            avatar={avatar}
            setAvatar={setAvatar}
            name={name}
            setName={setName}
            onDone={finish}
          />
        </ScrollView>

        <View className="items-center px-6 pb-6">
          <View className="mb-5 flex-row" style={{ gap: 8 }}>
            {Array.from({ length: PAGES }, (_, i) => (
              <View
                key={i}
                style={{
                  width: i === page ? 26 : 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: i === page ? INK : "rgba(20,20,20,0.2)",
                }}
              />
            ))}
          </View>
          <Animated.View key={last ? "go" : "next"} entering={ZoomIn.springify().damping(14)}>
            <PrimaryButton
              title={last ? "Let's play!" : "Next"}
              icon={last ? "game-controller" : "arrow-forward"}
              onPress={last ? finish : () => goTo(page + 1)}
              style={{ minWidth: 220 }}
            />
          </Animated.View>
          {last && (
            <Animated.View entering={FadeInDown}>
              <Text className="mt-3 font-body text-xs text-ink-mute">
                You can change these any time in Settings.
              </Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </GradientScreen>
  );
}
