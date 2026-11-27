/** The buddy cast: name and colours (drawn by components/Mascot.js). */
export const MASCOTS = {
  mochi: { name: "Mochi", base: "#B08CFF", light: "#DCCBFF", dark: "#7E58E0" },
  bun: { name: "Bun", base: "#FFB3CF", light: "#FFE3EE", dark: "#E57FA6" },
  rex: { name: "Rex", base: "#4FCF7A", light: "#A9F2C2", dark: "#239A50" },
  pom: { name: "Pom", base: "#D2905A", light: "#F2C79E", dark: "#A3622F" },
  pengu: { name: "Pengu", base: "#2F3E6E", light: "#5D6FA8", dark: "#1B2650" },
  blink: { name: "Blink", base: "#9C5CFF", light: "#CBA8FF", dark: "#6A2FD6" },
  bolt: { name: "Bolt", base: "#8FB4D9", light: "#E3EEF8", dark: "#5579A0" },
  zuzu: { name: "Zuzu", base: "#9BE54A", light: "#D8FFA8", dark: "#5FB018" },
  spike: { name: "Spike", base: "#FF7A45", light: "#FFC09E", dark: "#E04E1A" },
  wobble: { name: "Wobble", base: "#5CD6E6", light: "#C2F6FF", dark: "#2AA4C2" },
};

/**
 * Buddy ids from the app's first cast, mapped to the buddies that replaced
 * them. Used to move saved choices across (see the store's migrate) and to
 * draw something sensible if an old id ever reaches the Mascot component.
 */
export const LEGACY_BUDDIES = {
  zip: "spike",
  bloop: "bolt",
  gloop: "rex",
  pip: "bun",
  sunny: "pom",
};
