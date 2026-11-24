import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { cardShadow, INK } from "../theme";
import PressableScale from "./PressableScale";

/** White circular icon button with an optional count badge. */
export function IconButton({ icon, onPress, badge, label, size = 48, children }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
          },
          cardShadow,
        ]}
      >
        {children ?? <Ionicons name={icon} size={size * 0.44} color={INK} />}
        {badge ? (
          <View
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: INK,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 5,
              borderWidth: 2,
              borderColor: "#FFFFFF",
            }}
          >
            <Text className="font-body-black text-[11px] text-white">{badge}</Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

/** Big black pill: the primary action everywhere. */
export function PrimaryButton({ title, onPress, icon, style }) {
  return (
    <PressableScale onPress={onPress} style={style} accessibilityRole="button">
      <View className="flex-row items-center justify-center rounded-full bg-ink px-7 py-4">
        {icon ? <Ionicons name={icon} size={18} color="#fff" style={{ marginRight: 8 }} /> : null}
        <Text className="font-body-bold text-base text-white">{title}</Text>
      </View>
    </PressableScale>
  );
}

/** Outlined pill for secondary actions. */
export function GhostButton({ title, onPress, style }) {
  return (
    <PressableScale onPress={onPress} style={style} accessibilityRole="button">
      <View className="items-center rounded-full border-2 border-ink px-7 py-[14px]">
        <Text className="font-body-bold text-base text-ink">{title}</Text>
      </View>
    </PressableScale>
  );
}
