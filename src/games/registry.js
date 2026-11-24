import { mascotOfDay } from "./daily/logic";

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
  {
    id: "bounce",
    route: "/games/bounce",
    title: "Bounce Buddy",
    tagline: "Time your hops, climb the sky",
    emoji: "🦘",
    mascot: "pip",
    colors: ["#FF9BCB", "#FF3D8B"],
    accent: "#FF3D8B",
    unit: "pts",
    lowerIsBetter: false,
  },
  {
    id: "color-catch",
    route: "/games/color-catch",
    title: "Color Catch",
    tagline: "Tilt to catch the right colour",
    emoji: "🎨",
    mascot: "sunny",
    colors: ["#FFD966", "#FF8A3D"],
    accent: "#FF8A3D",
    unit: "pts",
    lowerIsBetter: false,
  },
  {
    id: "word-pop",
    route: "/games/word-pop",
    title: "Word Pop",
    tagline: "Spell words from rising letters",
    emoji: "🔤",
    mascot: "bloop",
    colors: ["#7FE3FF", "#1BA9D9"],
    accent: "#1BA9D9",
    unit: "pts",
    lowerIsBetter: false,
  },
  {
    id: "stack",
    route: "/games/stack",
    title: "Stack Tower",
    tagline: "Drop, slice, stack to the sky",
    emoji: "🧱",
    mascot: "gloop",
    colors: ["#C9B6FF", "#FF7BAC"],
    accent: "#8A5CFF",
    unit: "pts",
    lowerIsBetter: false,
  },
  {
    id: "blob-launch",
    route: "/games/blob-launch",
    title: "Blob Launch",
    tagline: "Fling Zip, topple the Grumps",
    emoji: "🎯",
    mascot: "zip",
    colors: ["#8FD3FF", "#FF8FB1"],
    accent: "#FF5C8A",
    unit: "stars",
    lowerIsBetter: false,
  },
  {
    // The daily puzzle has its own banner on Home, so it stays out of the
    // carousel and quick play. Its mascot changes every day.
    id: "daily",
    route: "/games/daily",
    title: "Daily Puzzle",
    tagline: "One new picture puzzle a day",
    emoji: "🧩",
    mascot: "bloop",
    daily: true,
    colors: ["#B3A6FF", "#6B5CFF"],
    accent: "#6B5CFF",
    unit: "moves",
    lowerIsBetter: true,
  },
];

/** Games that appear in the carousel and quick play. */
export const ARCADE = GAMES.filter((g) => !g.daily);

export const getGame = (id) => GAMES.find((g) => g.id === id);

/** Mascot shown for a game; the daily puzzle's changes every day. */
export const mascotFor = (game) => (game.daily ? mascotOfDay() : game.mascot);
