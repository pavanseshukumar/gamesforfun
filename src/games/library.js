/**
 * Game library helpers: how many levels each game has, the player's progress
 * in it, and the sort orders for the All Games screen.
 */
import { LEVELS as BLOB_LEVELS } from "./blob/levels";
import { CHALLENGES } from "./challenges";
import { LEVEL_NAMES as MAZE_LEVELS } from "./maze/levels";
import { LEVEL_NAMES as PIPE_LEVELS } from "./pipes/levels";
import { LEVELS as SLIDER_LEVELS } from "./slider/levels";

const LEVEL_GAMES = {
  "blob-launch": BLOB_LEVELS.length,
  slider: SLIDER_LEVELS.length,
  maze: MAZE_LEVELS.length,
  pipes: PIPE_LEVELS.length,
};

/** Number of levels a game has (level games and challenge levels alike). */
export const levelCountFor = (gameId) => LEVEL_GAMES[gameId] ?? CHALLENGES[gameId]?.length ?? 0;

/** Every level in the app. */
export const totalLevelCount = (games) => games.reduce((n, g) => n + levelCountFor(g.id), 0);

/** The player's progress in one game, from the store's state. */
export function progressFor(game, { best = {}, plays = {}, levels = {}, lastPlayed = {} }) {
  const lv = Object.values(levels?.[game.id] ?? {});
  const count = levelCountFor(game.id);
  return {
    best: best[game.id] ?? null,
    plays: plays[game.id] ?? 0,
    stars: lv.reduce((n, l) => n + (l?.stars ?? 0), 0),
    maxStars: count * 3,
    cleared: lv.filter((l) => l?.stars > 0).length,
    levels: count,
    lastPlayed: lastPlayed?.[game.id] ?? 0,
    isNew: !(plays[game.id] > 0),
  };
}

export const SORTS = [
  { id: "order", label: "Featured" },
  { id: "recent", label: "Recent" },
  { id: "az", label: "A–Z" },
];

/** Filters by category ("all" for everything) and sorts. Never mutates `games`. */
export function arrange(games, state, { category = "all", sort = "order" } = {}) {
  const list = games.filter((g) => category === "all" || g.category === category);
  if (sort === "az") return [...list].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "recent") {
    // Most recently played first; never-played games keep their featured order at the end.
    return list
      .map((g, i) => ({ g, i, t: state.lastPlayed?.[g.id] ?? 0 }))
      .sort((a, b) => b.t - a.t || a.i - b.i)
      .map((x) => x.g);
  }
  return list;
}
