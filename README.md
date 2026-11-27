# Playzo 🎮

A bright, playful mobile hub of quick mini-games, built with **Expo (React Native)**, **JavaScript**,
**NativeWind (Tailwind CSS)** and **Reanimated** for smooth, native-thread animations.

## The look

Sunny gradient screens, giant condensed headlines (Anton), friendly body type (Outfit), white
rounded cards and black pill buttons. A cast of ten original SVG buddies (Mochi, Bun, Rex, Pom, Pengu,
Blink, Bolt, Zuzu, Spike and Wobble) bob, blink and cheer throughout the app, and a floating pill tab bar has a black
quick-play button in the middle.

## Screens

- **Splash**: the native splash hands off to an animated one (mascot crew pops in, loading bar)
- **Welcome** (first launch, replayable from Settings): four swipeable intro pages ending with buddy and name setup
- **Home**: "Hey {name}!" hero with the mascot crew, streak pill, numbered game carousel, level card
- **Daily goals** (on Home): three goals a day picked from a pool (play rounds, try different games, clear levels, 3-star a level, hit a score, solve the Daily Puzzle, reach a streak). Claim +30 XP each and +60 XP for all three; finishing goals unlocks the Propeller Cap, Flower Lei and Bunny Ears
- **All games** (Home → See all): every game in a 2-column grid with Action / Puzzle / Brain filters, Featured / Recent / A–Z sorting, best score, star progress and a NEW badge
- **Profile**: your name huge, your buddy, level, games played, streak, XP, rank and badge showcase
- **Dress Up**: 16 hats, eyewear and neckwear for your buddy, unlocked by level, level stars, streaks and games played
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
| 🦘 **Bounce Buddy** | Tap to hop Bun onto the platform sliding above. Land dead-centre for a PERFECT; stars +5, springs +3, clouds melt in 1.4s. | Squash-and-stretch hops, camera climb, parallax clouds, sky turns sunset → night |
| 🎨 **Color Catch** | Tilt (or drag) to move Pom's basket and catch only the target colour, which changes every 8s. ⭐ shield, ⏳ slow-mo, 3 hearts. | Wobbling drops, basket recolours, catch squash, red flash + shake on mistakes |
| 🔤 **Word Pop** | Tap rising letter bubbles to spell words (3–8 letters) in 90 seconds. Tapped bubbles freeze; rare letters and long words score more; golden bubbles double a word. | Floating, swaying bubbles, live ✓ when your letters form a word, pop-and-score on submit |
| 🧱 **Stack Tower** | Tap to drop each sliding block onto the tower; overhangs get sliced off so the blocks shrink. Perfect drops snap in, and 3 in a row grow the block back. | Tumbling sliced pieces, Rex riding the top, camera climb, sky turns sunset → space |
| 🎯 **Blob Launch** | Drag back to aim, let go to fling Spike at wobbly towers of wood, stone and ice. Pop every Grump within 3 shots; fewer shots earn more stars across 15 handmade levels. | Real physics (matter-js), stretchy sling bands, predicted-path dots, toppling structures, level-select with stars |
| 🖼️ **Picture Slider** | Slide tiles to rebuild mascot pictures across 18 levels that grow from 3×3 to 6×6, including picture-only boards with no number hints. Each board is a fixed scramble; finish at par for 3 stars. | Springy tiles, goal thumbnail, picture comes alive when solved, level select with stars |
| 🌀 **Maze Dash** | Swipe and Pengu waddles along the corridor to the next junction. 20 seeded mazes from 5×7 to 15×21; from level 4 grab the key before the portal unlocks, and levels 16–20 are dark, lit only around Pengu. Stars for matching the par swipe count. | Cell-by-cell running, breadcrumb trail, bobbing key, spinning portal |
| 🚿 **Pipe Flow** | Tap pipe tiles to turn them and lead water from the tap to the flower across 15 seeded gardens from 3×4 to 8×11. Every tile is part of one pipe network; some later boards bolt a few pipes in place as hints. Stars for staying near par taps. | Springy turning pipes, water that runs outward pipe by pipe, flower that blooms when watered |
| 💡 **Light It Up** | Tap a lamp to flip it and its four neighbours; light every lamp. 15 seeded boards from 3×3 to 7×7, some shaped (plus, ring, diamond). Hints point at a lamp that still needs a tap (max 2 stars). Stars for matching par taps. | Glowing lamps, ripple flip to neighbours, pulsing hint ring |
| 🖌️ **Path Painter** | Drag one continuous line from the brush through every open square without crossing it; step back to undo or tap a painted square to cut back to it. 15 seeded canvases from 3×3 to 7×8 with walls. Stars for little backtracking. | Rainbow line, Rex riding the brush, combo-pitched pops |
| ⚖️ **Balance Buddy** *(hidden for now)* | Drag (or tilt the phone) to tip a seesaw and keep Bolt rolling on top. The seesaw also tips toward weight, so Bolt drifting off-centre or a crate landing pulls that side down. Roll into falling stars for +5; a point per second survived. 10 challenge levels with wind, big crates and short planks. | matter-js physics, falling crates, swaying plank, star pickups |
| 🔪 **Slice Splash** | Swipe through jelly bubbles tossed up from below before they fall. Slice 3+ in one swipe for a combo, golden bubbles are worth 5, and don't slice the Grumps. 3 hearts. | Fading swipe trail, bubbles split in two along your cut, combo-pitched pops, screen flash on mistakes |
| ➗ **Quick Math** | Equation cards: swipe right if true, left if false (or tap ✓ / ✗). 60 seconds, per-card timer, streak multiplier up to ×4, rounds climb from + to ÷; misses cost 3 s and show the right answer. | Tilting swipe cards with TRUE/FALSE stamps, green/red flashes, round-up toasts |
| 👀 **Odd One Out** | Four cards, one is different: tap it. Rounds mix shades, buddies, and colour-word tricks (the word RED written in blue): find the odd ink, the odd word, or the one word that matches its colour. 60 seconds, 5-in-a-row multiplier up to ×4, misses cost 3 s. 10 challenge levels including Sudden Death. | Instant taps, green/red reveal rings, shake on a miss, streak pops |
| 🧩 **Daily Puzzle** | One 4×4 sliding picture puzzle per day, the same for everyone (seeded by date). First solve counts; replays are practice. | Spring-sliding tiles, picture reveal with the mascot coming alive, confetti |

**Challenge levels.** Every other arcade game also has 10 challenge levels (a **Levels** button on
its start screen) with their own twists: Sudden Death Tap Rush, timed Bounce Buddy, two-colour
Color Catch, ×-only Quick Math, 5-letter-minimum Word Pop, Fusion goal tiles, Memory peeks and
bigger decks, and more. Each level judges one stat against three star targets, and a level unlocks
once the one before it has a star.

All games share the same pieces: a themed gradient backdrop, a header whose score pops on every
change, haptics, and a game-over sheet where the game's mascot cheers, shows the XP you earned, and
throws confetti for a new best. Everything is saved on the device.

## Credits

Blob Launch uses [matter-js](https://brm.io/matter-js/) (MIT) for physics. Word Pop's dictionary is built from [SCOWL](http://wordlist.aspell.net/) word lists (common tiers
only, slurs and strong profanity removed) by `scripts/build-wordlist.py`. SCOWL copyright notice:
`src/games/wordpop/WORDS-LICENSE.txt`.

## Run it

```bash
npm install
npm start          # then scan the QR code with Expo Go on your phone
npm run web        # or try it in a browser (arrow keys work in Fusion and Color Catch)
```

Other scripts: `npm test` (unit tests), `npm run lint`, `npm run format`, `npm run export:web`.
GitHub Actions runs lint, tests and a web build on every push.

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

To give it challenge levels, add `src/games/<id>/levels.js` (a `DEFAULTS` config and a list of
`{ name, goal, config, metric, thresholds, lower? }`), register it in `src/games/challenges.js` and
the DEFAULTS map in `__tests__/challenges.test.js`, and use `useChallenge(id)` in the screen.

## Roadmap ideas

- Background music with its own volume control
- More games: simon-says blobs, pipe flow
- Online leaderboards (Supabase or Firebase)
- Store builds with EAS
