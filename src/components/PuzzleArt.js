import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import Mascot, { MASCOTS } from "./Mascot";

// Fixed sparkle positions (as fractions of the picture) so every tile of the
// sliced picture has something recognisable on it.
const SPARKLES = [
  [0.12, 0.14, 0.018],
  [0.3, 0.3, 0.012],
  [0.52, 0.1, 0.015],
  [0.86, 0.42, 0.012],
  [0.08, 0.52, 0.014],
  [0.64, 0.36, 0.01],
];

/**
 * A square postcard scene starring one mascot: sky, sun, cloud, hills.
 * Used whole as the puzzle preview and sliced into tiles on the board.
 */
export default function PuzzleArt({ variant = "zip", size, animated = false, mood = "happy" }) {
  const c = MASCOTS[variant] ?? MASCOTS.zip;
  const s = size;
  return (
    <View style={{ width: s, height: s, overflow: "hidden" }}>
      <LinearGradient
        colors={["#7FD4FF", "#CDEBFF", c.light]}
        locations={[0, 0.55, 1]}
        style={{ position: "absolute", width: s, height: s }}
      />
      <Svg width={s} height={s} viewBox="0 0 100 100" style={{ position: "absolute" }}>
        {/* sun with a soft glow */}
        <Circle cx={80} cy={20} r={18} fill="#FFFFFF" opacity={0.35} />
        <Circle cx={80} cy={20} r={13} fill="#FFE14D" />
        {/* cloud */}
        <Path
          d="M10 34 Q10 26 18 26 Q20 18 29 20 Q35 14 41 22 Q49 22 48 30 Q50 36 42 36 L16 36 Q10 36 10 34 Z"
          fill="#FFFFFF"
          opacity={0.95}
        />
        {SPARKLES.map(([x, y, r], i) => (
          <Circle key={i} cx={x * 100} cy={y * 100} r={r * 100} fill="#FFFFFF" />
        ))}
        {/* rolling hills */}
        <Path d="M0 74 Q25 58 52 70 Q78 82 100 64 L100 100 L0 100 Z" fill={c.base} opacity={0.55} />
        <Path d="M0 86 Q30 72 60 84 Q82 92 100 80 L100 100 L0 100 Z" fill={c.dark} opacity={0.7} />
        {/* flowers on the front hill */}
        <Circle cx={12} cy={88} r={2.6} fill="#FFFFFF" />
        <Circle cx={12} cy={88} r={1.1} fill="#FFD43B" />
        <Circle cx={90} cy={86} r={2.6} fill="#FFFFFF" />
        <Circle cx={90} cy={86} r={1.1} fill="#FF6FB1" />
      </Svg>
      <View style={{ position: "absolute", left: s * 0.2, top: s * 0.3 }}>
        <Mascot variant={variant} size={s * 0.6} animated={animated} mood={mood} />
      </View>
    </View>
  );
}
