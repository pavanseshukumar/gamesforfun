#!/usr/bin/env node
/**
 * Renders the app icon, Android adaptive icon layers, splash image and
 * favicon from the same mascot geometry as src/components/Mascot.js.
 *
 *     node scripts/generate-icons.mjs
 *
 * Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`
 * if it isn't already available). Writes into assets/.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets");
const ANTON = readFileSync(
  join(ROOT, "node_modules/@expo-google-fonts/anton/400Regular/Anton_400Regular.ttf"),
).toString("base64");

const MASCOTS = {
  zip: { base: "#FF9F1C", light: "#FFD27A", dark: "#E06C00" },
  bloop: { base: "#4D8CFF", light: "#9CC6FF", dark: "#2557D6" },
  gloop: { base: "#2BD67B", light: "#9AF5C0", dark: "#11A058" },
  pip: { base: "#FF6FB1", light: "#FFB8D9", dark: "#D63F86" },
  sunny: { base: "#FFD43B", light: "#FFF08A", dark: "#E0A100" },
};
const BODY =
  "M100 50 C150 50 176 88 176 128 C176 170 144 196 100 196 C56 196 24 170 24 128 C24 88 50 50 100 50 Z";

function accessory(variant, c) {
  switch (variant) {
    case "zip":
      return `<path d="M38 86 Q100 52 162 86 L158 100 Q100 68 42 100 Z" fill="#FF4D4D"/>
        <path d="M104 66 L92 86 L102 86 L96 100 L112 78 L102 78 L108 66 Z" fill="#FFF3B0"/>`;
    case "gloop":
      return `<path d="M100 54 Q96 34 108 20" stroke="${c.dark}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="110" cy="18" r="13" fill="#FFF56B"/><circle cx="106" cy="14" r="4" fill="#fff" opacity=".9"/>`;
    case "pip":
      return `<path d="M100 58 L72 42 Q64 58 72 74 Z" fill="#FFE14D"/><path d="M100 58 L128 42 Q136 58 128 74 Z" fill="#FFE14D"/>
        <circle cx="100" cy="58" r="9" fill="#FFC300"/>`;
    case "sunny":
      return `<path d="M100 56 L100 34" stroke="#1FA35B" stroke-width="5" stroke-linecap="round"/>
        <path d="M100 38 Q80 18 70 36 Q86 46 100 38 Z" fill="#3DDC84"/><path d="M100 34 Q118 12 132 28 Q116 42 100 34 Z" fill="#2BC46E"/>`;
    default:
      return "";
  }
}

function eyes(variant, mood) {
  if (mood === "cool") {
    return `<rect x="52" y="98" width="44" height="28" rx="12" fill="#141414"/><rect x="104" y="98" width="44" height="28" rx="12" fill="#141414"/>
      <rect x="94" y="106" width="12" height="5" fill="#141414"/>
      <rect x="60" y="103" width="14" height="5" rx="2.5" fill="#fff" opacity=".6"/><rect x="112" y="103" width="14" height="5" rx="2.5" fill="#fff" opacity=".6"/>`;
  }
  const specs =
    variant === "bloop"
      ? `<circle cx="78" cy="112" r="25" stroke="#141414" stroke-width="5" fill="none"/><circle cx="122" cy="112" r="25" stroke="#141414" stroke-width="5" fill="none"/>
         <path d="M96 108 Q100 102 104 108" stroke="#141414" stroke-width="5" fill="none"/>`
      : "";
  return `<ellipse cx="78" cy="112" rx="17" ry="20" fill="#fff"/><ellipse cx="122" cy="112" rx="17" ry="20" fill="#fff"/>
    <circle cx="82" cy="115" r="10" fill="#141414"/><circle cx="118" cy="115" r="10" fill="#141414"/>
    <circle cx="86" cy="110" r="3.5" fill="#fff"/><circle cx="122" cy="110" r="3.5" fill="#fff"/>${specs}`;
}

function mouth(mood) {
  if (mood === "wow") return `<ellipse cx="100" cy="152" rx="11" ry="13" fill="#5A1A1A"/>`;
  if (mood === "cheer")
    return `<path d="M76 144 Q100 178 124 144 Z" fill="#5A1A1A"/><path d="M88 158 Q100 170 112 158 Q100 152 88 158 Z" fill="#FF6B81"/>`;
  return `<path d="M84 146 Q100 162 116 146" stroke="#5A1A1A" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

/** One mascot as an SVG fragment in a 200×220 box. */
function mascot(variant, mood = "happy", { shadow = true } = {}) {
  const c = MASCOTS[variant];
  const id = `g-${variant}-${mood}`;
  const arms =
    mood === "cheer"
      ? `<ellipse cx="20" cy="104" rx="12" ry="24" fill="${c.base}" transform="rotate(-38 20 104)"/>
         <ellipse cx="180" cy="104" rx="12" ry="24" fill="${c.base}" transform="rotate(38 180 104)"/>
         <circle cx="8" cy="86" r="11" fill="${c.light}"/><circle cx="192" cy="86" r="11" fill="${c.light}"/>`
      : `<ellipse cx="30" cy="140" rx="13" ry="22" fill="${c.dark}" transform="rotate(20 30 140)"/>
         <ellipse cx="170" cy="140" rx="13" ry="22" fill="${c.dark}" transform="rotate(-20 170 140)"/>`;
  return `
    <defs><radialGradient id="${id}" cx="38%" cy="30%" r="75%">
      <stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/>
    </radialGradient></defs>
    ${shadow ? `<ellipse cx="100" cy="212" rx="56" ry="7" fill="#1A1A40" opacity=".18"/>` : ""}
    <ellipse cx="74" cy="196" rx="22" ry="12" fill="${c.dark}"/><ellipse cx="126" cy="196" rx="22" ry="12" fill="${c.dark}"/>
    ${arms}
    <path d="${BODY}" fill="url(#${id})"/>
    <ellipse cx="70" cy="80" rx="20" ry="11" fill="#fff" opacity=".5" transform="rotate(-25 70 80)"/>
    <ellipse cx="56" cy="140" rx="12" ry="7" fill="#FF5C8A" opacity=".35"/><ellipse cx="144" cy="140" rx="12" ry="7" fill="#FF5C8A" opacity=".35"/>
    ${mouth(mood)}${accessory(variant, c)}${eyes(variant, mood)}`;
}

const sunnyBg = (w, h) => `
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFF04D"/><stop offset="1" stop-color="#FFC933"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w * 0.12}" cy="${h * 0.1}" r="${w * 0.32}" fill="#fff" opacity=".25"/>
  <circle cx="${w * 0.92}" cy="${h * 0.86}" r="${w * 0.22}" fill="#fff" opacity=".18"/>`;

const sparkles = (w) =>
  [
    [0.17, 0.25, 0.022],
    [0.84, 0.18, 0.016],
    [0.88, 0.42, 0.012],
    [0.1, 0.62, 0.012],
  ]
    .map(([x, y, r]) => `<circle cx="${x * w}" cy="${y * w}" r="${r * w}" fill="#fff"/>`)
    .join("");

/** Places a 200×220 mascot so it is `width` wide with its top-left at (x, y). */
const place = (svgFragment, x, y, width) =>
  `<g transform="translate(${x} ${y}) scale(${width / 200})">${svgFragment}</g>`;

const page = (w, h, body, transparent) => `<!doctype html><html><head><style>
  @font-face { font-family: Anton; src: url(data:font/ttf;base64,${ANTON}); }
  html,body{margin:0;background:${transparent ? "transparent" : "#fff"}}
  svg{display:block}
</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg></body></html>`;

const JOBS = [
  {
    // iOS / store icon: opaque, full bleed
    file: "icon.png",
    w: 1024,
    h: 1024,
    body: sunnyBg(1024, 1024) + sparkles(1024) + place(mascot("zip", "cheer"), 162, 150, 700),
  },
  {
    // Android adaptive icon, background layer
    file: "android-icon-background.png",
    w: 512,
    h: 512,
    body: sunnyBg(512, 512) + sparkles(512),
  },
  {
    // Android adaptive icon, foreground layer: keep inside the central safe zone
    file: "android-icon-foreground.png",
    w: 512,
    h: 512,
    transparent: true,
    body: place(mascot("zip", "cheer", { shadow: false }), 116, 104, 280),
  },
  {
    // Android 13+ themed icon: a single-colour silhouette; the system tints it
    file: "android-icon-monochrome.png",
    w: 432,
    h: 432,
    transparent: true,
    // The mask lives in the silhouette's own (transformed) coordinates, so no extra transform.
    body: `<defs><mask id="m" maskUnits="userSpaceOnUse" x="-20" y="0" width="240" height="230">
        <rect x="-20" y="0" width="240" height="230" fill="#fff"/>
        <ellipse cx="78" cy="112" rx="17" ry="20" fill="#000"/><ellipse cx="122" cy="112" rx="17" ry="20" fill="#000"/>
        <path d="M76 144 Q100 178 124 144 Z" fill="#000"/>
      </mask></defs>
      <g mask="url(#m)" transform="translate(106 96) scale(1.1)" fill="#fff">
        <path d="${BODY}"/><ellipse cx="74" cy="196" rx="22" ry="12"/><ellipse cx="126" cy="196" rx="22" ry="12"/>
        <ellipse cx="20" cy="104" rx="12" ry="24" transform="rotate(-38 20 104)"/><ellipse cx="180" cy="104" rx="12" ry="24" transform="rotate(38 180 104)"/>
        <circle cx="8" cy="86" r="11"/><circle cx="192" cy="86" r="11"/>
      </g>`,
  },
  {
    // Splash: the crew over a wordmark, on a transparent canvas (background colour comes from app.json)
    file: "splash-icon.png",
    w: 1024,
    h: 1024,
    transparent: true,
    body:
      place(mascot("bloop", "cool"), 150, 250, 300) +
      place(mascot("gloop", "wow"), 574, 250, 300) +
      place(mascot("zip", "cheer"), 312, 170, 400) +
      `<text x="512" y="800" text-anchor="middle" font-family="Anton" font-size="150" fill="#141414">GAMES FOR FUN</text>`,
  },
  {
    file: "favicon.png",
    w: 48,
    h: 48,
    transparent: true,
    body:
      `<defs><linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF04D"/><stop offset="1" stop-color="#FFC933"/></linearGradient></defs>
       <rect width="48" height="48" rx="12" fill="url(#fb)"/>` + place(mascot("zip", "happy", { shadow: false }), 4, 2, 40),
  },
];

const browser = await chromium.launch();
const tab = await browser.newPage();
for (const job of JOBS) {
  await tab.setViewportSize({ width: job.w, height: job.h });
  await tab.setContent(page(job.w, job.h, job.body, job.transparent));
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(ASSETS, job.file), omitBackground: !!job.transparent });
  console.log("wrote assets/" + job.file);
}
await browser.close();
