/**
 * Balance Buddy physics, independent of React so the app and the tests run the
 * same simulation. A plank balances on a post in a 400×640 world (y down); the
 * player tilts it to keep Koko rolling on top while crates drop onto it and
 * stars float down to be collected. Koko falling off ends the round.
 */
import Matter from "matter-js";

import { createRng } from "../../lib/random";

const { Bodies, Body, Composite, Engine } = Matter;

export const WORLD = { w: 400, h: 640 };
export const PIVOT = { x: 200, y: 470 };
export const PLANK = { w: 270, h: 16 };
export const BUDDY_R = 22;
export const STAR_R = 14;
export const MAX_TILT = 0.42; // radians either way
export const MAX_BOXES = 10;
export const MAX_STARS = 3;
export const STEP_MS = 1000 / 60;
const TURN_RATE = 0.035; // radians per step the plank can turn
// A seesaw tips toward weight: each unit of mass·distance from the post adds
// this much tilt, so Koko rolling off-centre (or a crate landing) pulls that
// side down and the player has to keep correcting.
const LOAD_TILT = 1 / 1400;
const MAX_LOAD = 0.36;
const FALL_Y = 600; // Koko below this has fallen off

export const BALANCE_DEFAULTS = {
  duration: 0, // seconds; 0 = endless (play until Koko falls)
  dropScale: 1, // how often crates fall
  boxScale: 1, // crate size
  starRate: 1, // how often stars appear
  wind: 0, // gusty sideways push on Koko
  plankScale: 1, // plank length
};

/**
 * @param {typeof BALANCE_DEFAULTS} cfg
 * @param {number} seed
 */
export function createBalanceWorld(cfg = BALANCE_DEFAULTS, seed = 1) {
  const c = { ...BALANCE_DEFAULTS, ...cfg };
  const rand = createRng(seed);
  const engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
  engine.gravity.y = 1;

  const plankW = PLANK.w * c.plankScale;
  // Bodies start dynamic and are then pinned (a body created static has no real mass).
  const plank = Bodies.rectangle(PIVOT.x, PIVOT.y, plankW, PLANK.h, {
    friction: 0.9,
    label: "plank",
  });
  Body.setStatic(plank, true);
  const buddy = Bodies.circle(PIVOT.x, PIVOT.y - PLANK.h / 2 - BUDDY_R - 1, BUDDY_R, {
    density: 0.0018,
    friction: 0.03,
    frictionStatic: 0.1,
    restitution: 0.1,
    frictionAir: 0.012,
    label: "buddy",
  });
  Composite.add(engine.world, [plank, buddy]);
  // A tiny nudge so the seesaw never starts perfectly still.
  Body.setVelocity(buddy, { x: (rand() < 0.5 ? -1 : 1) * (0.4 + rand() * 0.4), y: 0 });

  const boxes = new Array(MAX_BOXES).fill(null); // slot → { body, size }
  const stars = new Array(MAX_STARS).fill(null); // slot → { x, y, vy }
  let angle = 0;
  let t = 0; // seconds
  let nextBox = 1.6;
  let nextStar = 2.5;
  let collected = 0;
  let over = false;
  let pending = [];

  const spawnBox = () => {
    const slot = boxes.indexOf(null);
    if (slot < 0) return;
    const size = (20 + rand() * 14) * c.boxScale * (1 + Math.min(0.4, t / 120));
    const x = PIVOT.x + (rand() - 0.5) * plankW * 0.85;
    const body = Bodies.rectangle(x, -30, size, size, {
      density: 0.0009,
      friction: 0.5,
      restitution: 0.05,
      angle: rand() * Math.PI,
      label: `box-${slot}`,
    });
    Composite.add(engine.world, body);
    boxes[slot] = { body, size };
  };

  const spawnStar = () => {
    const slot = stars.indexOf(null);
    if (slot < 0) return;
    stars[slot] = {
      x: PIVOT.x + (rand() - 0.5) * plankW * 0.8,
      y: -20,
      vy: 1.1 + rand() * 0.5,
    };
  };

  return {
    engine,
    config: c,
    plankW,

    /**
     * Advances one fixed step. `input` in [-1, 1] sets the target tilt
     * (positive tips the right end down). Returns events since the last call.
     */
    step(input = 0) {
      if (over) return [];
      t += STEP_MS / 1000;

      // Weight resting on the plank tips it toward the heavy side.
      let moment = 0;
      const onPlank = (b) =>
        Math.abs(b.position.x - PIVOT.x) < plankW / 2 + 6 &&
        b.position.y < PIVOT.y &&
        b.position.y > PIVOT.y - 120;
      if (onPlank(buddy)) moment += buddy.mass * (buddy.position.x - PIVOT.x);
      for (const b of boxes) {
        if (b && onPlank(b.body)) moment += b.body.mass * (b.body.position.x - PIVOT.x);
      }
      const load = Math.max(-MAX_LOAD, Math.min(MAX_LOAD, moment * LOAD_TILT));
      const target = Math.max(
        -MAX_TILT,
        Math.min(MAX_TILT, Math.max(-1, Math.min(1, input)) * MAX_TILT + load),
      );
      angle += Math.max(-TURN_RATE, Math.min(TURN_RATE, target - angle));
      Body.setAngle(plank, angle);

      if (c.wind) {
        const gust = Math.sin(t * 0.7) * 0.6 + Math.sin(t * 1.9) * 0.4;
        Body.applyForce(buddy, buddy.position, { x: gust * c.wind * 0.00045, y: 0 });
      }

      // Crates fall faster as time goes on.
      nextBox -= STEP_MS / 1000;
      if (nextBox <= 0) {
        spawnBox();
        nextBox = (2.6 - Math.min(1.3, t / 50)) / c.dropScale + rand() * 0.6;
      }
      nextStar -= STEP_MS / 1000;
      if (nextStar <= 0 && c.starRate > 0) {
        spawnStar();
        nextStar = (3.5 + rand() * 2) / c.starRate;
      }

      Engine.update(engine, STEP_MS);

      boxes.forEach((b, i) => {
        if (b && b.body.position.y > WORLD.h + 60) {
          Composite.remove(engine.world, b.body);
          boxes[i] = null;
        }
      });
      stars.forEach((s, i) => {
        if (!s) return;
        s.y += s.vy;
        if (Math.hypot(s.x - buddy.position.x, s.y - buddy.position.y) < BUDDY_R + STAR_R) {
          stars[i] = null;
          collected++;
          pending.push({ type: "star", x: s.x, y: s.y });
        } else if (s.y > PIVOT.y + 60) {
          stars[i] = null;
        }
      });

      if (buddy.position.y > FALL_Y || buddy.position.x < -40 || buddy.position.x > WORLD.w + 40) {
        over = true;
        pending.push({ type: "fall" });
      } else if (c.duration && t >= c.duration) {
        over = true;
        pending.push({ type: "time" });
      }
      const out = pending;
      pending = [];
      return out;
    },

    /** Flat pose array for sprites: plank, buddy, MAX_BOXES boxes, MAX_STARS stars. */
    poses() {
      const out = [PIVOT.x, PIVOT.y, angle, buddy.position.x, buddy.position.y, buddy.angle];
      for (const b of boxes) {
        if (b) out.push(b.body.position.x, b.body.position.y, b.body.angle, b.size);
        else out.push(-100, -100, 0, 0);
      }
      for (const s of stars) {
        if (s) out.push(s.x, s.y, 1);
        else out.push(-100, -100, 0);
      }
      return out;
    },

    buddy,
    get time() {
      return t;
    },
    get stars() {
      return collected;
    },
    get over() {
      return over;
    },
    /** Round score: a point per second survived plus 5 per star. */
    get score() {
      return Math.floor(t) + collected * 5;
    },
  };
}

/**
 * A simple steady-hand controller (used by the tests): tilt against Koko's
 * offset from the middle and its speed, like balancing a ball on a beam.
 */
export function autoBalance(world) {
  const dx = world.buddy.position.x - PIVOT.x;
  const vx = world.buddy.velocity.x;
  return Math.max(-1, Math.min(1, -(dx / 60 + vx / 2.2)));
}
