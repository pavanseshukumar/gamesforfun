/** XP → level curve and rank names. */
export const xpForLevel = (level) => Math.round(60 * Math.pow(level - 1, 1.6));

export function levelInfo(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - floor, needed: next - floor, toNext: next - xp };
}

const RANKS = [
  { min: 1, name: "Rookie", emoji: "🌱" },
  { min: 3, name: "Bronze Explorer", emoji: "🥉" },
  { min: 5, name: "Silver Explorer", emoji: "🥈" },
  { min: 8, name: "Gold Explorer", emoji: "🥇" },
  { min: 12, name: "Diamond Legend", emoji: "💎" },
];

export const rankFor = (level) => [...RANKS].reverse().find((r) => level >= r.min);

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
