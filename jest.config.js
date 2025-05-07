module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        // Compile modules down to CommonJS so Jest can run them
        useESM: false,

        // Point to your TS config
        tsconfig: "tsconfig.json",
      },
    ],
  },

  // Transform p-queue, p-timeout, and eventemitter3 (ESM) through ts-jest
  transformIgnorePatterns: [
    "node_modules/(?!(p-queue|p-timeout|eventemitter3)/)",
  ],

  moduleFileExtensions: ["ts", "js"],
  roots: ["<rootDir>/test"],

  collectCoverage: true,
  coverageDirectory: "coverage",
  testMatch: ["**/test/**/*.test.ts"],

  fakeTimers: {
    legacyFakeTimers: true,
  },

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
