// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const jestGlobals = Object.fromEntries(
  [
    "afterAll",
    "afterEach",
    "beforeAll",
    "beforeEach",
    "describe",
    "expect",
    "it",
    "jest",
    "test",
  ].map((name) => [name, "readonly"]),
);

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*"],
  },
  {
    files: ["__tests__/**/*.js", "jest.setup.js"],
    languageOptions: { globals: jestGlobals },
  },
]);
