/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0B0A1A", 900: "#0B0A1A", 800: "#131229", 700: "#1C1A3A", 600: "#2A2752" },
        mist: { DEFAULT: "#A9A6D6", 300: "#C9C7EE", 500: "#7C79B0" },
        rush: "#FF6B5B",
        flip: "#A26BFA",
        fusion: "#22C9A8",
        gold: "#FFC94D",
      },
    },
  },
  plugins: [],
};
