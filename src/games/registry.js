/**
 * Every game in the hub. Add a new game by creating a route in
 * src/app/games/<id>.js and adding an entry here.
 */
export const GAMES = [
  {
    id: "tap-rush",
    route: "/games/tap-rush",
    title: "Tap Rush",
    tagline: "Pop the orbs before they fade. Chain hits for combos.",
    emoji: "⚡",
    colors: ["#FF6B5B", "#FF9F43"],
    accent: "#FF6B5B",
    unit: "pts",
    lowerIsBetter: false,
  },
  {
    id: "memory",
    route: "/games/memory",
    title: "Memory Flip",
    tagline: "Flip cards and match every pair in as few moves as you can.",
    emoji: "🧠",
    colors: ["#A26BFA", "#F25FB4"],
    accent: "#A26BFA",
    unit: "moves",
    lowerIsBetter: true,
  },
  {
    id: "fusion",
    route: "/games/fusion",
    title: "Fusion",
    tagline: "Swipe to fuse matching numbers and grow the biggest tile.",
    emoji: "🔮",
    colors: ["#22C9A8", "#3B82F6"],
    accent: "#22C9A8",
    unit: "pts",
    lowerIsBetter: false,
  },
];

export const getGame = (id) => GAMES.find((g) => g.id === id);
