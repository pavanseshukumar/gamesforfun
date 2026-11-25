import { fitSize, greetingLines, textWidth } from "../src/lib/fitText";

describe("headline sizing", () => {
  test("wide letters take more room than narrow ones", () => {
    expect(textWidth("WWW", 10)).toBeGreaterThan(textWidth("AAA", 10));
    expect(textWidth("AAA", 10)).toBeGreaterThan(textWidth("III", 10));
  });

  test("fitted text never exceeds the width", () => {
    for (const t of ["Hey Sam!", "Hey Maximiliana!", "WWWWWWWWWWWWWW"]) {
      const size = fitSize(t, 358, 200);
      expect(textWidth(t, size)).toBeLessThanOrEqual(358);
    }
    expect(fitSize("Hi", 358, 84)).toBe(84);
  });

  test("short names stay on one big line", () => {
    const lines = greetingLines("Sam", 358);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Hey Sam!");
    expect(lines[0].size).toBe(84);
  });

  test("long names get their own line and stay readable", () => {
    const lines = greetingLines("Christopherson", 358);
    expect(lines.map((l) => l.text)).toEqual(["Hey", "Christopherson!"]);
    expect(lines[1].size).toBeGreaterThanOrEqual(44);
    expect(textWidth(lines[1].text, lines[1].size)).toBeLessThanOrEqual(358);
    // Even 14 of the widest letter stays legible.
    expect(greetingLines("WWWWWWWWWWWWWW", 358)[1].size).toBeGreaterThanOrEqual(30);
  });

  test("blank names fall back to Player", () => {
    expect(greetingLines("  ", 358)[0].text).toBe("Hey Player!");
  });
});
