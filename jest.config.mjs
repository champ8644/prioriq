/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",

  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },

  transformIgnorePatterns: [
    "node_modules/(?!(p-queue|p-timeout|eventemitter3)/)",
  ],

  moduleFileExtensions: ["ts", "tsx", "js"],
  roots: ["<rootDir>/test"],

  // ✅ Use testMatch instead of testRegex
  testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.tsx"],

  collectCoverage: true,
  coverageDirectory: "coverage",

  fakeTimers: {
    legacyFakeTimers: true,
  },

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
