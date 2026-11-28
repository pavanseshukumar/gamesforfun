/**
 * Pattern Parade: the buddies dance a sequence and you repeat it. Each
 * cleared round adds one more step. React-free so the tests drive it too.
 */
import { createRng } from "../../lib/random";

export const PARADE_DEFAULTS = {
  pads: 4, // buddies on stage (3–6)
  startLength: 3, // steps in the first round
  stepMs: 560, // how long each step of the show takes (lower = faster)
  speedUp: 0.04, // the show gets this much faster each round (share of stepMs)
  lives: 1, // mistakes allowed before the parade ends
  reverse: false, // repeat the dance backwards
  shuffle: false, // the buddies swap places every round
  fresh: false, // a brand-new pattern every round instead of adding a step
};

/** The buddies who dance, in pad order. */
export const DANCERS = ["bun", "kit", "hop", "peep", "mochi", "pom"];
/** Each pad's colour. */
export const PAD_COLOURS = ["#FF5FA8", "#FF8A3D", "#2BC46E", "#FFC93D", "#9C6BFF", "#3F9BFF"];

export function createParade(cfg = PARADE_DEFAULTS, seed = 1) {
  const c = { ...PARADE_DEFAULTS, ...cfg };
  const rand = createRng(seed);
  const pick = () => Math.floor(rand() * c.pads);
  let seq = [];
  let pos = 0; // next step the player must tap
  let round = 0; // rounds cleared
  let lives = c.lives;
  let score = 0;
  let over = false;
  let order = Array.from({ length: c.pads }, (_, i) => i); // pad shown in each slot

  const newRound = () => {
    const len = c.startLength + round;
    if (c.fresh || !seq.length) seq = Array.from({ length: len }, pick);
    else seq.push(pick());
    pos = 0;
    if (c.shuffle && round > 0) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
  };
  newRound();

  return {
    config: c,
    /** The dance to show this round (pad indexes, in order). */
    get show() {
      return [...seq];
    },
    /** What the player must tap, in order (the show reversed in reverse mode). */
    get answer() {
      return c.reverse ? [...seq].reverse() : [...seq];
    },
    /** Which pad sits in each slot on stage. */
    get order() {
      return [...order];
    },
    /** How long each step of the show lasts this round. */
    get stepMs() {
      return Math.max(220, Math.round(c.stepMs * (1 - c.speedUp) ** round));
    },

    /**
     * The player taps a pad.
     * @returns {"good"|"round"|"miss"|"over"|"ignored"}
     *   good: right, keep going · round: right, round cleared ·
     *   miss: wrong, the same round replays · over: wrong, no lives left
     */
    tap(pad) {
      if (over) return "ignored";
      const want = this.answer[pos];
      if (pad !== want) {
        lives -= 1;
        if (lives <= 0) {
          over = true;
          return "over";
        }
        pos = 0;
        return "miss";
      }
      pos += 1;
      score += 1 + Math.floor(round / 3);
      if (pos < seq.length) return "good";
      round += 1;
      score += seq.length;
      newRound();
      return "round";
    },

    get progress() {
      return pos;
    },
    get length() {
      return seq.length;
    },
    get round() {
      return round;
    },
    /** Longest dance repeated correctly. */
    get longest() {
      return round ? c.startLength + round - 1 : 0;
    },
    get score() {
      return score;
    },
    get lives() {
      return lives;
    },
    get over() {
      return over;
    },
  };
}
