import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { join } from "path";

const logPath = join("dump", "test-output.txt");
const outStream = createWriteStream(logPath, { flags: "w" });

const jest = spawn("npx", ["jest", "--config", "jest.config.mjs"], {
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
  env: {
    ...process.env,
    FORCE_COLOR: "1", // force color in console
  },
});

jest.stdout.on("data", (chunk) => {
  process.stdout.write(chunk); // to console (with color)
  outStream.write(chunk.toString().replace(/\x1B\[[0-9;]*m/g, "")); // to file (no ANSI)
});

jest.stderr.on("data", (chunk) => {
  process.stderr.write(chunk); // errors to console
  outStream.write(chunk.toString().replace(/\x1B\[[0-9;]*m/g, "")); // to file
});

jest.on("close", (code) => {
  outStream.end();
  process.exit(code);
});
