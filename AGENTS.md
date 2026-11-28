This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npm test                    # unit tests (Jest, jest-expo preset; tests live in __tests__/)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npx expo lint` and `npm test` before declaring any task done; CI (.github/workflows/ci.yml) runs both plus a web build on every push. This project is plain JavaScript (no TypeScript).

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.js` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Project conventions (Playzo)

- **Design language:** bright gradient screens (`GradientScreen` + `BACKDROPS` in `src/theme.js`),
  ink-black text, white rounded cards with `cardShadow`, black pill primary buttons
  (`components/Buttons.js`), Anton display headlines via `display(size)`, Outfit body text via
  `font-body`, `font-body-semi`, `font-body-bold` and `font-body-black`. Never rely on `fontWeight`
  with these custom fonts. The mascots in `components/Mascot.js` are original SVG characters;
  reuse them rather than adding emoji art. `<Mascot silhouette="#rrggbb">` draws a buddy (and outfit) as a solid shadow. Pass `outfit` (from `useOutfit()`) wherever the
  player's own buddy appears; Dress-Up items are listed in `src/games/wardrobe.js` and drawn in
  `Mascot.js` (`Hat`, `Eyewear`, `Neckwear`).
- **Styling:** NativeWind v4 (Tailwind v3). Theme colors and font families live in `tailwind.config.js`.
  `className` works on core RN components (`View`, `Text`, `Pressable`, …) but **not** on
  Reanimated `Animated.*` components: give those inline `style`, and put Tailwind classes on a
  plain child or wrapper.
- **Animation:** Reanimated 4. Write shared values with `sv.set(...)` (not `sv.value = ...`) so
  the React Compiler lint rules pass; read `sv.value` inside `useAnimatedStyle`. Don't put a
  layout animation (`entering`/`exiting`) and an animated `transform` on the same view: nest them.
  Motion tokens are in `src/lib/motion.js`.
- **Gestures:** react-native-gesture-handler v3. Prefer the hook API (`usePanGesture`, …).
  For instant taps (reaction games), use the responder props (`onStartShouldSetResponder` +
  `onResponderGrant`) rather than `Pressable.onPressIn`, which can drop very short taps on web.
- **Real-time games** (Bounce Buddy, Color Catch): keep the simulation in one shared value and
  step it in `useFrameCallback` with `sim.modify((s) => { "worklet"; ...; return s; })`. Render a
  fixed pool of sprites whose `useAnimatedStyle` reads from the sim, so React never re-renders per
  frame. Send discrete events (catch, land, game over) to JS with `scheduleOnRN` from
  `react-native-worklets`, through a stable `emit` callback that forwards to a handler ref.
- **Stepped games** (Hop Across `src/games/hopAcross/world.js`, Feed the Buddies `src/games/feed/logic.js`,
  Pattern Parade `src/games/parade/logic.js`, Kit's Burrow `src/games/burrow/logic.js`, Fishing Fun,
  Shadow Match and Where's Pom? under `src/games/{fishing,shadow,spot}/logic.js`):
  React-free rules with a test player (`autoHop`, `makeWaiter`) that checks every challenge level earns a
  star. The screen keeps the live game in a ref and draws from poses / a snapshot, never from the ref in render.
- **Physics games** (Blob Launch, Balance Buddy — `src/games/balance/world.js`, whose tests drive it with
  `autoBalance` and check every challenge level is clearable): simulation lives in a React-free module (`src/games/blob/world.js`,
  matter-js) so the app and the tests share it. The screen steps it at a fixed 60 Hz in a
  `requestAnimationFrame` loop and writes poses into one shared value for the sprites. Every level
  must stand still at rest and be clearable within 3 shots; `__tests__/blob.test.js` checks this with
  a headless solver, so re-run `npm test` after editing physics constants or levels. Create bodies
  dynamic and _then_ `Body.setStatic(true)`: a body created static has infinite mass once released.
- **Launch flow:** the root layout waits for the store to hydrate (`lib/useHydrated.js`), shows
  `AnimatedSplash`, and gates `(tabs)` behind `Stack.Protected guard={onboarded}`; `welcome.js` sets
  `onboarded` when done (Settings → Replay intro clears it).
  When the splash starts leaving, `lib/launch.js` flips `revealed`; first screens key their entrance
  on it so they animate in as the splash zooms away (tapping the splash skips it).
- **Daily goals:** `src/games/goals.js` picks the day's goals (seeded by date) and folds events into
  `goalStats`; the store calls `trackGoals` from `recordGame`, `recordLevel` and `recordDaily`, so new
  games count automatically. Pass personal records (e.g. `oddStreak`) in `records` to feed record goals.
- **Store selectors:** never return a fresh `{}`/`[]` fallback from a `useGameStore` selector (it
  re-renders forever, React error #185); use a module-level constant instead.
- **Tilt:** use `src/lib/useTilt.js`, which normalises the accelerometer sign across iOS, Android
  and web; always offer a drag fallback.
- **Seeded randomness:** `src/lib/random.js` (`createRng`, `hashString`) for anything that must be
  the same for every player, such as the daily puzzle.
- **Sound:** play effects with `sfx(name)` from `src/lib/sound.js` (respects the Sound setting;
  `popFor(tier)` gives combo-pitched pops). Clips live in `assets/sounds/` and are generated by
  `scripts/generate-sounds.py`; add a recipe there, regenerate, then register it in `CLIPS`.
  End-of-round jingles come from `GameOverModal` (pass `mood="success"` for rounds you complete).
- **Tab bar:** a white icon-only pill (open tab: icon + dot in that screen's colour) with a round cotton-candy random-game button beside it. Expo Router 58 passes custom `tabBar` components `state`, `descriptors`, `emitter`
  and `navigateToTab(routeKey)`, with no `navigation` object. See `components/TabBar.js`.
- **Haptics:** always go through `src/lib/haptics.js` (respects the settings toggle, no-op on web).
- **Level-based games** (Blob Launch, Picture Slider, Maze Dash, Pipe Flow, Light It Up, Path Painter): use `components/LevelGrid.js` for the level
  select and the store's `levels` slice (`recordLevel(gameId, n, stars, score)`), then call
  `recordGame(gameId, totalStars, …)` so "best" is total stars. Sliding-tile boards come from
  `src/games/sliding.js` (any N×N) and render with `components/SlidingBoard.js`.
  Picture Slider and Maze Dash star by time: each level has a `goal` in seconds, scored with
  `src/games/timeStars.js` and shown with `components/StarTimer.js` (the clock starts on the first move).
- **Challenge levels** (all other arcade games): `src/games/<id>/levels.js` exports `DEFAULTS` and
  `LEVELS` (`{ name, goal, config, metric, thresholds, lower? }`), registered in
  `src/games/challenges.js` and in the DEFAULTS map of `__tests__/challenges.test.js`. The screen
  reads them with `useChallenge(id)` (`?level=n` route param), wraps its game in a component keyed by
  the level, merges `{ ...DEFAULTS, ...level.config }`, and ends a level with
  `challenge.complete(stats)` + `ChallengeResult`. Use `Infinity` for a lower-is-better stat when
  the goal wasn't reached.
- **Adding a game:** create `src/app/games/<id>.js`, add an entry to `src/games/registry.js` (with a
  `category`: action, puzzle or brain; if it has its own level list, add it to `src/games/library.js`), use
  `GradientScreen`, `GameHeader` and `GameOverModal`, and pass the result of `recordGame(id, score, { xp, records })` to the modal.
