import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";

import { IconButton } from "../../components/Buttons";
import Confetti from "../../components/Confetti";
import GameHeader from "../../components/GameHeader";
import GameOverModal from "../../components/GameOverModal";
import GradientScreen from "../../components/GradientScreen";
import LevelsHeader from "../../components/LevelsHeader";
import LevelGrid, { Stars, totalStars } from "../../components/LevelGrid";
import PuzzleArt from "../../components/PuzzleArt";
import SlidingBoard from "../../components/SlidingBoard";
import { getGame } from "../../games/registry";
import { isSolved, slide } from "../../games/sliding";
import { LEVELS, scoreFor, starsFor } from "../../games/slider/levels";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { useGameStore } from "../../store/useGameStore";
import { display } from "../../theme";

const GAME = getGame("slider");
// Stable fallback: a fresh {} per render would make the store selector loop forever.
const NO_PROGRESS = {};

export default function PictureSlider() {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 40, 400);
  const progress = useGameStore((s) => s.levels?.[GAME.id] ?? NO_PROGRESS);
  const recordLevel = useGameStore((s) => s.recordLevel);
  const recordGame = useGameStore((s) => s.recordGame);

  const [levelIdx, setLevelIdx] = useState(null); // null = level select
  const [board, setBoard] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const [result, setResult] = useState(null);

  const level = levelIdx == null ? null : LEVELS[levelIdx];
  const n = levelIdx == null ? 0 : levelIdx + 1;
  const hasNext = levelIdx != null && levelIdx < LEVELS.length - 1;
  const running = level != null && !solved && moves > 0;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const startLevel = useCallback((i) => {
    setLevelIdx(i);
    setBoard(LEVELS[i].board);
    setMoves(0);
    setSeconds(0);
    setSolved(false);
    setResult(null);
    sfx("go");
  }, []);

  const tap = (index) => {
    if (solved) return;
    const next = slide(board, index);
    if (!next) {
      haptic.select();
      return;
    }
    haptic.tap();
    sfx("slide");
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);
    if (!isSolved(next)) return;

    setSolved(true);
    haptic.success();
    sfx("solved");
    const stars = starsFor(nextMoves, level.par);
    const score = scoreFor(nextMoves, level.par, seconds);
    const { prevStars } = recordLevel(GAME.id, n, stars, score);
    const total = totalStars(useGameStore.getState().levels[GAME.id]);
    const gained = Math.max(0, stars - prevStars);
    const outcome = recordGame(GAME.id, total, { xp: 10 + gained * 12 });
    setTimeout(
      () =>
        setResult({
          stars,
          score,
          isNewBest: stars > prevStars,
          xpGained: outcome.xpGained,
          levelUp: outcome.levelUp,
        }),
      1400,
    );
  };

  if (level == null) {
    return (
      <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text style={display(30)}>Levels</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <LevelsHeader
            game={GAME}
            blurb="Slide the tiles to rebuild each picture. Match par for 3 stars!"
            stars={totalStars(progress)}
            max={LEVELS.length * 3}
          />
          <LevelGrid levels={LEVELS} progress={progress} onPick={startLevel} accent={GAME.accent} />
        </ScrollView>
      </GradientScreen>
    );
  }

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <GradientScreen theme={GAME.id} edges={["top", "bottom"]}>
      <GameHeader
        title={`Level ${n}`}
        score={moves}
        scoreLabel="Moves"
        best={progress[n]?.stars ? "⭐".repeat(progress[n].stars) : undefined}
        right={
          level.pictureOnly ? undefined : (
            <IconButton
              icon={showNumbers ? "eye" : "eye-off"}
              label={showNumbers ? "Hide numbers" : "Show numbers"}
              onPress={() => setShowNumbers((v) => !v)}
            />
          )
        }
      />

      <View className="mt-4 flex-row items-center justify-between px-5">
        <View>
          <Text className="font-body-black text-sm text-ink">
            ⏱ {mm}:{ss}
          </Text>
          <Text className="font-body-bold text-xs text-ink-soft">
            {level.name} · par {level.par}
            {level.pictureOnly ? " · 🖼 no numbers" : ""}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="mr-2 font-body-bold text-xs text-ink-soft">Goal</Text>
          <View
            style={{ borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "#fff" }}
          >
            <PuzzleArt variant={level.variant} size={52} />
          </View>
        </View>
      </View>

      <View className="flex-1 items-center justify-center">
        <SlidingBoard
          key={levelIdx}
          board={board}
          variant={level.variant}
          boardSize={boardSize}
          showNumbers={showNumbers && !level.pictureOnly}
          solved={solved}
          onTap={tap}
        />
        {solved && <Confetti />}
      </View>

      <View className="flex-row justify-center gap-3 pb-4">
        <IconButton icon="grid-outline" label="All levels" onPress={() => setLevelIdx(null)} />
        <IconButton icon="refresh" label="Restart level" onPress={() => startLevel(levelIdx)} />
      </View>

      {result && (
        <GameOverModal
          title="Picture complete!"
          game={{ ...GAME, mascot: level.variant }}
          score={result.stars}
          best={progress[n]?.stars}
          result={result}
          mood="success"
          primaryLabel={hasNext ? "Next level" : "Play again"}
          primaryIcon={hasNext ? "arrow-forward" : "refresh"}
          onPlayAgain={() => startLevel(hasNext ? levelIdx + 1 : levelIdx)}
          secondaryLabel="All levels"
          onSecondary={() => setLevelIdx(null)}
          extra={
            <View className="mt-2 items-center">
              <Stars count={result.stars} size={26} />
              <Text className="mt-1 font-body-semi text-sm text-ink-mute">
                {moves} moves (par {level.par}) · {mm}:{ss}
              </Text>
            </View>
          }
        />
      )}
    </GradientScreen>
  );
}
