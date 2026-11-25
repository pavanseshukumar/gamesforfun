import { addRandomTile, canMove, maxTile, move, newBoard, SIZE } from "../src/games/fusion/logic";

/** Builds tiles for one row (r = 0) from values; 0 = empty. */
const row = (values) =>
  values.map((v, c) => v && { id: 100 + c, value: v, r: 0, c }).filter(Boolean);

/** Alive values of row 0, left to right. */
const rowValues = (tiles) => {
  const out = Array(SIZE).fill(0);
  tiles.filter((t) => !t.dead && t.r === 0).forEach((t) => (out[t.c] = t.value));
  return out;
};

describe("Fusion move()", () => {
  test("each tile merges at most once per move", () => {
    const res = move(row([2, 2, 2, 2]), "left");
    expect(rowValues(res.tiles)).toEqual([4, 4, 0, 0]);
    expect(res.gained).toBe(8);
    expect(res.moved).toBe(true);
  });

  test("merges toward the swipe direction", () => {
    expect(rowValues(move(row([2, 2, 4, 0]), "left").tiles)).toEqual([4, 4, 0, 0]);
    expect(rowValues(move(row([2, 2, 4, 0]), "right").tiles)).toEqual([0, 0, 4, 4]);
  });

  test("does not count a no-op as a move", () => {
    expect(move(row([4, 0, 0, 0]), "left").moved).toBe(false);
  });

  test("vertical moves use columns", () => {
    const res = move(row([0, 0, 0, 8]), "down");
    expect(res.moved).toBe(true);
    expect(res.tiles[0]).toMatchObject({ r: SIZE - 1, c: 3, value: 8 });
  });

  test("the consumed tile is kept as a dead tile in the same cell", () => {
    const res = move(row([2, 2, 0, 0]), "left");
    const dead = res.tiles.filter((t) => t.dead);
    expect(dead).toHaveLength(1);
    expect(dead[0]).toMatchObject({ r: 0, c: 0 });
    expect(res.tiles.find((t) => t.merged)).toMatchObject({ value: 4, r: 0, c: 0 });
  });
});

describe("Fusion board helpers", () => {
  test("a new board has two tiles", () => {
    expect(newBoard()).toHaveLength(2);
  });

  test("addRandomTile fills an empty cell with a 2 or 4", () => {
    const board = addRandomTile([], () => 0.5);
    expect(board).toHaveLength(1);
    expect([2, 4]).toContain(board[0].value);
  });

  test("canMove is false only for a full board with no neighbours to merge", () => {
    const checker = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        checker.push({ id: r * 4 + c, value: (r + c) % 2 ? 2 : 4, r, c });
    expect(canMove(checker)).toBe(false);
    checker[0] = { ...checker[0], value: 2 }; // now matches its right neighbour
    expect(canMove(checker)).toBe(true);
  });

  test("maxTile ignores dead tiles", () => {
    expect(maxTile([{ value: 64 }, { value: 128, dead: true }])).toBe(64);
  });
});
