/**
 * Every game in the hub. Add a new game by creating a route in
 * src/app/games/<id>.js and adding an entry here.
 */
export const GAMES = [
  {
    id: "tap-rush",
    route: "/games/tap-rush",
    title: "Tap Rush",
    tagline: "Pop orbs fast, chain combos",
    emoji: "⚡",
    mascot: "zip",
    colors: ["#FFB347", "#FF6B3D"],
    accent: "#FF7A1A",
    unit: "pts",
    lowerIsBetter: false,
  },
  {
    id: "memory",
    route: "/games/memory",
    title: "Memory Flip",
    tagline: "Match pairs in fewest moves",
    emoji: "🧠",
    mascot: "bloop",
    colors: ["#7FB2FF", "#4D6BFF"],
    accent: "#3F6DFF",
    unit: "moves",
    lowerIsBetter: true,
  },
  {
    id: "fusion",
    route: "/games/fusion",
    title: "Fusion",
    tagline: "Swipe, fuse, grow big tiles",
    emoji: "🔮",
    mascot: "gloop",
    colors: ["#6DECB9", "#1FBF7A"],
    accent: "#13A866",
    unit: "pts",
    lowerIsBetter: false,
  },
];

export const getGame = (id) => GAMES.find((g) => g.id === id);
