/** The buddy cast: name and colours (drawn by components/Mascot.js). */
export const MASCOTS = {
  mochi: { name: "Mochi", base: "#B08CFF", light: "#DCCBFF", dark: "#7E58E0" },
  bun: { name: "Bun", base: "#FFB3CF", light: "#FFE3EE", dark: "#E57FA6" },
  rex: { name: "Rex", base: "#4FCF7A", light: "#A9F2C2", dark: "#239A50" },
  pom: { name: "Pom", base: "#D2905A", light: "#F2C79E", dark: "#A3622F" },
  pengu: { name: "Pengu", base: "#2F3E6E", light: "#5D6FA8", dark: "#1B2650" },
  kit: { name: "Kit", base: "#FF8A3D", light: "#FFC9A0", dark: "#E0601A" },
  peep: { name: "Peep", base: "#FFD23F", light: "#FFF3A8", dark: "#E8A400" },
  koko: { name: "Koko", base: "#9FAEC4", light: "#E2E8F2", dark: "#6B7B96" },
  hop: { name: "Hop", base: "#7ED957", light: "#C8F7A8", dark: "#45A62A" },
  hoot: { name: "Hoot", base: "#3FBFC9", light: "#B4F0F2", dark: "#1F8C99" },
};

/**
 * Buddy ids from the app's first cast, mapped to the buddies that replaced
 * them (every buddy is now an animal). Used to move saved choices across (see the store's migrate) and to
 * draw something sensible if an old id ever reaches the Mascot component.
 */
export const LEGACY_BUDDIES = {
  // the first cast
  zip: "kit",
  bloop: "koko",
  gloop: "rex",
  pip: "bun",
  sunny: "pom",
  // the non-animal buddies of the second cast
  blink: "peep",
  bolt: "koko",
  zuzu: "hop",
  spike: "kit",
  wobble: "hoot",
};
