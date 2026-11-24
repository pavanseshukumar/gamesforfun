/**
 * Blob Launch levels in the 400×640 logical world (ground top at y = 600).
 * Built from a few helpers so each level reads like a sketch.
 * Every level is checked by __tests__/blob.test.js: it must stand still on its
 * own and be clearable within 3 shots.
 */
import { GRUMP_R, WORLD } from "./world";

const G = WORLD.ground;
const PILLAR_W = 14;
const PLANK_H = 14;

/** A hut: two pillars and a roof plank, standing on `floor`. Returns blocks + roof top y. */
function hut(cx, width, height, type = "wood", floor = G) {
  const blocks = [
    { x: cx - width / 2 + PILLAR_W / 2, y: floor - height / 2, w: PILLAR_W, h: height, type },
    { x: cx + width / 2 - PILLAR_W / 2, y: floor - height / 2, w: PILLAR_W, h: height, type },
    { x: cx, y: floor - height - PLANK_H / 2, w: width + 10, h: PLANK_H, type },
  ];
  return { blocks, top: floor - height - PLANK_H };
}

const box = (cx, size, type = "wood", floor = G) => ({
  x: cx,
  y: floor - size / 2,
  w: size,
  h: size,
  type,
});
const pillar = (cx, height, type = "wood", floor = G) => ({
  x: cx,
  y: floor - height / 2,
  w: PILLAR_W,
  h: height,
  type,
});
const grumpOn = (x, floor) => ({ x, y: floor - GRUMP_R - 0.5 });

function level(name, parts) {
  return {
    name,
    blocks: parts.flatMap((p) => p.blocks ?? []),
    grumps: parts.flatMap((p) => p.grumps ?? []),
    ledges: parts.flatMap((p) => p.ledges ?? []),
  };
}

const l1 = (() => {
  const h = hut(300, 90, 70);
  return level("Hello, Grumps", [h, { grumps: [grumpOn(300, h.top), grumpOn(370, G)] }]);
})();

const l2 = (() => {
  const a = hut(250, 76, 60);
  const b = hut(340, 76, 80);
  return level("Twin Huts", [a, b, { grumps: [grumpOn(250, a.top), grumpOn(340, b.top)] }]);
})();

const l3 = (() => {
  const low = hut(310, 110, 60);
  const high = hut(310, 70, 50, "wood", low.top);
  return level("Two Storeys", [low, high, { grumps: [grumpOn(310, G), grumpOn(310, high.top)] }]);
})();

const l4 = (() => {
  const ledgeTop = 420;
  const h = hut(250, 70, 50);
  return level("High Ledge", [
    h,
    {
      ledges: [{ x: 345, y: ledgeTop + 8, w: 110, h: 16 }],
      blocks: [pillar(318, 44, "wood", ledgeTop)],
      grumps: [grumpOn(250, h.top), grumpOn(355, ledgeTop)],
    },
  ]);
})();

const l5 = (() => {
  const a = hut(240, 70, 70, "ice");
  const b = hut(330, 90, 50, "ice");
  const c = hut(330, 60, 40, "ice", b.top);
  return level("Slippery Slope", [
    a,
    b,
    c,
    { grumps: [grumpOn(240, a.top), grumpOn(330, G), grumpOn(330, c.top)] },
  ]);
})();

const l6 = (() => {
  const fort = hut(320, 120, 70, "stone");
  const roof = hut(320, 60, 40, "wood", fort.top);
  return level("Stone Fort", [
    fort,
    roof,
    { grumps: [grumpOn(300, G), grumpOn(340, G), grumpOn(320, roof.top)] },
  ]);
})();

const l7 = (() => {
  const s = 34;
  const row1 = [262, 298, 334, 370].map((x) => box(x, s));
  const row2 = [280, 316, 352].map((x) => box(x, s, "wood", G - s));
  const row3 = [298, 334].map((x) => box(x, s, "wood", G - 2 * s));
  return level("Box Pyramid", [
    { blocks: [...row1, ...row2, ...row3] },
    { grumps: [grumpOn(316, G - 3 * s), grumpOn(230, G)] },
  ]);
})();

const l8 = (() => {
  const a = hut(320, 70, 70);
  const b = hut(320, 70, 60, "wood", a.top);
  const c = hut(320, 70, 50, "wood", b.top);
  // One grump on top, one tucked inside the middle storey.
  return level("Wobbly Tower", [a, b, c, { grumps: [grumpOn(320, c.top), grumpOn(320, a.top)] }]);
})();

const l9 = (() => {
  const lowTop = 490;
  const highTop = 400;
  return level("Cliffhangers", [
    {
      ledges: [
        { x: 250, y: lowTop + 8, w: 90, h: 16 },
        { x: 350, y: highTop + 8, w: 90, h: 16 },
      ],
      blocks: [pillar(222, 40, "wood", lowTop), pillar(318, 28, "wood", highTop)],
      grumps: [grumpOn(262, lowTop), grumpOn(362, highTop), grumpOn(330, G)],
    },
  ]);
})();

const l10 = (() => {
  const base = hut(300, 140, 60, "stone");
  const left = hut(266, 64, 50, "wood", base.top);
  const right = hut(334, 64, 50, "ice", base.top);
  const cap = hut(300, 50, 36, "wood", right.top);
  return level("Grump Castle", [
    base,
    left,
    right,
    {
      blocks: cap.blocks.map((b) => ({ ...b, x: b.x + 34 })),
      grumps: [
        grumpOn(300, G),
        grumpOn(266, left.top),
        grumpOn(334, base.top),
        grumpOn(334, cap.top),
      ],
    },
  ]);
})();

export const LEVELS = [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10];
