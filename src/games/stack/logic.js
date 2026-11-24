/**
 * Stack Tower rules. A block is { x, w }: its left edge and width in px.
 *
 * Dropping a block onto the one below keeps only the overlap; the rest is
 * sliced off. A drop within PERFECT_TOLERANCE snaps into place with no cut,
 * and every PERFECTS_TO_GROW perfects in a row widens the block a little.
 */
export const PERFECT_TOLERANCE = 5;
export const PERFECTS_TO_GROW = 3;
export const GROW_BY = 10;

/**
 * @param {{x:number,w:number}} below  the top block of the tower
 * @param {{x:number,w:number}} moving the block being dropped
 * @param {number} streak  perfects in a row before this drop
 * @param {number} maxW    widest a block may grow back to
 * @returns {{ miss: true } | { miss: false, perfect: boolean, placed: {x,w}, cut: {x,w}|null, streak: number, grew: boolean }}
 */
export function dropBlock(below, moving, streak = 0, maxW = Infinity) {
  const left = Math.max(below.x, moving.x);
  const right = Math.min(below.x + below.w, moving.x + moving.w);
  const overlap = right - left;
  if (overlap <= 0) return { miss: true };

  if (Math.abs(moving.x - below.x) <= PERFECT_TOLERANCE) {
    const nextStreak = streak + 1;
    let placed = { x: below.x, w: below.w };
    let grew = false;
    if (nextStreak % PERFECTS_TO_GROW === 0 && below.w < maxW) {
      const w = Math.min(maxW, below.w + GROW_BY);
      placed = { x: below.x - (w - below.w) / 2, w };
      grew = true;
    }
    return { miss: false, perfect: true, placed, cut: null, streak: nextStreak, grew };
  }

  const placed = { x: left, w: overlap };
  // The sliced piece hangs off whichever side the moving block overshot.
  const cut =
    moving.x < below.x
      ? { x: moving.x, w: below.x - moving.x }
      : { x: below.x + below.w, w: moving.x + moving.w - (below.x + below.w) };
  return { miss: false, perfect: false, placed, cut, streak: 0, grew: false };
}

/** Sideways speed (px/s) for the block at `level`. */
export const speedFor = (level) => Math.min(520, 170 + level * 9);

/** Candy colours that drift around the colour wheel as the tower grows. */
export function colorFor(level) {
  const hue = (330 + level * 11) % 360;
  return {
    top: `hsl(${hue}, 90%, 74%)`,
    face: `hsl(${hue}, 82%, 63%)`,
    side: `hsl(${hue}, 70%, 50%)`,
  };
}

/** Score for a run: one point per block, plus one extra per perfect. */
export const scoreFor = (height, perfects) => height + perfects;
