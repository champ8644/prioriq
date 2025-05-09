import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register ts-node loader
register("ts-node/esm", pathToFileURL("./"));

// Get the script passed via CLI args
const [, , scriptPath] = process.argv;

if (!scriptPath) {
  console.error(
    "Error: No script provided. Usage: npm run run-tool -- tools/something.mts"
  );
  process.exit(1);
}

// Dynamically import and run the target .mts file
await import(pathToFileURL(scriptPath).href);
