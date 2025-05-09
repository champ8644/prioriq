/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",

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

  moduleNameMapper: {
    // Required to resolve .js imports in ESM
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  moduleFileExtensions: ["ts", "tsx", "js"],

  collectCoverage: true,
  coverageDirectory: "coverage",

  projects: [
    {
      displayName: "core",
      testEnvironment: "node",
      testMatch: ["**/test/**/*.test.ts"],
      fakeTimers: { legacyFakeTimers: true },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      roots: ["<rootDir>/test"],
    },
    {
      displayName: "react",
      testEnvironment: "jsdom",
      testMatch: ["**/test/**/*.test.tsx"],
      fakeTimers: { legacyFakeTimers: true },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      roots: ["<rootDir>/test"],
    },
  ],
};
