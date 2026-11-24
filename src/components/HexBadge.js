import { useId } from "react";
import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

// Rounded, pointy-top hexagon in a 100×110 box.
const HEX =
  "M50 4 Q54 2 58 4 L92 24 Q96 27 96 32 L96 78 Q96 83 92 86 L58 106 Q54 108 50 108 Q46 108 42 106 L8 86 Q4 83 4 78 L4 32 Q4 27 8 24 L42 4 Q46 2 50 4 Z";
const INNER = "M50 16 L84 35 L84 76 L50 95 L16 76 L16 35 Z";

/** A gem-like hexagon badge with an emoji and an optional label tag. */
export default function HexBadge({ emoji, colors, size = 72, locked, label, id = "hex" }) {
  const [from, to] = locked ? ["#E9EAF0", "#C5C8D4"] : colors;
  const gid = `hb-${id}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View
      style={{ width: size, height: size * 1.1, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size * 1.1} viewBox="0 0 100 110" style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Path d={HEX} fill={`url(#${gid})`} />
        <Path d={INNER} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={3} />
      </Svg>
      <Text style={{ fontSize: size * 0.36, opacity: locked ? 0.45 : 1 }}>
        {locked ? "🔒" : emoji}
      </Text>
      {label != null && (
        <View
          style={{
            position: "absolute",
            bottom: -4,
            backgroundColor: locked ? "#9AA0B4" : "#141414",
            borderRadius: 99,
            paddingHorizontal: 7,
            paddingVertical: 1,
            borderWidth: 2,
            borderColor: "#FFFFFF",
          }}
        >
          <Text className="font-body-black text-[10px] text-white">{label}</Text>
        </View>
      )}
    </View>
  );
}
