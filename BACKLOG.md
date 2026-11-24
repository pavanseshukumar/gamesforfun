# Backlog

Ideas and follow-ups we've agreed to come back to. Newest decisions at the top of each section.

## Content
- **More levels for many games.** Level-based games share `components/LevelGrid.js` and the
  `levels`/`recordLevel` store slice, so adding levels is mostly data:
  - Blob Launch: more structures (`src/games/blob/levels.js`; the solver test checks each one).
  - Picture Slider: more pictures and sizes.
  - Maze game: more sizes and twists (keys, one-way doors, moving hazards).
  - Consider level packs for the arcade games (e.g. Fusion goals, Word Pop themed rounds).

## Games
- Simon Blobs: mascots sing a growing colour+note sequence to repeat.
- Pipe Flow: rotate pipe tiles to connect water to the flower.
- Dots Duel: two-player pass-and-play on one phone.
- Light It Up, Quick Math, Odd Blob Out, Path Painter, Balance Buddy, Bubble Garden.

## Features
- Mascot Dress-Up: spend XP/levels on hats and accessories for your buddy.
- Background music with its own volume control.
- Store prep: EAS build profiles, store listing, privacy policy, TestFlight / Play internal testing.
- Online leaderboards and friend challenges (needs a backend such as Supabase).

## To verify on a real phone
- Color Catch tilt direction on iOS and Android.
- How the synthesized sounds feel; haptics strength.
- Difficulty tuning: Stack Tower timing, Bounce Buddy platform speeds, Blob Launch levels.
- App icon and splash on a development build.
