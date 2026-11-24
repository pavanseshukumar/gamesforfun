/**
 * Blob Launch physics, independent of React so the app and the tests run the
 * exact same simulation. Coordinates are a fixed 400×640 logical world
 * (y grows downward); the screen scales it to fit.
 */
import Matter from "matter-js";

const { Bodies, Body, Composite, Engine, Events } = Matter;

export const WORLD = { w: 400, h: 640, ground: 600 };
export const SLING = { x: 98, y: 470 };
export const BALL_R = 17;
export const GRUMP_R = 15;
export const MAX_PULL = 95;
export const POWER = 0.15; // launch speed (px/step) per px of pull
export const STEP_MS = 1000 / 60;
const POP_SPEED = 3.2; // relative impact speed that pops a grump
const SETTLE_SPEED = 0.15;

const MATERIALS = {
  wood: { density: 0.0012, friction: 0.6, restitution: 0.05 },
  stone: { density: 0.004, friction: 0.8, restitution: 0.02 },
  ice: { density: 0.0007, friction: 0.04, restitution: 0.1 },
};

/**
 * Builds a playable world for `level` ({ blocks, grumps, ledges }).
 * Returns helpers to aim, launch, step and inspect it.
 */
export function createWorld(level) {
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1;

  const ground = Bodies.rectangle(WORLD.w / 2, WORLD.ground + 50, 2000, 100, {
    isStatic: true,
    label: "ground",
    friction: 0.9,
  });
  const ledges = (level.ledges ?? []).map((l) =>
    Bodies.rectangle(l.x, l.y, l.w, l.h, { isStatic: true, label: "ledge", friction: 0.9 }),
  );
  const blocks = level.blocks.map((b, i) =>
    Bodies.rectangle(b.x, b.y, b.w, b.h, {
      ...MATERIALS[b.type],
      angle: b.angle ?? 0,
      label: `block-${i}`,
    }),
  );
  const grumps = level.grumps.map((g, i) =>
    Bodies.circle(g.x, g.y, GRUMP_R, {
      density: 0.0011,
      friction: 0.5,
      restitution: 0.15,
      label: `grump-${i}`,
    }),
  );
  // Created dynamic, then pinned: matter-js only remembers a body's real mass
  // if it starts dynamic, and needs it when the ball is released.
  const ball = Bodies.circle(SLING.x, SLING.y, BALL_R, {
    density: 0.0025,
    friction: 0.7,
    restitution: 0.2,
    frictionAir: 0.005,
    label: "ball",
  });
  Body.setStatic(ball, true);
  Composite.add(engine.world, [ground, ...ledges, ...blocks, ...grumps, ball]);

  const onGroundAtStart = grumps.map((g) => g.position.y + GRUMP_R >= WORLD.ground - 2);
  const popped = grumps.map(() => false);
  let pending = []; // pop events not yet collected by the caller
  let flying = false;

  const pop = (i) => {
    if (popped[i]) return;
    popped[i] = true;
    pending.push({ type: "pop", index: i, x: grumps[i].position.x, y: grumps[i].position.y });
    Composite.remove(engine.world, grumps[i]);
  };

  Events.on(engine, "collisionStart", (event) => {
    for (const { bodyA, bodyB } of event.pairs) {
      for (const [g, other] of [
        [bodyA, bodyB],
        [bodyB, bodyA],
      ]) {
        if (!g.label.startsWith("grump-")) continue;
        const i = Number(g.label.slice(6));
        if (popped[i]) continue;
        const rel = Math.hypot(g.velocity.x - other.velocity.x, g.velocity.y - other.velocity.y);
        if (rel > POP_SPEED || (other.label === "ground" && !onGroundAtStart[i])) pop(i);
      }
      if (bodyA.label === "ball" || bodyB.label === "ball") {
        const other = bodyA.label === "ball" ? bodyB : bodyA;
        if (other.label.startsWith("block-") && flying) pending.push({ type: "hit" });
      }
    }
  });

  return {
    engine,
    ball,
    blocks,
    grumps,
    popped,

    /** Moves the loaded ball to the sling position plus `pull` (clamped). */
    aim(pull) {
      const p = clampPull(pull);
      Body.setPosition(ball, { x: SLING.x + p.x, y: SLING.y + p.y });
      return p;
    },

    launch(pull) {
      const p = clampPull(pull);
      Body.setPosition(ball, { x: SLING.x + p.x, y: SLING.y + p.y });
      Body.setStatic(ball, false);
      Body.setVelocity(ball, { x: -p.x * POWER, y: -p.y * POWER });
      flying = true;
    },

    /** Puts a fresh ball back in the sling for the next shot. */
    reload() {
      Body.setStatic(ball, true);
      Body.setAngle(ball, 0);
      Body.setPosition(ball, { ...SLING });
      flying = false;
    },

    /** Advances one fixed step and returns events (pops, hits) since the last call. */
    step() {
      Engine.update(engine, STEP_MS);
      grumps.forEach((g, i) => {
        if (
          !popped[i] &&
          (g.position.y > WORLD.h + 40 || g.position.x < -60 || g.position.x > WORLD.w + 60)
        )
          pop(i);
      });
      const out = pending;
      pending = [];
      return out;
    },

    /** True once nothing is moving (or the ball has left the world). */
    settled() {
      const moving = [...blocks, ...grumps.filter((_, i) => !popped[i])].some(
        (b) => b.speed > SETTLE_SPEED || b.angularSpeed > 0.01,
      );
      const ballGone =
        ball.position.x > WORLD.w + 60 || ball.position.x < -60 || ball.position.y > WORLD.h + 60;
      const ballResting = ball.isStatic || ball.speed < SETTLE_SPEED || ballGone;
      return !moving && ballResting;
    },

    remaining() {
      return popped.filter((p) => !p).length;
    },
  };
}

export function clampPull({ x, y }) {
  const len = Math.hypot(x, y);
  if (len <= MAX_PULL) return { x, y };
  return { x: (x / len) * MAX_PULL, y: (y / len) * MAX_PULL };
}

/**
 * Predicted flight path for a pull, ignoring collisions: matter's own
 * integration (velocity in px/step, gravity 0.001·g·Δt², air friction).
 */
export function trajectory(pull, steps = 42, every = 3) {
  const p = clampPull(pull);
  let x = SLING.x + p.x;
  let y = SLING.y + p.y;
  let vx = -p.x * POWER;
  let vy = -p.y * POWER;
  const g = 0.001 * STEP_MS * STEP_MS;
  const dots = [];
  for (let i = 1; i <= steps; i++) {
    vx *= 1 - 0.005;
    vy = vy * (1 - 0.005) + g;
    x += vx;
    y += vy;
    if (i % every === 0) dots.push({ x, y });
  }
  return dots;
}

/** Stars for clearing with `shotsUsed` of 3. */
export const starsFor = (shotsUsed) => (shotsUsed <= 1 ? 3 : shotsUsed === 2 ? 2 : 1);

/** Level score: grumps popped, plus a bonus for every shot left over. */
export const scoreFor = (grumpsPopped, shotsLeft) => grumpsPopped * 1000 + shotsLeft * 1500;
