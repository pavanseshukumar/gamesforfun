import { useId } from "react";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";

/**
 * The Grumps: Blob Launch's grumpy little villains. Original SVG, drawn to
 * fill a `size`×`size` box (the physics body is a circle of the same size).
 */
export default function Grump({ size }) {
  const gid = `grump-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={gid} cx="38%" cy="32%" r="72%">
          <Stop offset="0" stopColor="#C9B3FF" />
          <Stop offset="0.6" stopColor="#8E6CE8" />
          <Stop offset="1" stopColor="#5B3FB5" />
        </RadialGradient>
      </Defs>
      {/* little horns */}
      <Path d="M24 22 L18 4 L36 16 Z" fill="#5B3FB5" />
      <Path d="M76 22 L82 4 L64 16 Z" fill="#5B3FB5" />
      <Circle cx={50} cy={52} r={46} fill={`url(#${gid})`} />
      <Ellipse
        cx={34}
        cy={28}
        rx={12}
        ry={6}
        fill="#FFFFFF"
        opacity={0.45}
        transform="rotate(-25 34 28)"
      />
      {/* eyes */}
      <Ellipse cx={35} cy={52} rx={10} ry={11} fill="#FFFFFF" />
      <Ellipse cx={65} cy={52} rx={10} ry={11} fill="#FFFFFF" />
      <Circle cx={37} cy={55} r={5.5} fill="#141414" />
      <Circle cx={63} cy={55} r={5.5} fill="#141414" />
      {/* angry brows */}
      <Path d="M22 36 L46 44" stroke="#2A1A5E" strokeWidth={7} strokeLinecap="round" />
      <Path d="M78 36 L54 44" stroke="#2A1A5E" strokeWidth={7} strokeLinecap="round" />
      {/* frown */}
      <Path
        d="M36 80 Q50 68 64 80"
        stroke="#2A1A5E"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
