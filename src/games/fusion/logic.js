/**
 * Pure game logic for Fusion (a sliding number-merge puzzle).
 *
 * Tiles carry stable ids so the UI can animate them sliding. When two tiles
 * merge, the leading tile survives with the doubled value (`merged: true`) and
 * the other slides into the same cell flagged `dead: true`. The UI fades dead
 * tiles out, and they are dropped at the start of the next move.
 */
export const SIZE = 4;

let nextId = 1;

const makeTile = (value, r, c) => ({ id: nextId++, value, r, c, isNew: true });

export function emptyCells(tiles) {
  const taken = new Set(tiles.filter((t) => !t.dead).map((t) => t.r * SIZE + t.c));
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) if (!taken.has(r * SIZE + c)) cells.push([r, c]);
  }
  return cells;
}

export function addRandomTile(tiles, rand = Math.random) {
  const cells = emptyCells(tiles);
  if (!cells.length) return tiles;
  const [r, c] = cells[Math.floor(rand() * cells.length)];
  return [...tiles, makeTile(rand() < 0.9 ? 2 : 4, r, c)];
}

export function newBoard(rand = Math.random) {
  return addRandomTile(addRandomTile([], rand), rand);
}

/** Cell at position `i` along `line`, counted from the edge tiles slide toward. */
function cellAt(dir, line, i) {
  switch (dir) {
    case "left":
      return [line, i];
    case "right":
      return [line, SIZE - 1 - i];
    case "up":
      return [i, line];
    case "down":
      return [SIZE - 1 - i, line];
    default:
      throw new Error(`Unknown direction: ${dir}`);
  }
}

/** Slides every tile toward `dir`. Returns { tiles, moved, gained }. */
export function move(tiles, dir) {
  const alive = tiles.filter((t) => !t.dead).map((t) => ({ ...t, merged: false, isNew: false }));
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  alive.forEach((t) => {
    grid[t.r][t.c] = t;
  });

  const out = [];
  let moved = false;
  let gained = 0;

  for (let line = 0; line < SIZE; line++) {
    const cells = Array.from({ length: SIZE }, (_, i) => cellAt(dir, line, i));
    const lineTiles = cells.map(([r, c]) => grid[r][c]).filter(Boolean);

    let target = 0;
    for (let i = 0; i < lineTiles.length; i++) {
      const tile = lineTiles[i];
      const next = lineTiles[i + 1];
      const [r, c] = cells[target];

      if (next && next.value === tile.value) {
        const value = tile.value * 2;
        gained += value;
        out.push({ ...tile, r, c, value, merged: true });
        out.push({ ...next, r, c, dead: true });
        moved = true;
        i++;
      } else {
        if (tile.r !== r || tile.c !== c) moved = true;
        out.push({ ...tile, r, c });
      }
      target++;
    }
  }

  return { tiles: out, moved, gained };
}

export function canMove(tiles) {
  const alive = tiles.filter((t) => !t.dead);
  if (alive.length < SIZE * SIZE) return true;
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  alive.forEach((t) => {
    grid[t.r][t.c] = t.value;
  });
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

export const maxTile = (tiles) => tiles.reduce((m, t) => (t.dead ? m : Math.max(m, t.value)), 0);
