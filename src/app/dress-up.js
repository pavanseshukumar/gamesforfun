import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

import { IconButton } from "../components/Buttons";
import GradientScreen from "../components/GradientScreen";
import Mascot, { MASCOTS } from "../components/Mascot";
import PressableScale from "../components/PressableScale";
import useOutfit from "../games/useOutfit";
import { EMPTY_OUTFIT, isUnlocked, ITEMS, needText, progressTo, SLOTS } from "../games/wardrobe";
import { haptic } from "../lib/haptics";
import { sfx } from "../lib/sound";
import { useGameStore } from "../store/useGameStore";
import { cardShadow, display, INK } from "../theme";

const GAP = 12;

function ItemCard({ item, avatar, width, worn, unlocked, progress, onPress }) {
  const preview = item ? { ...EMPTY_OUTFIT, [item.slot]: item.id } : EMPTY_OUTFIT;
  return (
    <PressableScale
      onPress={onPress}
      hapticFeedback={false}
      accessibilityLabel={item ? item.name : "Nothing"}
      accessibilityState={{ selected: worn, disabled: !unlocked }}
      style={{ width }}
    >
      <View
        style={[cardShadow, { borderWidth: 3, borderColor: worn ? INK : "transparent" }]}
        className="items-center rounded-3xl bg-white px-2 pb-3 pt-2"
      >
        <View style={{ opacity: unlocked ? 1 : 0.35 }}>
          <Mascot variant={avatar} size={width * 0.62} animated={false} outfit={preview} />
        </View>
        {!unlocked && (
          <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-ink">
            <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
          </View>
        )}
        {worn && (
          <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-ink">
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        )}
        <Text numberOfLines={1} className="mt-1 font-body-black text-xs text-ink">
          {item ? item.name : "Nothing"}
        </Text>
        {unlocked ? (
          <Text className="font-body-semi text-[11px] text-ink-mute">
            {worn ? "Wearing" : "Tap to wear"}
          </Text>
        ) : (
          <View className="mt-1 w-full items-center">
            <Text className="font-body-bold text-[11px] text-ink-soft">{needText(item.need)}</Text>
            <View className="mt-1 h-1.5 w-4/5 overflow-hidden rounded-full bg-[#F1E4EC]">
              <View
                className="h-full rounded-full bg-[#FF6FB1]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </View>
          </View>
        )}
      </View>
    </PressableScale>
  );
}

export default function DressUp() {
  const { width } = useWindowDimensions();
  const avatar = useGameStore((s) => s.avatar);
  const setAvatar = useGameStore((s) => s.setAvatar);
  const setOutfitItem = useGameStore((s) => s.setOutfitItem);
  const { outfit, stats } = useOutfit();

  const [slot, setSlot] = useState("hat");
  const [hint, setHint] = useState(null);
  const [cheer, setCheer] = useState(0); // bumps on every change: the buddy cheers briefly

  useEffect(() => {
    if (!cheer) return undefined;
    const id = setTimeout(() => setCheer(0), 1300);
    return () => clearTimeout(id);
  }, [cheer]);

  const unlockedCount = useMemo(() => ITEMS.filter((i) => isUnlocked(i, stats)).length, [stats]);
  const items = [null, ...ITEMS.filter((i) => i.slot === slot)];
  const columns = 3;
  const inner = Math.min(width, 520) - 40;
  const cardW = (inner - GAP * (columns - 1)) / columns;

  const choose = (item) => {
    if (item && !isUnlocked(item, stats)) {
      haptic.error();
      sfx("wrong");
      setHint(`${item.name} unlocks at ${needText(item.need)}. Keep playing!`);
      return;
    }
    const id = item?.id ?? null;
    if (outfit[slot] === id) return;
    setOutfitItem(slot, id);
    setHint(null);
    haptic.success();
    sfx(id ? "star" : "select");
    setCheer((c) => c + 1);
  };

  return (
    <GradientScreen theme="wardrobe" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <Text style={display(30)}>Dress Up</Text>
        <IconButton
          icon="refresh"
          label="Take everything off"
          onPress={() => {
            for (const s of SLOTS) setOutfitItem(s.id, null);
            setHint(null);
            setCheer((c) => c + 1);
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={ZoomIn.springify().damping(12)} style={{ marginTop: 8 }}>
          <Mascot
            variant={avatar}
            size={Math.min(210, width * 0.5)}
            mood={cheer ? "cheer" : "happy"}
            outfit={outfit}
          />
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(150)}
          style={{ marginTop: 4, flexDirection: "row", gap: 8 }}
        >
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
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    borderWidth: 3,
                    borderColor: selected ? INK : "transparent",
                    backgroundColor: "rgba(255,255,255,0.75)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mascot variant={key} size={36} animated={false} />
                </View>
              </PressableScale>
            );
          })}
        </Animated.View>

        <Text className="mt-3 font-body-bold text-xs text-ink-soft">
          Level {stats.level} · {stats.stars} ⭐ · {unlockedCount} of {ITEMS.length} unlocked
        </Text>

        <View
          style={[cardShadow, { width: inner }]}
          className="mt-4 flex-row rounded-full bg-white p-1.5"
        >
          {SLOTS.map((s) => {
            const active = s.id === slot;
            return (
              <PressableScale
                key={s.id}
                onPress={() => {
                  setSlot(s.id);
                  setHint(null);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{ flex: 1 }}
              >
                <View className={`items-center rounded-full py-2.5 ${active ? "bg-ink" : ""}`}>
                  <Text
                    className={`font-body-bold text-sm ${active ? "text-white" : "text-ink-soft"}`}
                  >
                    {s.label}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>

        {hint && (
          <Animated.View entering={FadeInDown.springify()} style={{ width: inner, marginTop: 12 }}>
            <View className="rounded-2xl bg-ink px-4 py-3">
              <Text className="font-body-semi text-sm text-white">🔒 {hint}</Text>
            </View>
          </Animated.View>
        )}

        <View
          key={slot}
          style={{ width: inner, flexDirection: "row", flexWrap: "wrap", gap: GAP, marginTop: 14 }}
        >
          {items.map((item, i) => (
            <Animated.View
              key={item?.id ?? "none"}
              entering={ZoomIn.delay(40 * i)
                .springify()
                .damping(13)}
            >
              <ItemCard
                item={item}
                avatar={avatar}
                width={cardW}
                worn={(outfit[slot] ?? null) === (item?.id ?? null)}
                unlocked={!item || isUnlocked(item, stats)}
                progress={item ? progressTo(item, stats) : 1}
                onPress={() => choose(item)}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </GradientScreen>
  );
}
