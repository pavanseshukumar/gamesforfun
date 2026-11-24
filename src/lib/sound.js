import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import { useGameStore } from "../store/useGameStore";

/**
 * Sound effects. All clips are synthesized by scripts/generate-sounds.py.
 * `pool` is how many copies can overlap (for rapid-fire sounds), `volume` is
 * the per-clip mix level.
 */
const CLIPS = {
  tap: { src: require("../../assets/sounds/tap.wav"), pool: 3, volume: 0.6 },
  select: { src: require("../../assets/sounds/select.wav"), pool: 2, volume: 0.5 },
  pop1: { src: require("../../assets/sounds/pop1.wav"), pool: 3, volume: 0.8 },
  pop2: { src: require("../../assets/sounds/pop2.wav"), pool: 3, volume: 0.8 },
  pop3: { src: require("../../assets/sounds/pop3.wav"), pool: 3, volume: 0.8 },
  pop4: { src: require("../../assets/sounds/pop4.wav"), pool: 3, volume: 0.8 },
  star: { src: require("../../assets/sounds/star.wav"), pool: 2, volume: 0.8 },
  wrong: { src: require("../../assets/sounds/wrong.wav"), pool: 2, volume: 0.7 },
  whoosh: { src: require("../../assets/sounds/whoosh.wav"), pool: 3, volume: 0.6 },
  merge: { src: require("../../assets/sounds/merge.wav"), pool: 3, volume: 0.8 },
  flip: { src: require("../../assets/sounds/flip.wav"), pool: 3, volume: 0.7 },
  match: { src: require("../../assets/sounds/match.wav"), pool: 1, volume: 0.8 },
  jump: { src: require("../../assets/sounds/jump.wav"), pool: 2, volume: 0.7 },
  land: { src: require("../../assets/sounds/land.wav"), pool: 2, volume: 0.8 },
  perfect: { src: require("../../assets/sounds/perfect.wav"), pool: 2, volume: 0.8 },
  catch: { src: require("../../assets/sounds/catch.wav"), pool: 3, volume: 0.8 },
  powerup: { src: require("../../assets/sounds/powerup.wav"), pool: 1, volume: 0.7 },
  shield: { src: require("../../assets/sounds/shield.wav"), pool: 1, volume: 0.8 },
  tick: { src: require("../../assets/sounds/tick.wav"), pool: 2, volume: 0.8 },
  go: { src: require("../../assets/sounds/go.wav"), pool: 1, volume: 0.8 },
  win: { src: require("../../assets/sounds/win.wav"), pool: 1, volume: 0.8 },
  gameover: { src: require("../../assets/sounds/gameover.wav"), pool: 1, volume: 0.7 },
  levelup: { src: require("../../assets/sounds/levelup.wav"), pool: 1, volume: 0.8 },
  slide: { src: require("../../assets/sounds/slide.wav"), pool: 3, volume: 0.7 },
  solved: { src: require("../../assets/sounds/solved.wav"), pool: 1, volume: 0.8 },
  warn: { src: require("../../assets/sounds/warn.wav"), pool: 1, volume: 0.6 },
  switch: { src: require("../../assets/sounds/switch.wav"), pool: 1, volume: 0.7 },
};

const players = {}; // name → AudioPlayer[]
const cursor = {}; // name → next pool index
let ready = false;

/** Call once at startup. Safe to call again. */
export function initSound() {
  if (ready) return;
  ready = true;
  // Sound effects mix with the player's own music and respect the silent switch.
  setAudioModeAsync({ interruptionMode: "mixWithOthers", playsInSilentMode: false }).catch(
    () => {},
  );
  for (const [name, clip] of Object.entries(CLIPS)) {
    try {
      players[name] = Array.from({ length: clip.pool }, () => {
        const p = createAudioPlayer(clip.src);
        p.volume = clip.volume;
        return p;
      });
      cursor[name] = 0;
    } catch {
      players[name] = [];
    }
  }
}

/** Plays a sound effect by name, e.g. sfx("pop2"). No-op when sound is off. */
export function sfx(name) {
  if (!useGameStore.getState().sound) return;
  if (!ready) initSound();
  const pool = players[name];
  if (!pool?.length) return;
  const i = cursor[name];
  cursor[name] = (i + 1) % pool.length;
  const p = pool[i];
  try {
    // Rewind first so a clip that already finished plays again from the start.
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // A missing audio device must never break the game.
  }
}

/** Pop pitch rises with the combo tier (1–4). */
export const popFor = (tier) => `pop${Math.max(1, Math.min(4, tier))}`;

/** Sequence helper for little jingles, e.g. a countdown. */
export function sfxLater(name, ms) {
  setTimeout(() => sfx(name), ms);
}
