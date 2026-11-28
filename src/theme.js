/**
 * Design tokens for the bright "playground" look: each screen gets its own
 * bright gradient, ink-black type and white cards.
 */
export const INK = "#141414";

export const BACKDROPS = {
  // Cotton candy: a punchy pink under the big greeting, fading to lilac and baby blue.
  home: ["#FFA3D4", "#E5C9FF", "#D6EDFF"],
  // Launch splash: the same cotton candy as Home, so the splash melts into it.
  splash: ["#FFA3D4", "#E5C9FF", "#D6EDFF"],
  // Intro: a calm sky blue fading to soft lilac.
  welcome: ["#5EB6FF", "#A3D8FF", "#EEE9FF"],
  profile: ["#6FB1FF", "#AFD3FF", "#EAF4FF"],
  awards: ["#A8EE5B", "#D6F9A3", "#F4FFE6"],
  settings: ["#CDB8FF", "#E6DCFF", "#FAF7FF"],
  wardrobe: ["#FF9ED2", "#FFD1EA", "#FFF4FA"],
  "tap-rush": ["#FFC94A", "#FFE5A0", "#FFF8E5"],
  memory: ["#8FBDFF", "#C7DEFF", "#F0F6FF"],
  fusion: ["#6DECB9", "#C2F8DD", "#EFFFF7"],
  bounce: ["#FF9BCB", "#FFD0E6", "#FFF2F8"],
  "color-catch": ["#FFB49A", "#FFDCCB", "#FFF5EF"],
  daily: ["#8C7BFF", "#C3B8FF", "#F1EEFF"],
  "word-pop": ["#7FE3FF", "#C4F3FF", "#EFFCFF"],
  stack: ["#C9B6FF", "#FFD6E8", "#FFF4EC"],
  "blob-launch": ["#8FD3FF", "#CDEBFF", "#F2FAFF"],
  slider: ["#FFD39A", "#FFE9CC", "#FFF8EE"],
  maze: ["#9FF0D6", "#D2FAEE", "#F2FFFB"],
  slice: ["#FFB3D1", "#FFDDEA", "#FFF5F9"],
  "quick-math": ["#C2F59A", "#E3FBCB", "#F7FFF0"],
  pipes: ["#8FE0FF", "#CFF0FF", "#F1FBFF"],
  lights: ["#A99BFF", "#D6CEFF", "#F4F1FF"],
  paint: ["#FFC2B3", "#FFE0D6", "#FFF6F2"],
  balance: ["#A8EBD3", "#D4F7EA", "#F2FFFA"],
  odd: ["#FFC79E", "#FFE2CF", "#FFF7F1"],
  "hop-across": ["#7EDFF2", "#BFF0EC", "#F0FFF9"],
  feed: ["#FFC98F", "#FFE4C4", "#FFF8EE"],
  parade: ["#E9B3FF", "#F6DAFF", "#FFF4FE"],
  burrow: ["#F7C58E", "#FBE2C4", "#FFF8EF"],
  shadow: ["#B9B6E8", "#DCDAF5", "#F6F5FF"],
  spot: ["#B6EC9A", "#DDF7CC", "#F5FFF0"],
};

/** Shared soft shadow for white cards. */
export const cardShadow = {
  shadowColor: "#1A1A40",
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

/** Anton needs an explicit line height or it clips on Android. */
export const display = (size) => ({
  fontFamily: "Anton_400Regular",
  fontSize: size,
  lineHeight: Math.round(size * 1.12),
  color: INK,
  includeFontPadding: false,
  textTransform: "uppercase",
});
