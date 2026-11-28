import { starsFor } from "../src/games/challenges";
import { SPOT_LEVELS } from "../src/games/spot/levels";
import {
  findPoints,
  HATS,
  makeScene,
  missionFor,
  SPOT_DEFAULTS,
  themeFor,
  THEMES,
  torchAt,
  VARIANTS,
} from "../src/games/spot/logic";
import { createRng } from "../src/lib/random";

/** The buddies that complete the mission (what the player must tap). */
const answers = (s) =>
  s.buddies
    .map((b, i) => ({ b, i }))
    .filter(
      ({ b }) =>
        b.variant === s.mission.target && (s.mission.type !== "hat" || b.hat === s.mission.hat),
    )
    .map(({ i }) => i);

describe("Where's Pom? scenes", () => {
  const configs = [
    SPOT_DEFAULTS,
    { disguise: 0.8, bushes: 6 },
    { crowd: 20, growth: 3 },
    { missions: ["many"] },
    { missions: ["hat"], disguise: 0.9 },
  ];

  test("every scene's mission matches exactly its targets, on screen and never under a bush", () => {
    for (const cfg of configs) {
      const rand = createRng(4);
      for (let round = 0; round < 15; round++) {
        const s = makeScene(round, rand, cfg);
        const c = { ...SPOT_DEFAULTS, ...cfg };
        expect(s.buddies).toHaveLength(Math.min(c.maxCrowd, c.crowd + round * c.growth));
        expect(VARIANTS).toContain(s.mission.target);
        expect(s.targets).toHaveLength(s.mission.count);
        expect(answers(s).sort()).toEqual([...s.targets].sort());
        if (s.mission.type !== "many") expect(s.mission.count).toBe(1);
        if (s.mission.type === "hat") {
          expect(HATS).toContain(s.mission.hat);
          // Look-alikes: the same buddy in other hats.
          const same = s.buddies.filter((b) => b.variant === s.mission.target);
          expect(same.length).toBeGreaterThan(1);
        }
        s.buddies.forEach((b) => {
          expect(b.x).toBeGreaterThan(0);
          expect(b.x).toBeLessThan(1);
          expect(b.y).toBeGreaterThan(0);
          expect(b.y).toBeLessThan(1);
        });
        s.targets.forEach((t) => {
          const tb = s.buddies[t];
          s.bushes.forEach((b) => expect(Math.hypot(b.x - tb.x, b.y - tb.y)).toBeGreaterThan(b.r));
        });
        if (c.bushes) expect(s.bushes.length).toBe(c.bushes);
        expect(THEMES).toContain(s.theme);
        if (s.bonus) {
          expect(["clock", "star"]).toContain(s.bonus.kind);
          s.buddies.forEach((b) =>
            expect(Math.hypot(b.x - s.bonus.x, b.y - s.bonus.y)).toBeGreaterThan(0.02),
          );
        }
      }
    }
  });

  test("missions unlock as you go, and levels can pick their own", () => {
    const rand = createRng(1);
    expect(missionFor(0, rand)).toBe("one");
    expect(missionFor(1, rand)).toBe("one");
    const later = new Set(Array.from({ length: 200 }, () => missionFor(8, rand)));
    expect([...later].sort()).toEqual(["hat", "many", "one"]);
    expect(missionFor(0, rand, { missions: ["hat"] })).toBe("hat");
  });

  test("places rotate, the night park comes later, and levels can fix the place", () => {
    expect(themeFor(0)).toBe("park");
    expect([0, 1, 2, 3].map((r) => themeFor(r))).not.toContain("night");
    expect(new Set(Array.from({ length: 8 }, (_, r) => themeFor(r)))).toEqual(new Set(THEMES));
    expect(themeFor(5, { themes: ["snow"] })).toBe("snow");
  });

  test("the torch sweeps the whole night park", () => {
    let minX = 1;
    let maxX = 0;
    for (let t = 0; t < 30; t += 0.1) {
      const p = torchAt(t);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
    }
    expect(minX).toBeLessThan(0.2);
    expect(maxX).toBeGreaterThan(0.8);
  });

  test("no two buddies share a spot", () => {
    const s = makeScene(10, createRng(2), { crowd: 30 });
    for (let i = 0; i < s.buddies.length; i++)
      for (let j = i + 1; j < s.buddies.length; j++) {
        const a = s.buddies[i];
        const b = s.buddies[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.02);
      }
  });

  test("quick finds, streaks and bigger missions score more", () => {
    expect(findPoints(1, 0)).toBeGreaterThan(findPoints(5, 0));
    expect(findPoints(3, 6)).toBeGreaterThan(findPoints(3, 0));
    expect(findPoints(30, 0)).toBe(10);
    expect(findPoints(30, 0, 3)).toBeGreaterThan(findPoints(30, 0, 1));
  });
});

describe("Where's Pom? levels", () => {
  test.each(SPOT_LEVELS.map((l, i) => [i + 1, l]))("level %i is clearable", (n, level) => {
    const c = { ...SPOT_DEFAULTS, ...level.config };
    // Scenes with several targets take a little longer.
    const slow = c.missions?.includes("many") ? 1.4 : c.themes?.includes("night") ? 1.5 : 1;
    const play = (every, missEvery) => {
      let t = 0;
      let found = 0;
      let streak = 0;
      let score = 0;
      let k = 0;
      while (true) {
        k++;
        if (missEvery && k % missEvery === 0) {
          t += c.penalty;
          streak = 0;
        }
        t += every * slow;
        if (t > c.duration) break;
        found++;
        score += findPoints(every * slow, streak);
        streak++;
      }
      return { found, score };
    };
    expect(starsFor(level, play(2.5, 0))).toBe(3);
    expect(starsFor(level, play(5, 4))).toBeGreaterThanOrEqual(1);
  });
});
