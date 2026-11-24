# Games for Fun 🎮

A bright, playful mobile hub of quick mini-games, built with **Expo (React Native)**, **JavaScript**,
**NativeWind (Tailwind CSS)** and **Reanimated** for smooth, native-thread animations.

## The look

Sunny gradient screens, giant condensed headlines (Anton), friendly body type (Outfit), white
rounded cards and black pill buttons. A cast of original SVG mascots (Zip, Bloop, Gloop, Pip and
Sunny) bob, blink and cheer throughout the app, and a floating pill tab bar has a black
quick-play button in the middle.

## Screens

- **Home**: "Hey {name}!" hero with the mascot crew, streak pill, numbered game carousel, level card
- **Profile**: your name huge, your buddy, level, games played, streak, XP, rank and badge showcase
- **Trophies**: hexagon badges with live progress; the home bell counts newly unlocked ones
- **Settings**: edit your name, pick your buddy, haptics, reset progress
- **Quick play** (centre button): jumps into a random arcade game
- **Today's puzzle** banner on Home, with a tick once solved and a 7-day calendar

## Sound

27 original sound effects (pops that climb in pitch with your combo, card flips, tile slides,
boings, chimes, fanfares) are synthesized from scratch by `scripts/generate-sounds.py` into
`assets/sounds/`, so they're royalty-free and tiny (~500 KB total). Tweak a recipe and run
`python3 scripts/generate-sounds.py` (needs numpy) to rebuild them. Sounds mix with your music,
respect the silent switch, and can be turned off in Settings.

Every finished round earns **XP** → levels → ranks (Rookie → Bronze → Silver → Gold Explorer →
Diamond Legend), and playing on consecutive days builds a **streak**.

## Games

| Game | How to play | Animations |
|---|---|---|
| ⚡ **Tap Rush** | 30 seconds. Tap orbs before their ring closes. Every 5 hits in a row raises the multiplier; ⭐ golden orbs are worth 5×. | 3-2-1 countdown, spring-in orbs, shrinking timer rings, "+N" burst popups, combo badge, shake on a miss |
| 🧠 **Memory Flip** | Flip cards to match all 8 pairs in as few moves as you can. | Staggered deal-in, 3D card flips, match bounce, shake on a mismatch, progress pips |
| 🔮 **Fusion** | Swipe to slide tiles; matching numbers fuse and double. Keep going until no moves are left. | Sliding tiles, spawn pop, merge pulse, glow on big tiles |
| 🦘 **Bounce Buddy** | Tap to hop Pip onto the platform sliding above. Land dead-centre for a PERFECT; stars +5, springs +3, clouds melt in 1.4s. | Squash-and-stretch hops, camera climb, parallax clouds, sky turns sunset → night |
| 🎨 **Color Catch** | Tilt (or drag) to move Sunny's basket and catch only the target colour, which changes every 8s. ⭐ shield, ⏳ slow-mo, 3 hearts. | Wobbling drops, basket recolours, catch squash, red flash + shake on mistakes |
| 🧩 **Daily Puzzle** | One 4×4 sliding picture puzzle per day, the same for everyone (seeded by date). First solve counts; replays are practice. | Spring-sliding tiles, picture reveal with the mascot coming alive, confetti |

All games share the same pieces: a themed gradient backdrop, a header whose score pops on every
change, haptics, and a game-over sheet where the game's mascot cheers, shows the XP you earned, and
throws confetti for a new best. Everything is saved on the device.

## Run it

```bash
npm install
npm start          # then scan the QR code with Expo Go on your phone
npm run web        # or try it in a browser (arrow keys work in Fusion and Color Catch)
```

Other scripts: `npm run lint`, `npm run format`, `npm run export:web`.

App art is generated, not hand-exported: `node scripts/generate-icons.mjs` renders the app icon,
Android adaptive and themed icon layers, splash image and favicon from the same mascot geometry as
the app (needs Playwright + Chromium).

## Project layout

```
src/
  app/                 # screens (Expo Router: every file is a route)
    _layout.js         # root stack, fonts, gesture + safe-area providers
    (tabs)/            # home, profile, awards (trophies), settings + custom TabBar
    games/             # one screen per game
  components/          # Mascot, GradientScreen, Buttons, HexBadge, XpBar, TabBar, GameHeader,
                       # GameOverModal, GameCard, Confetti, PopNumber, PressableScale
  games/               # registry, achievements, pure game logic (e.g. fusion/logic.js)
  lib/                 # haptics, motion tokens, XP/level maths, useFocusKey
  store/               # Zustand store (profile, XP, streaks, records), persisted with AsyncStorage
  theme.js             # backdrops per screen, card shadow, display() type helper
```

## Adding a new game

1. Create `src/app/games/<id>.js` using `GradientScreen`, `GameHeader` and `GameOverModal`.
2. Add it to `src/games/registry.js` (title, mascot, gradient colours, unit, `lowerIsBetter`)
   and give it a backdrop in `src/theme.js`.
3. At the end of a round, call `recordGame(id, score, { xp, records })` and pass the result to
   `GameOverModal`.

The home screen picks it up automatically. See `AGENTS.md` for styling and animation conventions.

## Roadmap ideas

- Background music with its own volume control
- More games: word pop, stack tower, simon-says blobs
- Online leaderboards (Supabase or Firebase)
- Store builds with EAS
