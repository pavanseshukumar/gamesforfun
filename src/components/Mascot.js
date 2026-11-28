import { useEffect, useId } from "react";
import { Platform, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeColorMatrix,
  Filter,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { LEGACY_BUDDIES, MASCOTS } from "../games/buddies";

/**
 * The game's buddy cast: ten round, squishy animals drawn in SVG with soft
 * 3D shading. Each has its own colour and features (ears, a tail, a beak…).
 */

export { LEGACY_BUDDIES, MASCOTS };

const W = 200;
const H = 220;
const EYE_Y = 112;

const BODY =
  "M100 50 C150 50 176 88 176 128 C176 170 144 196 100 196 C56 196 24 170 24 128 C24 88 50 50 100 50 Z";

/** Birds have a beak instead of a mouth, and orange feet. */
const BIRDS = new Set(["pengu", "peep", "hoot"]);

/** Ears, crests and tufts: drawn behind the body and hidden under a hat. */
function HeadParts({ variant, c }) {
  switch (variant) {
    case "mochi":
      return (
        <G>
          <Path d="M52 82 L58 32 L92 58 Z" fill={c.dark} />
          <Path d="M148 82 L142 32 L108 58 Z" fill={c.dark} />
          <Path d="M60 70 L63 44 L82 58 Z" fill="#FFB8D9" />
          <Path d="M140 70 L137 44 L118 58 Z" fill="#FFB8D9" />
        </G>
      );
    case "bun":
      return (
        <G>
          <Ellipse cx={74} cy={36} rx={16} ry={38} fill={c.base} rotation={-10} origin="74,36" />
          <Ellipse cx={126} cy={36} rx={16} ry={38} fill={c.base} rotation={10} origin="126,36" />
          <Ellipse
            cx={74}
            cy={40}
            rx={7}
            ry={26}
            fill="#FFFFFF"
            opacity={0.7}
            rotation={-10}
            origin="74,40"
          />
          <Ellipse
            cx={126}
            cy={40}
            rx={7}
            ry={26}
            fill="#FFFFFF"
            opacity={0.7}
            rotation={10}
            origin="126,40"
          />
        </G>
      );
    case "rex":
      return <Path d="M64 62 L72 36 L84 56 L96 30 L108 54 L122 34 L134 62 Z" fill="#FFB020" />;
    case "pom":
      return (
        <G>
          <Circle cx={56} cy={64} r={22} fill={c.dark} />
          <Circle cx={144} cy={64} r={22} fill={c.dark} />
          <Circle cx={56} cy={64} r={11} fill="#F7C9A0" />
          <Circle cx={144} cy={64} r={11} fill="#F7C9A0" />
        </G>
      );
    case "kit":
      return (
        <G>
          <Path d="M46 90 L50 24 L98 58 Z" fill={c.dark} />
          <Path d="M154 90 L150 24 L102 58 Z" fill={c.dark} />
          <Path d="M56 76 L58 42 L82 60 Z" fill="#FFF1E0" />
          <Path d="M144 76 L142 42 L118 60 Z" fill="#FFF1E0" />
          <Path d="M50 24 L46 40 L60 34 Z" fill="#3A2318" />
          <Path d="M150 24 L154 40 L140 34 Z" fill="#3A2318" />
        </G>
      );
    case "peep":
      return (
        <G>
          <Path d="M98 54 Q84 26 70 30 Q86 38 90 56 Z" fill={c.dark} />
          <Path d="M100 54 Q100 18 110 14 Q106 34 108 54 Z" fill={c.dark} />
          <Path d="M104 56 Q118 30 132 34 Q116 42 112 58 Z" fill={c.dark} />
        </G>
      );
    case "koko":
      return (
        <G>
          <Circle cx={42} cy={76} r={32} fill={c.base} />
          <Circle cx={158} cy={76} r={32} fill={c.base} />
          <Circle cx={44} cy={78} r={18} fill="#F7E3EC" />
          <Circle cx={156} cy={78} r={18} fill="#F7E3EC" />
        </G>
      );
    case "hop":
      return (
        <G>
          <Circle cx={70} cy={70} r={28} fill={c.base} />
          <Circle cx={130} cy={70} r={28} fill={c.base} />
          <Circle cx={62} cy={60} r={8} fill="#FFFFFF" opacity={0.45} />
        </G>
      );
    case "hoot":
      return (
        <G>
          <Path d="M48 84 L36 30 L86 60 Z" fill={c.dark} />
          <Path d="M152 84 L164 30 L114 60 Z" fill={c.dark} />
        </G>
      );
    default:
      return null;
  }
}

/** Parts behind the body that stay on with a hat: tails. */
function BackParts({ variant, c }) {
  if (variant === "rex") {
    return <Path d="M168 170 Q196 176 192 150 Q184 166 166 160 Z" fill={c.dark} />;
  }
  if (variant === "kit") {
    return (
      <G>
        <Path d="M150 178 Q206 176 198 110 Q194 92 180 96 Q186 150 150 156 Z" fill={c.base} />
        <Path d="M198 110 Q194 92 180 96 Q182 112 197 120 Z" fill="#FFF4E6" />
      </G>
    );
  }
  return null;
}

/** Face and body details drawn over the body, under the mouth and eyes. */
function FrontParts({ variant, c }) {
  switch (variant) {
    case "mochi":
      return (
        <G>
          <Path
            d="M40 132 L64 136 M40 144 L64 142 M160 132 L136 136 M160 144 L136 142"
            stroke="#5A3A8A"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Path d="M95 136 L105 136 L100 142 Z" fill="#FF6FB1" />
        </G>
      );
    case "bun":
      return <Ellipse cx={100} cy={137} rx={7} ry={5} fill="#E5487F" />;
    case "rex":
      return (
        <G>
          <Circle cx={64} cy={168} r={6} fill={c.dark} opacity={0.5} />
          <Circle cx={136} cy={172} r={5} fill={c.dark} opacity={0.5} />
        </G>
      );
    case "pom":
      return (
        <G>
          <Ellipse cx={100} cy={150} rx={30} ry={22} fill="#F7D8B8" />
          <Ellipse cx={100} cy={137} rx={10} ry={7} fill="#3A2110" />
        </G>
      );
    case "pengu":
      return (
        <Path
          d="M100 74 C140 74 156 104 156 136 C156 172 132 190 100 190 C68 190 44 172 44 136 C44 104 60 74 100 74 Z"
          fill="#FFFFFF"
        />
      );
    case "kit":
      return (
        <G>
          <Path
            d="M30 128 Q66 118 100 138 Q134 118 170 128 Q164 190 100 194 Q36 190 30 128 Z"
            fill="#FFF4E6"
          />
          <Ellipse cx={100} cy={137} rx={9} ry={6.5} fill="#2A1A14" />
        </G>
      );
    case "peep":
      return (
        <G>
          <Ellipse cx={100} cy={170} rx={38} ry={20} fill={c.light} opacity={0.8} />
        </G>
      );
    case "koko":
      return (
        <G>
          <Ellipse cx={100} cy={172} rx={34} ry={18} fill="#FFFFFF" opacity={0.6} />
          <Ellipse cx={100} cy={132} rx={12} ry={14} fill="#3A3F52" />
          <Ellipse cx={96} cy={126} rx={4} ry={3} fill="#FFFFFF" opacity={0.5} />
        </G>
      );
    case "hop":
      return (
        <G>
          <Ellipse cx={100} cy={174} rx={42} ry={18} fill={c.light} opacity={0.85} />
          <Circle cx={44} cy={150} r={6} fill={c.dark} opacity={0.45} />
          <Circle cx={158} cy={156} r={5} fill={c.dark} opacity={0.45} />
          <Circle cx={94} cy={136} r={2.5} fill={c.dark} />
          <Circle cx={106} cy={136} r={2.5} fill={c.dark} />
        </G>
      );
    case "hoot":
      return (
        <G>
          <Circle cx={78} cy={112} r={29} fill={c.light} />
          <Circle cx={122} cy={112} r={29} fill={c.light} />
          <Ellipse cx={100} cy={172} rx={40} ry={20} fill="#E8FBFC" />
          <Path
            d="M80 164 L86 169 L92 164 M108 164 L114 169 L120 164 M94 176 L100 181 L106 176"
            stroke={c.dark}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      );
    default:
      return null;
  }
}

/** Five-point star centred on (cx, cy). */
function starPath(cx, cy, R, r) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    d += `${i ? "L" : "M"}${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

/** Heart centred on (cx, cy), about 2s wide. */
const heartPath = (cx, cy, s) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.7} ${cy - s * 1.2} ${cx} ${cy - s * 0.35} ` +
  `C${cx + s * 0.7} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z`;

/** Dress-Up hats, drawn on the head in the body's 200×220 space. */
function Hat({ id }) {
  switch (id) {
    case "party":
      return (
        <G>
          <Path d="M100 8 L132 64 Q100 74 68 64 Z" fill="#FF5C8A" />
          <Path d="M89 27 L111 27 L116 36 L84 36 Z" fill="#FFE14D" />
          <Path d="M78 46 L122 46 L127 55 L73 55 Z" fill="#FFE14D" />
          <Circle cx={100} cy={9} r={9} fill="#4DD9FF" />
        </G>
      );
    case "cap":
      return (
        <G>
          <Path d="M120 62 Q168 56 184 72 Q152 80 120 72 Z" fill="#C81E3A" />
          <Path d="M50 70 Q52 30 100 28 Q148 30 150 70 Q100 60 50 70 Z" fill="#FF3B5C" />
          <Path d="M100 28 L100 64" stroke="#C81E3A" strokeWidth={3} />
          <Circle cx={100} cy={29} r={6} fill="#C81E3A" />
        </G>
      );
    case "beanie":
      return (
        <G>
          <Path d="M48 72 Q50 26 100 24 Q150 26 152 72 Z" fill="#22B8A7" />
          <Path
            d="M74 30 L74 66 M100 26 L100 64 M126 30 L126 66"
            stroke="#1A9486"
            strokeWidth={4}
          />
          <Rect x={42} y={60} width={116} height={20} rx={10} fill="#1A9486" />
          <Circle cx={100} cy={20} r={13} fill="#FFFFFF" />
        </G>
      );
    case "flowers":
      return (
        <G>
          {[
            [50, 76, "#FF6FB1"],
            [68, 60, "#FFD43B"],
            [100, 54, "#7A6CFF"],
            [132, 60, "#FF8A3D"],
            [150, 76, "#FF6FB1"],
          ].map(([x, y, col]) => (
            <G key={`${x}`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <Circle
                  key={a}
                  cx={x + 8 * Math.cos((a * Math.PI) / 180)}
                  cy={y + 8 * Math.sin((a * Math.PI) / 180)}
                  r={6.5}
                  fill={col}
                />
              ))}
              <Circle cx={x} cy={y} r={5} fill="#FFF3B0" />
            </G>
          ))}
          <Path
            d="M58 66 L64 62 M84 54 L90 54 M112 54 L118 56 M138 64 L144 68"
            stroke="#2BC46E"
            strokeWidth={4}
            strokeLinecap="round"
          />
        </G>
      );
    case "tophat":
      return (
        <G>
          <Rect x={68} y={6} width={64} height={54} rx={6} fill="#22223A" />
          <Rect x={68} y={42} width={64} height={11} fill="#FF3B5C" />
          <Ellipse cx={100} cy={60} rx={54} ry={10} fill="#22223A" />
          <Rect x={76} y={12} width={8} height={26} rx={4} fill="#FFFFFF" opacity={0.18} />
        </G>
      );
    case "wizard":
      return (
        <G>
          <Path d="M108 4 Q100 30 142 64 Q100 74 58 64 Q90 40 108 4 Z" fill="#6C4DFF" />
          <Ellipse cx={100} cy={64} rx={58} ry={9} fill="#4B2FD6" />
          <Path d={starPath(96, 36, 9, 4)} fill="#FFE14D" />
          <Path d={starPath(118, 52, 6, 2.6)} fill="#FFE14D" />
          <Path d={starPath(80, 56, 5, 2.2)} fill="#FFE14D" />
        </G>
      );
    case "propeller":
      return (
        <G>
          <Path d="M52 70 Q54 30 100 28 Q146 30 148 70 Q100 60 52 70 Z" fill="#4D8CFF" />
          <Path d="M76 32 Q100 26 124 32 L124 66 Q100 60 76 66 Z" fill="#FF4D4D" />
          <Rect x={97} y={10} width={6} height={20} rx={3} fill="#22223A" />
          <Path d="M100 12 Q74 2 60 12 Q76 20 100 12 Z" fill="#FFD43B" />
          <Path d="M100 12 Q126 2 140 12 Q124 20 100 12 Z" fill="#2BD67B" />
          <Circle cx={100} cy={12} r={5} fill="#22223A" />
        </G>
      );
    case "bunny":
      return (
        <G>
          <Ellipse cx={74} cy={34} rx={15} ry={34} fill="#FFFFFF" rotation={-14} origin="74,34" />
          <Ellipse cx={126} cy={34} rx={15} ry={34} fill="#FFFFFF" rotation={14} origin="126,34" />
          <Ellipse cx={74} cy={36} rx={7} ry={24} fill="#FFB8D9" rotation={-14} origin="74,36" />
          <Ellipse cx={126} cy={36} rx={7} ry={24} fill="#FFB8D9" rotation={14} origin="126,36" />
          <Path
            d="M58 64 Q100 46 142 64"
            stroke="#FF6FB1"
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      );
    case "crown":
      return (
        <G>
          <Path d="M58 68 L56 28 L79 48 L100 18 L121 48 L144 28 L142 68 Z" fill="#FFC300" />
          <Rect x={56} y={58} width={88} height={12} rx={4} fill="#E0A100" />
          <Circle cx={56} cy={28} r={6} fill="#FFE14D" />
          <Circle cx={100} cy={18} r={6} fill="#FFE14D" />
          <Circle cx={144} cy={28} r={6} fill="#FFE14D" />
          <Circle cx={78} cy={64} r={4.5} fill="#FF3B5C" />
          <Circle cx={100} cy={64} r={4.5} fill="#4D8CFF" />
          <Circle cx={122} cy={64} r={4.5} fill="#2BD67B" />
        </G>
      );
    default:
      return null;
  }
}

/** Dress-Up neckwear, under the mouth. */
function Neckwear({ id }) {
  switch (id) {
    case "bowtie":
      return (
        <G>
          <Path d="M100 180 L76 168 Q72 180 76 192 Z" fill="#FF3B5C" />
          <Path d="M100 180 L124 168 Q128 180 124 192 Z" fill="#FF3B5C" />
          <Rect x={93} y={173} width={14} height={14} rx={5} fill="#C81E3A" />
        </G>
      );
    case "scarf":
      return (
        <G>
          <Path d="M124 182 L136 214 L118 216 L112 186 Z" fill="#3F6DFF" />
          <Path d="M40 166 Q100 196 160 166 L162 180 Q100 212 38 180 Z" fill="#4D8CFF" />
          <Path
            d="M64 180 L68 192 M100 186 L100 198 M136 180 L132 192"
            stroke="#FFFFFF"
            strokeWidth={4}
            opacity={0.75}
          />
        </G>
      );
    case "bandana":
      return (
        <G>
          <Path d="M46 168 Q100 186 154 168 L100 208 Z" fill="#FF4D4D" />
          {[
            [86, 184],
            [114, 184],
            [100, 196],
            [72, 176],
            [128, 176],
          ].map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill="#FFFFFF" />
          ))}
        </G>
      );
    case "lei":
      return (
        <G>
          {[44, 60, 78, 100, 122, 140, 156].map((x, i) => {
            const y = 166 + Math.sin((i / 6) * Math.PI) * 18;
            const colour = ["#FF6FB1", "#FFD43B", "#FF8A3D", "#B97AFF"][i % 4];
            return (
              <G key={x}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <Circle
                    key={a}
                    cx={x + 6 * Math.cos((a * Math.PI) / 180)}
                    cy={y + 6 * Math.sin((a * Math.PI) / 180)}
                    r={5}
                    fill={colour}
                  />
                ))}
                <Circle cx={x} cy={y} r={3.5} fill="#FFF3B0" />
              </G>
            );
          })}
        </G>
      );
    case "medal":
      return (
        <G>
          <Path
            d="M78 166 L96 186 M122 166 L104 186"
            stroke="#3F6DFF"
            strokeWidth={9}
            strokeLinecap="round"
          />
          <Circle cx={100} cy={192} r={14} fill="#FFC300" />
          <Circle cx={100} cy={192} r={9} fill="#FFE14D" />
          <Path d={starPath(100, 192, 6, 2.6)} fill="#E0A100" />
        </G>
      );
    default:
      return null;
  }
}

/** Dress-Up eyewear. Drawn above the blinking eyes so it doesn't blink with them. */
function Eyewear({ id }) {
  switch (id) {
    case "specs":
      return (
        <G>
          <Circle cx={78} cy={EYE_Y} r={25} stroke="#7A3CFF" strokeWidth={5} fill="none" />
          <Circle cx={122} cy={EYE_Y} r={25} stroke="#7A3CFF" strokeWidth={5} fill="none" />
          <Path d="M96 108 Q100 102 104 108" stroke="#7A3CFF" strokeWidth={5} fill="none" />
        </G>
      );
    case "shades":
      return (
        <G>
          <Rect x={50} y={96} width={46} height={30} rx={12} fill="#141414" />
          <Rect x={104} y={96} width={46} height={30} rx={12} fill="#141414" />
          <Rect x={94} y={104} width={12} height={5} fill="#141414" />
          <Rect x={58} y={101} width={15} height={5} rx={2.5} fill="#FFFFFF" opacity={0.6} />
          <Rect x={112} y={101} width={15} height={5} rx={2.5} fill="#FFFFFF" opacity={0.6} />
        </G>
      );
    case "hearts":
      return (
        <G>
          <Path d={heartPath(78, EYE_Y, 15)} fill="#FF3B6B" />
          <Path d={heartPath(122, EYE_Y, 15)} fill="#FF3B6B" />
          <Circle cx={72} cy={EYE_Y - 6} r={3.5} fill="#FFFFFF" opacity={0.8} />
          <Circle cx={116} cy={EYE_Y - 6} r={3.5} fill="#FFFFFF" opacity={0.8} />
        </G>
      );
    case "monocle":
      return (
        <G>
          <Circle
            cx={122}
            cy={EYE_Y}
            r={24}
            stroke="#E0A100"
            strokeWidth={5}
            fill="#FFFFFF"
            fillOpacity={0.15}
          />
          <Path d="M144 122 Q156 150 140 172" stroke="#E0A100" strokeWidth={2.5} fill="none" />
        </G>
      );
    case "starry":
      return (
        <G>
          <Path d={starPath(78, EYE_Y, 26, 12)} fill="#FFC300" />
          <Path d={starPath(122, EYE_Y, 26, 12)} fill="#FFC300" />
          <Path d="M98 108 L102 108" stroke="#E0A100" strokeWidth={5} />
          <Path d={starPath(78, EYE_Y + 2, 14, 6.5)} fill="#141414" opacity={0.85} />
          <Path d={starPath(122, EYE_Y + 2, 14, 6.5)} fill="#141414" opacity={0.85} />
        </G>
      );
    default:
      return null;
  }
}

function TwoEyes({ y = EYE_Y }) {
  return (
    <G>
      <Ellipse cx={78} cy={y} rx={17} ry={20} fill="#FFFFFF" />
      <Ellipse cx={122} cy={y} rx={17} ry={20} fill="#FFFFFF" />
      <Circle cx={82} cy={y + 3} r={10} fill="#141414" />
      <Circle cx={118} cy={y + 3} r={10} fill="#141414" />
      <Circle cx={86} cy={y - 2} r={3.5} fill="#FFFFFF" />
      <Circle cx={122} cy={y - 2} r={3.5} fill="#FFFFFF" />
    </G>
  );
}

function Shades() {
  return (
    <G>
      <Rect x={52} y={98} width={44} height={28} rx={12} fill="#141414" />
      <Rect x={104} y={98} width={44} height={28} rx={12} fill="#141414" />
      <Rect x={94} y={106} width={12} height={5} fill="#141414" />
      <Rect x={60} y={103} width={14} height={5} rx={2.5} fill="#FFFFFF" opacity={0.6} />
      <Rect x={112} y={103} width={14} height={5} rx={2.5} fill="#FFFFFF" opacity={0.6} />
    </G>
  );
}

/** The buddies' eyes (they blink as one layer). */
function Eyes({ mood }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      {mood === "cool" ? <Shades /> : <TwoEyes />}
    </Svg>
  );
}

/** Birds have a beak instead of a mouth; it opens when cheering or amazed. */
function Beak({ mood }) {
  if (mood === "cheer" || mood === "wow") {
    return (
      <G>
        <Path d="M86 136 L114 136 L100 146 Z" fill="#FFB020" />
        <Path d="M90 150 L110 150 L100 158 Z" fill="#F29A00" />
        <Ellipse cx={100} cy={148} rx={7} ry={3} fill="#FF6B81" />
      </G>
    );
  }
  return <Path d="M88 134 L112 134 L100 150 Z" fill="#FFB020" />;
}

function Mouth({ mood }) {
  if (mood === "wow") {
    return <Ellipse cx={100} cy={152} rx={11} ry={13} fill="#5A1A1A" />;
  }
  if (mood === "cheer") {
    return (
      <G>
        <Path d="M76 144 Q100 178 124 144 Z" fill="#5A1A1A" />
        <Path d="M88 158 Q100 170 112 158 Q100 152 88 158 Z" fill="#FF6B81" />
      </G>
    );
  }
  return (
    <Path
      d="M84 146 Q100 162 116 146"
      stroke="#5A1A1A"
      strokeWidth={5}
      fill="none"
      strokeLinecap="round"
    />
  );
}

/** Colour matrix that paints everything one colour, keeping its alpha. */
function inkMatrix(hex) {
  const n = parseInt(hex.slice(1), 16);
  // Browsers run SVG filters in linear light, so convert the colour there first.
  const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    (Platform.OS === "web" ? toLinear(v / 255) : v / 255).toFixed(3),
  );
  return `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0`;
}

/**
 * @param {object} props
 * @param {keyof MASCOTS} props.variant
 * @param {number} props.size   width in px (height is 1.1×)
 * @param {"happy"|"cheer"|"wow"|"cool"} [props.mood]
 * @param {boolean} [props.animated]  idle bob + blink
 * @param {number} [props.delay]      offsets the idle loop so groups don't move in sync
 * @param {{hat?: string|null, face?: string|null, neck?: string|null}} [props.outfit]
 *        Dress-Up items (see games/wardrobe.js). A hat replaces ears, crests and tufts.
 * @param {string} [props.silhouette] a "#rrggbb" colour: draw the buddy (and outfit) as a
 *        solid shadow of that colour, with no face (Shadow Match).
 */
export default function Mascot({
  variant = "mochi",
  size = 120,
  mood = "happy",
  animated = true,
  delay = 0,
  outfit = null,
  silhouette = null,
}) {
  const kind = MASCOTS[variant] ? variant : (LEGACY_BUDDIES[variant] ?? "mochi");
  const c = MASCOTS[kind];
  const bird = BIRDS.has(kind);
  const bob = useSharedValue(0);
  const blink = useSharedValue(1);
  const armsUp = mood === "cheer";
  const hat = outfit?.hat ?? null;
  const face = outfit?.face ?? null;
  const neck = outfit?.neck ?? null;
  // Eyewear replaces the "cool" mood's built-in shades.
  const eyeMood = face && mood === "cool" ? "happy" : mood;

  useEffect(() => {
    if (!animated) return;
    bob.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true),
      ),
    );
    blink.set(
      withDelay(
        delay + 800,
        withRepeat(
          withSequence(
            withDelay(2600 + (delay % 900), withTiming(0.1, { duration: 70 })),
            withTiming(1, { duration: 90 }),
          ),
          -1,
        ),
      ),
    );
  }, [animated, bob, blink, delay]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -size * 0.05 * bob.value },
      { scaleX: 1 + 0.025 * (1 - bob.value) },
      { scaleY: 1 - 0.025 * (1 - bob.value) },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - 0.18 * bob.value }],
    opacity: 0.22 - 0.08 * bob.value,
  }));
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  // Unique per drawing: on web, SVG ids are page-global, and a duplicate id
  // inside a hidden screen would make this gradient resolve to nothing.
  const gid = `g-${kind}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const height = size * (H / W);

  return (
    <View style={{ width: size, height }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: height * 0.015,
            left: size * 0.22,
            width: size * 0.56,
            height: size * 0.07,
            borderRadius: size,
            backgroundColor: "#1A1A40",
          },
          shadowStyle,
        ]}
      />
      <Animated.View style={[{ width: size, height }, bodyStyle]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <RadialGradient id={gid} cx="38%" cy="30%" r="75%">
              <Stop offset="0" stopColor={c.light} />
              <Stop offset="0.55" stopColor={c.base} />
              <Stop offset="1" stopColor={c.dark} />
            </RadialGradient>
            {silhouette && (
              <Filter id={`${gid}-sil`}>
                <FeColorMatrix type="matrix" values={inkMatrix(silhouette)} />
              </Filter>
            )}
          </Defs>
          <G filter={silhouette ? `url(#${gid}-sil)` : undefined}>
            {/* ears, horns and antennae hide under a hat */}
            {!hat && <HeadParts variant={kind} c={c} />}
            <BackParts variant={kind} c={c} />
            {/* feet (birds' are orange) */}
            {
              <G>
                <Ellipse cx={74} cy={196} rx={22} ry={12} fill={bird ? "#FF9F1C" : c.dark} />
                <Ellipse cx={126} cy={196} rx={22} ry={12} fill={bird ? "#FF9F1C" : c.dark} />
              </G>
            }
            {/* arms */}
            {armsUp ? (
              // arms flung up and out to the sides, with little round hands
              <G>
                <Ellipse
                  cx={20}
                  cy={104}
                  rx={12}
                  ry={24}
                  fill={c.base}
                  rotation={-38}
                  origin="20,104"
                />
                <Ellipse
                  cx={180}
                  cy={104}
                  rx={12}
                  ry={24}
                  fill={c.base}
                  rotation={38}
                  origin="180,104"
                />
                <Circle cx={8} cy={86} r={11} fill={c.light} />
                <Circle cx={192} cy={86} r={11} fill={c.light} />
              </G>
            ) : (
              <G>
                <Ellipse
                  cx={30}
                  cy={140}
                  rx={13}
                  ry={22}
                  fill={c.dark}
                  rotation={20}
                  origin="30,140"
                />
                <Ellipse
                  cx={170}
                  cy={140}
                  rx={13}
                  ry={22}
                  fill={c.dark}
                  rotation={-20}
                  origin="170,140"
                />
              </G>
            )}
            {/* body */}
            <Path d={BODY} fill={`url(#${gid})`} />
            {/* gloss */}
            <Ellipse
              cx={70}
              cy={80}
              rx={20}
              ry={11}
              fill="#FFFFFF"
              opacity={0.5}
              rotation={-25}
              origin="70,80"
            />
            <FrontParts variant={kind} c={c} />
            {/* cheeks */}
            <Ellipse cx={56} cy={140} rx={12} ry={7} fill="#FF5C8A" opacity={0.35} />
            <Ellipse cx={144} cy={140} rx={12} ry={7} fill="#FF5C8A" opacity={0.35} />
            {bird ? <Beak mood={mood} /> : <Mouth mood={mood} />}
            {neck && <Neckwear id={neck} />}
            {hat && <Hat id={hat} />}
            {/* a shadow has no eyes, but its glasses still change its outline */}
            {silhouette && face && <Eyewear id={face} />}
          </G>
        </Svg>
        {!silhouette && (
          <Animated.View
            style={[
              { position: "absolute", top: 0, left: 0, width: size, height },
              { transformOrigin: `50% ${(EYE_Y / H) * 100}%` },
              eyeStyle,
            ]}
          >
            <Eyes mood={eyeMood} />
          </Animated.View>
        )}
        {face && !silhouette && (
          <Svg
            width={size}
            height={height}
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <Eyewear id={face} />
          </Svg>
        )}
      </Animated.View>
    </View>
  );
}
