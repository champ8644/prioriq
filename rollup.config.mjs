import path from "path";
import dts from "rollup-plugin-dts";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

const external = ["react", "mitt", "p-queue", "@tanstack/react-query"];

const inputBase = "src/index.ts";
const inputReact = "src/react/index.ts";

export default [
  // 1. Core build (index.ts)
  {
    input: inputBase,
    output: [
      {
        file: "dist/index.js",
        format: "esm",
        sourcemap: true,
      },
      {
        file: "dist/index.cjs",
        format: "cjs",
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      nodeResolve(),
      commonjs(),
      json(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist",
      }),
    ],
  },

  // 2. React build (react/index.ts)
  {
    input: inputReact,
    output: [
      {
        file: "dist/react/index.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      nodeResolve(),
      commonjs(),
      json(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist/react",
      }),
    ],
  },

  // 3. Type declarations (.d.ts for core + react)
  {
    input: inputBase,
    output: [{ file: "dist/index.d.ts", format: "es" }],
    plugins: [dts()],
  },
  {
    input: inputReact,
    output: [{ file: "dist/react/index.d.ts", format: "es" }],
    plugins: [dts()],
  },
];
