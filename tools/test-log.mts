import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";

// Run Jest with color enabled
const proc = spawn("npx", ["jest", "--config", "jest.config.mjs", "--color"], {
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
});

const out = createWriteStream("dump/test-output.txt", { flags: "w" });

proc.stdout.pipe(process.stdout); // show on screen with color
proc.stdout.pipe(out); // also write to file
proc.stderr.pipe(process.stderr); // forward errors

proc.on("exit", (code) => {
  process.exit(code ?? 1);
});
