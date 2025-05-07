module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Treat .ts files as ESM if need true ESM support; otherwise we force ts-jest to compile to CJS
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        // compile modules down to CommonJS so "import" in node_modules works
        useESM: false,
      },
    ],
  },

  // By default everything under node_modules is skipped.
  // This pattern says "except p-queue and eventemitter3"—so they get transformed.
  transformIgnorePatterns: [
    // transform ESM in p-queue and its ESM dependencies:
    "node_modules/(?!(p-queue|p-timeout|eventemitter3)/)",
  ],

  moduleFileExtensions: ["ts", "js"],
  roots: ["<rootDir>/test"],

  collectCoverage: true,
  coverageDirectory: "coverage",
  testMatch: ["**/test/**/*.test.ts"],

  globals: {
    "ts-jest": {
      // keep moduleInterop if we were using it
      tsconfig: "tsconfig.json",
    },
  },
};
