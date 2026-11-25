/**
 * Design tokens for the bright "playground" look: each screen gets its own
 * sunny gradient, ink-black type and white cards.
 */
export const INK = "#141414";

export const BACKDROPS = {
  home: ["#FFF04D", "#E4F98A", "#F6FDE4"],
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
