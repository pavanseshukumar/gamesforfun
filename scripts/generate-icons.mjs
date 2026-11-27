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

// The buddies, drawn with the same geometry as src/components/Mascot.js
// (happy pose, arms down). Only the ones the icons use need to be here.
const BUDDIES = {
  mochi: { base: "#B08CFF", light: "#DCCBFF", dark: "#7E58E0" },
  bun: { base: "#FFB3CF", light: "#FFE3EE", dark: "#E57FA6" },
  rex: { base: "#4FCF7A", light: "#A9F2C2", dark: "#239A50" },
  blink: { base: "#9C5CFF", light: "#CBA8FF", dark: "#6A2FD6" },
  pengu: { base: "#2F3E6E", light: "#5D6FA8", dark: "#1B2650" },
  spike: { base: "#FF7A45", light: "#FFC09E", dark: "#E04E1A" },
};
const BODY =
  "M100 50 C150 50 176 88 176 128 C176 170 144 196 100 196 C56 196 24 170 24 128 C24 88 50 50 100 50 Z";

const twoEyes = `<ellipse cx="78" cy="112" rx="17" ry="20" fill="#fff"/><ellipse cx="122" cy="112" rx="17" ry="20" fill="#fff"/>
  <circle cx="82" cy="115" r="10" fill="#141414"/><circle cx="118" cy="115" r="10" fill="#141414"/>
  <circle cx="86" cy="110" r="3.5" fill="#fff"/><circle cx="122" cy="110" r="3.5" fill="#fff"/>`;
const cheeks = `<ellipse cx="56" cy="140" rx="12" ry="7" fill="#FF5C8A" opacity=".35"/><ellipse cx="144" cy="140" rx="12" ry="7" fill="#FF5C8A" opacity=".35"/>`;

function mouth(mood) {
  if (mood === "wow") return `<ellipse cx="100" cy="152" rx="11" ry="13" fill="#5A1A1A"/>`;
  if (mood === "cheer")
    return `<path d="M76 144 Q100 178 124 144 Z" fill="#5A1A1A"/><path d="M88 158 Q100 170 112 158 Q100 152 88 158 Z" fill="#FF6B81"/>`;
  return `<path d="M84 146 Q100 162 116 146" stroke="#5A1A1A" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

/** Per-buddy parts: behind the body (ears, horns) and on top (face details, special eyes). */
function parts(variant, c) {
  switch (variant) {
    case "mochi":
      return {
        back: `<path d="M52 82 L58 32 L92 58 Z" fill="${c.dark}"/><path d="M148 82 L142 32 L108 58 Z" fill="${c.dark}"/><path d="M60 70 L63 44 L82 58 Z" fill="#FFB8D9"/><path d="M140 70 L137 44 L118 58 Z" fill="#FFB8D9"/>`,
        front: `<path d="M40 132 L64 136 M40 144 L64 142 M160 132 L136 136 M160 144 L136 142" stroke="#5A3A8A" stroke-width="3" stroke-linecap="round"/><path d="M95 136 L105 136 L100 142 Z" fill="#FF6FB1"/>`,
        eyes: twoEyes,
      };
    case "bun":
      return {
        back: `<ellipse cx="74" cy="36" rx="16" ry="38" fill="${c.base}" transform="rotate(-10 74 36)"/><ellipse cx="126" cy="36" rx="16" ry="38" fill="${c.base}" transform="rotate(10 126 36)"/><ellipse cx="74" cy="40" rx="7" ry="26" fill="#fff" opacity=".7" transform="rotate(-10 74 40)"/><ellipse cx="126" cy="40" rx="7" ry="26" fill="#fff" opacity=".7" transform="rotate(10 126 40)"/>`,
        front: `<ellipse cx="100" cy="137" rx="7" ry="5" fill="#E5487F"/>`,
        eyes: twoEyes,
      };
    case "rex":
      return {
        back: `<path d="M64 62 L72 36 L84 56 L96 30 L108 54 L122 34 L134 62 Z" fill="#FFB020"/><path d="M168 170 Q196 176 192 150 Q184 166 166 160 Z" fill="${c.dark}"/>`,
        front: `<circle cx="64" cy="168" r="6" fill="${c.dark}" opacity=".5"/><circle cx="136" cy="172" r="5" fill="${c.dark}" opacity=".5"/>`,
        eyes: twoEyes,
      };
    case "blink":
      return {
        back: `<path d="M62 70 Q52 40 70 30 Q66 52 78 62 Z" fill="#FFE14D"/><path d="M138 70 Q148 40 130 30 Q134 52 122 62 Z" fill="#FFE14D"/>`,
        front: `<circle cx="60" cy="170" r="5" fill="#FFE14D" opacity=".8"/><circle cx="146" cy="160" r="6" fill="#FFE14D" opacity=".8"/>`,
        eyes: `<ellipse cx="100" cy="108" rx="30" ry="32" fill="#fff"/><circle cx="104" cy="113" r="16" fill="#2BD67B"/><circle cx="104" cy="113" r="9" fill="#141414"/><circle cx="110" cy="106" r="5" fill="#fff"/>`,
      };
    case "pengu":
      return {
        back: "",
        front: `<path d="M100 74 C140 74 156 104 156 136 C156 172 132 190 100 190 C68 190 44 172 44 136 C44 104 60 74 100 74 Z" fill="#fff"/>`,
        eyes: twoEyes,
        beak: `<path d="M88 134 L112 134 L100 150 Z" fill="#FFB020"/>`,
      };
    case "spike":
      return {
        back: `<path d="M38 96 L22 84 L44 80 L36 58 L58 66 L60 42 L78 58 L90 34 L100 54 L112 32 L122 58 L140 42 L142 66 L164 58 L156 80 L178 84 L162 96 Z" fill="${c.dark}"/>`,
        front: "",
        eyes: twoEyes,
      };
    default:
      return { back: "", front: "", eyes: twoEyes };
  }
}

/** One buddy as an SVG fragment in a 200×220 box. */
function mascot(variant, mood = "happy", { shadow = true } = {}) {
  const c = BUDDIES[variant];
  const p = parts(variant, c);
  const id = `g-${variant}-${mood}`;
  const feet = variant === "pengu" ? "#FF9F1C" : c.dark;
  return `
    <defs><radialGradient id="${id}" cx="38%" cy="30%" r="75%">
      <stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/>
    </radialGradient></defs>
    ${shadow ? `<ellipse cx="100" cy="212" rx="56" ry="7" fill="#1A1A40" opacity=".18"/>` : ""}
    ${p.back}
    <ellipse cx="74" cy="196" rx="22" ry="12" fill="${feet}"/><ellipse cx="126" cy="196" rx="22" ry="12" fill="${feet}"/>
    <ellipse cx="30" cy="140" rx="13" ry="22" fill="${c.dark}" transform="rotate(20 30 140)"/>
    <ellipse cx="170" cy="140" rx="13" ry="22" fill="${c.dark}" transform="rotate(-20 170 140)"/>
    <path d="${BODY}" fill="url(#${id})"/>
    <ellipse cx="70" cy="80" rx="20" ry="11" fill="#fff" opacity=".5" transform="rotate(-25 70 80)"/>
    ${p.front}${cheeks}${p.beak ?? mouth(mood)}${p.eyes}`;
}

// Cotton candy: pink top-left, through lilac, to baby blue bottom-right.
const CANDY = ["#FF9BCF", "#D7B6FF", "#9FD3FF"];
const candyBg = (w, h) => `
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${CANDY[0]}"/><stop offset=".55" stop-color="${CANDY[1]}"/><stop offset="1" stop-color="${CANDY[2]}"/>
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
    body: candyBg(1024, 1024) + sparkles(1024) + place(mascot("spike", "cheer"), 162, 150, 700),
  },
  {
    // Android adaptive icon, background layer
    file: "android-icon-background.png",
    w: 512,
    h: 512,
    body: candyBg(512, 512) + sparkles(512),
  },
  {
    // Android adaptive icon, foreground layer: keep inside the central safe zone
    file: "android-icon-foreground.png",
    w: 512,
    h: 512,
    transparent: true,
    body: place(mascot("spike", "cheer", { shadow: false }), 116, 104, 280),
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
      place(mascot("blink", "happy"), 150, 250, 300) +
      place(mascot("rex", "wow"), 574, 250, 300) +
      place(mascot("mochi", "cheer"), 312, 170, 400) +
      `<text x="512" y="800" text-anchor="middle" font-family="Anton" font-size="190" fill="#141414">PLAYZO</text>`,
  },
  {
    file: "favicon.png",
    w: 48,
    h: 48,
    transparent: true,
    body:
      `<defs><linearGradient id="fb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${CANDY[0]}"/><stop offset=".55" stop-color="${CANDY[1]}"/><stop offset="1" stop-color="${CANDY[2]}"/></linearGradient></defs>
       <rect width="48" height="48" rx="12" fill="url(#fb)"/>` + place(mascot("spike", "happy", { shadow: false }), 4, 2, 40),
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
