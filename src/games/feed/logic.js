/**
 * Feed the Buddies: buddies sit at the table and ask for a snack; drag the
 * right one to them before their patience runs out. A buddy who gives up
 * costs a heart. React-free so the screen and the tests share the rules.
 */
import { createRng } from "../../lib/random";
import { MASCOTS } from "../buddies";

export const FOODS = ["🍎", "🍩", "🍕", "🧁", "🍓", "🥕", "🍪", "🍌", "🧀", "🍉", "🥨", "🍦"];

export const FEED_DEFAULTS = {
  duration: 60, // seconds (0 = until the hearts run out)
  seats: 3, // buddies at the table (2–4)
  menu: 4, // snacks on the tray (3–6)
  patience: 1, // × how long buddies wait
  spawn: 1, // × how quickly empty seats fill
  doubles: false, // some buddies want two snacks
  lives: 3,
};

const LEAVE_S = 0.9; // a served or upset buddy takes this long to go
const WRONG_COST = 0.25; // share of patience lost to a wrong snack

export function createFeedGame(cfg = FEED_DEFAULTS, seed = 1) {
  const c = { ...FEED_DEFAULTS, ...cfg };
  const rand = createRng(seed);
  const cast = Object.keys(MASCOTS);
  // The tray: a random selection of snacks for this round.
  const pool = [...FOODS];
  const menu = [];
  while (menu.length < c.menu) menu.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);

  let t = 0;
  let score = 0;
  let served = 0;
  let streak = 0;
  let bestStreak = 0;
  let lives = c.lives;
  let over = false;
  let pending = [];
  let nextId = 1;

  const difficulty = () => Math.min(1, t / 90);
  const seats = Array.from({ length: c.seats }, (_, i) => ({
    id: 0,
    buddy: null,
    want: [],
    patience: 0,
    max: 1,
    state: "empty", // empty | waiting | happy | upset
    timer: 0.4 + i * 0.7, // seconds until someone sits / leaves
  }));

  const seatBuddy = (seat) => {
    const d = difficulty();
    const taken = new Set(seats.map((s) => s.buddy));
    const free = cast.filter((b) => !taken.has(b));
    seat.id = nextId++;
    seat.buddy = free[Math.floor(rand() * free.length)];
    const wantTwo = c.doubles && rand() < 0.35 + 0.3 * d;
    const first = menu[Math.floor(rand() * menu.length)];
    seat.want = [first];
    if (wantTwo) {
      const others = menu.filter((f) => f !== first);
      seat.want.push(others[Math.floor(rand() * others.length)]);
    }
    seat.max = (7 - 3 * d) * c.patience * (wantTwo ? 1.5 : 1);
    seat.patience = seat.max;
    seat.state = "waiting";
    pending.push({ type: "arrive", seat: seats.indexOf(seat) });
  };

  const end = (why) => {
    over = true;
    pending.push({ type: why });
  };

  return {
    config: c,
    menu,
    seats,

    /** Advances time by dt seconds; returns events since the last call. */
    tick(dt) {
      if (over) return [];
      t += dt;
      seats.forEach((seat, i) => {
        if (seat.state === "waiting") {
          seat.patience -= dt;
          if (seat.patience <= 0) {
            seat.patience = 0;
            seat.state = "upset";
            seat.timer = LEAVE_S;
            lives -= 1;
            streak = 0;
            pending.push({ type: "upset", seat: i });
            if (lives <= 0) end("out");
          }
        } else {
          seat.timer -= dt;
          if (seat.timer > 0) return;
          if (seat.state === "empty") seatBuddy(seat);
          else {
            seat.state = "empty";
            seat.buddy = null;
            seat.want = [];
            const d = difficulty();
            seat.timer = (1.1 - 0.6 * d + rand() * 0.6) / c.spawn;
          }
        }
      });
      if (!over && c.duration && t >= c.duration) end("time");
      const out = pending;
      pending = [];
      return out;
    },

    /**
     * Gives `food` to the buddy in seat i.
     * @returns {"served"|"partial"|"wrong"|"ignored"}
     */
    serve(i, food) {
      const seat = seats[i];
      if (over || !seat || seat.state !== "waiting") return "ignored";
      const k = seat.want.indexOf(food);
      if (k < 0) {
        seat.patience = Math.max(0.01, seat.patience - seat.max * WRONG_COST);
        streak = 0;
        pending.push({ type: "wrong", seat: i });
        return "wrong";
      }
      seat.want.splice(k, 1);
      if (seat.want.length) {
        score += 3;
        pending.push({ type: "partial", seat: i });
        return "partial";
      }
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      served += 1;
      const quick = Math.round((seat.patience / seat.max) * 10);
      const points = 10 + quick + Math.min(10, (streak - 1) * 2);
      score += points;
      seat.state = "happy";
      seat.timer = LEAVE_S;
      pending.push({ type: "served", seat: i, points, streak });
      return "served";
    },

    get time() {
      return t;
    },
    get timeLeft() {
      return c.duration ? Math.max(0, c.duration - t) : Infinity;
    },
    get score() {
      return score;
    },
    get served() {
      return served;
    },
    get streak() {
      return streak;
    },
    get bestStreak() {
      return bestStreak;
    },
    get lives() {
      return lives;
    },
    get over() {
      return over;
    },
  };
}

/**
 * A steady waiter (used by the tests): every `every` seconds, serves the
 * most impatient buddy the first snack they still want.
 */
export function makeWaiter(every = 0.7) {
  let wait = 0;
  return (game, dt) => {
    wait -= dt;
    if (wait > 0) return;
    const waiting = game.seats
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.state === "waiting")
      .sort((a, b) => a.s.patience - b.s.patience);
    if (!waiting.length) return;
    const { s, i } = waiting[0];
    game.serve(i, s.want[0]);
    wait = every;
  };
}
