/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#141414", soft: "#3D3D3D", mute: "#6B6B6B" },
        paper: "#FFFFFF",
        sun: "#FFD43B",
        lime: "#B6F36A",
        sky: "#7DB9FF",
        zip: "#FF9F1C",
        bloop: "#4D8CFF",
        gloop: "#2BD67B",
        pip: "#FF6FB1",
      },
      fontFamily: {
        display: ["Anton_400Regular"],
        body: ["Outfit_500Medium"],
        "body-semi": ["Outfit_600SemiBold"],
        "body-bold": ["Outfit_700Bold"],
        "body-black": ["Outfit_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
