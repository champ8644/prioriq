/** @type {import('jest').Config} */
export default {
  // ts-jest in pure-ESM mode
  preset: "ts-jest/presets/default-esm",

  // All tests will run in the Node runtime **unless** a file asks for jsdom
  testEnvironment: "node",

  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }],
  },

  transformIgnorePatterns: [
    "node_modules/(?!(p-queue|p-timeout|eventemitter3)/)",
  ],

  moduleFileExtensions: ["ts", "tsx", "js"],
  roots: ["<rootDir>/test"],

  testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.tsx"],

  collectCoverage: true,
  coverageDirectory: "coverage",

  fakeTimers: { legacyFakeTimers: true },

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
