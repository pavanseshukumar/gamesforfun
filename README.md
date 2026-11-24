# Games for Fun 🎮

A mobile hub of quick, juicy mini-games, built with **Expo (React Native)**, **JavaScript**,
**NativeWind (Tailwind CSS)** and **Reanimated** for smooth, native-thread animations.

## Games

| Game | How to play | Animations |
|---|---|---|
| ⚡ **Tap Rush** | 30 seconds. Tap orbs before their ring closes. Every 5 hits in a row raises the multiplier; ⭐ golden orbs are worth 5×. | 3-2-1 countdown, spring-in orbs, shrinking timer rings, "+N" burst popups, combo badge, shake on a miss |
| 🧠 **Memory Flip** | Flip cards to match all 8 pairs in as few moves as you can. | Staggered deal-in, 3D card flips, match bounce, shake on a mismatch, progress pips |
| 🔮 **Fusion** | Swipe to slide tiles; matching numbers fuse and double. Keep going until no moves are left. | Sliding tiles, spawn pop, merge pulse, glow on big tiles |

All games share the same pieces: an animated backdrop, a header whose score pops on every change,
haptics, and a game-over sheet with confetti for a new best. Best scores and play counts are saved
on the device.

## Run it

```bash
npm install
npm start          # then scan the QR code with Expo Go on your phone
npm run web        # or try it in a browser (arrow keys / WASD work in Fusion)
```

Other scripts: `npm run lint`, `npm run format`, `npm run export:web`.

## Project layout

```
src/
  app/                 # screens (Expo Router: every file is a route)
    _layout.js         # root stack, gesture + safe-area providers
    index.js           # home hub
    settings.js        # haptics toggle, reset stats
    games/             # one screen per game
  components/          # shared UI: Screen, GameHeader, GameOverModal, PressableScale, Confetti…
  games/               # game registry + pure game logic (e.g. fusion/logic.js)
  lib/                 # haptics + motion tokens
  store/               # Zustand store, persisted with AsyncStorage
```

## Adding a new game

1. Create `src/app/games/<id>.js` using `Screen`, `GameHeader` and `GameOverModal`.
2. Add it to `src/games/registry.js` (title, emoji, gradient colours, unit, `lowerIsBetter`).
3. At the end of a round, call `useGameStore.getState().recordGame(id, score)`.

The home screen picks it up automatically. See `AGENTS.md` for styling and animation conventions.

## Roadmap ideas

- Sound effects and music (expo-audio), with a toggle in Settings
- More games: word scramble, snake/dodge, a daily puzzle with streaks
- Achievements and a stats screen
- Online leaderboards (Supabase or Firebase)
- App icon, splash screen and store builds with EAS
