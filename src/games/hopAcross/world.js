/**
 * Hop Across: Hop the frog crosses a river one row of lily pads at a time.
 * Pads drift sideways; a tap hops straight ahead to the next row and lands
 * if a pad is underneath. The pad you stand on slowly sinks, and a pad that
 * drifts off the edge carries you with it, so you can't wait forever.
 *
 * React-free so the screen and the tests run the same rules. World units:
 * the river is W wide; rows are ROW_H apart (row 0 is the starting bank).
 */
import { createRng, hashString } from "../../lib/random";

export const W = 400;
export const ROW_H = 100;
export const STEP_S = 1 / 60;
export const HOP_S = 0.3; // airtime of one hop
export const MAX_PADS = 3; // per row
export const VIS_ROWS = 8; // rows the sprites cover: one behind, six ahead
const EDGE = 12; // how far past the bank a pad may carry you
const CATCH = 6; // landing forgiveness past a pad's rim

export const HOP_DEFAULTS = {
  duration: 0, // seconds; 0 = until you fall in
  speedScale: 1, // how fast pads drift
  padScale: 1, // pad size
  sinkScale: 1, // how long a pad holds you (<1 sinks sooner)
  flyRate: 1, // how often flies sit on pads
  startRow: 0, // difficulty starts as if this many rows were already crossed
};

/** Points: one per row, five per fly. */
export const FLY_POINTS = 5;

/** The deterministic layout of row r (r ≥ 1). */
export function rowSpec(seed, r, cfg) {
  const rand = createRng(hashString(`hop:${seed}:${r}`));
  const d = Math.min(1, (r + cfg.startRow) / 40); // difficulty 0 → 1
  const count = d < 0.3 ? 3 : d < 0.65 ? 2 + (rand() < 0.4 ? 1 : 0) : 1 + (rand() < 0.6 ? 1 : 0);
  const w = Math.max(58, (112 - 42 * d) * cfg.padScale);
  const speed = (38 + 78 * d) * cfg.speedScale * (0.8 + rand() * 0.4);
  // Neighbouring rows always drift opposite ways, so a landing spot always comes round.
  const dir = r % 2 ? 1 : -1;
  const span = W + 2 * w;
  const phase = rand() * span;
  const fly = rand() < 0.22 * cfg.flyRate ? Math.floor(rand() * count) : -1;
  const sink = (3.6 - 1.2 * d) * cfg.sinkScale; // seconds a pad holds you
  return { count, w, v: speed * dir, span, phase, fly, sink };
}

/** Centre x of pad j in a row at time t. */
export function padX(spec, j, t) {
  const u =
    (((spec.phase + (j * spec.span) / spec.count + spec.v * t) % spec.span) + spec.span) %
    spec.span;
  return u - spec.w;
}

export function createHopWorld(cfg = HOP_DEFAULTS, seed = 1) {
  const c = { ...HOP_DEFAULTS, ...cfg };
  const specs = new Map();
  const spec = (r) => {
    if (!specs.has(r)) specs.set(r, rowSpec(seed, r, c));
    return specs.get(r);
  };

  let t = 0;
  let row = 0; // the row Hop is on (or hopping from)
  let pad = -1; // pad index on that row; -1 = the bank
  let dx = 0; // offset from the pad's centre
  let x = W / 2; // on the bank / mid-hop
  let onPad = 0; // seconds on the current pad
  let hop = null; // { t } while airborne
  let flies = 0;
  const eaten = new Set(); // "row:pad" flies already eaten
  let cam = 0; // camera y (world), eases after Hop
  let over = false;
  let reason = null; // "splash" | "sank" | "swept" | "time"
  let pending = [];

  const frogX = () => (pad < 0 || hop ? x : padX(spec(row), pad, t) + dx);
  /** Pad index under x on row r at time tt, or -1. */
  const padUnder = (r, xx, tt) => {
    const s = spec(r);
    for (let j = 0; j < s.count; j++) {
      if (Math.abs(xx - padX(s, j, tt)) <= s.w / 2 + CATCH) return j;
    }
    return -1;
  };
  const end = (why) => {
    over = true;
    reason = why;
    pending.push({ type: why });
  };

  return {
    config: c,
    spec,
    padUnder,

    /** Starts a hop (ignored mid-air or after the round). */
    hop() {
      if (over || hop) return false;
      x = frogX();
      hop = { t: 0 };
      pending.push({ type: "jump" });
      return true;
    },

    /** Advances one fixed step; returns events since the last call. */
    step() {
      if (over) return [];
      t += STEP_S;
      if (hop) {
        hop.t += STEP_S;
        if (hop.t >= HOP_S) {
          hop = null;
          row += 1;
          const j = padUnder(row, x, t);
          if (j < 0) {
            pad = -1;
            end("splash");
          } else {
            pad = j;
            dx = x - padX(spec(row), j, t);
            onPad = 0;
            const key = `${row}:${j}`;
            if (spec(row).fly === j && !eaten.has(key)) {
              eaten.add(key);
              flies += 1;
              pending.push({ type: "fly" });
            }
            pending.push({ type: "land", row });
          }
        }
      } else if (pad >= 0) {
        onPad += STEP_S;
        const fx = frogX();
        if (fx < -EDGE || fx > W + EDGE) end("swept");
        else if (onPad >= spec(row).sink) end("sank");
      }
      if (!over && c.duration && t >= c.duration) end("time");
      // Camera eases toward Hop's row.
      const target = (row + (hop ? hop.t / HOP_S : 0)) * ROW_H;
      cam += (target - cam) * 0.12;
      const out = pending;
      pending = [];
      return out;
    },

    /**
     * Flat poses for the sprites:
     * [cam, frogX, frogY, hopProgress, sinkProgress, baseRow,
     *  then VIS_ROWS × MAX_PADS × (x, width, fly, sink)].
     * A pad width of 0 means the slot is empty.
     */
    poses() {
      const hp = hop ? hop.t / HOP_S : 0;
      const sinking = pad >= 0 && !hop ? onPad / spec(row).sink : 0;
      const base = Math.max(0, row - 1);
      const out = [cam, frogX(), (row + hp) * ROW_H, hp, sinking, base];
      for (let s = 0; s < VIS_ROWS; s++) {
        const r = base + s;
        for (let j = 0; j < MAX_PADS; j++) {
          if (r === 0) {
            out.push(0, 0, 0, 0);
            continue;
          }
          const sp = spec(r);
          if (j >= sp.count) {
            out.push(0, 0, 0, 0);
            continue;
          }
          const mine = r === row && j === pad && !hop;
          out.push(
            padX(sp, j, t),
            sp.w,
            sp.fly === j && !eaten.has(`${r}:${j}`) ? 1 : 0,
            mine ? sinking : 0,
          );
        }
      }
      return out;
    },

    get time() {
      return t;
    },
    get rows() {
      return row - (over && reason === "splash" ? 1 : 0);
    },
    get flies() {
      return flies;
    },
    get score() {
      return this.rows + flies * FLY_POINTS;
    },
    get over() {
      return over;
    },
    get reason() {
      return reason;
    },
    get airborne() {
      return hop != null;
    },
    get row() {
      return row;
    },
    get frogX() {
      return frogX();
    },
    get padTimeLeft() {
      return pad >= 0 ? spec(row).sink - onPad : Infinity;
    },
  };
}

/**
 * A careful player (used by the tests): hops when the landing is safe and
 * the pad it lands on won't carry Hop off the edge straight away.
 */
export function autoHop(world) {
  if (world.over || world.airborne) return false;
  const x = world.frogX;
  const next = world.row + 1;
  const tLand = world.time + HOP_S + 1 / 60;
  const s = world.spec(next);
  for (let j = 0; j < s.count; j++) {
    const px = padX(s, j, tLand);
    if (Math.abs(x - px) > s.w / 2 - 8) continue;
    // Where Hop will be 1 s after landing.
    const later = x + s.v * 1;
    if (later > 16 && later < W - 16) return true;
  }
  return false;
}
