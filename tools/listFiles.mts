import fg from "fast-glob";
import ignore from "ignore";
import { readFileSync, writeFileSync } from "node:fs";
import { cwd } from "node:process";
import { join } from "node:path";

// CONFIG
const config = {
  includes: [
    // "src/**", // everything under src/
    "test/**", // everything under test/
    "*", // only shallow root-level files
  ],
  excludes: [
    "tools/file-list.txt", // prevent self-inclusion
    "README.md",
    "package-lock.json",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
  ],
};

// Load and merge .gitignore + config excludes
const ig = ignore();
try {
  const gitignorePath = join(cwd(), ".gitignore");
  const gitignoreContent = readFileSync(gitignorePath, "utf8");
  ig.add(gitignoreContent);
} catch {
  console.warn(
    "⚠️  No .gitignore found in project root. Proceeding without filtering."
  );
}
ig.add(config.excludes);

// Glob match files
const matchedPaths = fg.sync(config.includes, {
  cwd: cwd(),
  onlyFiles: true,
  dot: true,
  absolute: false,
});

// Filter against .gitignore
const filteredPaths = matchedPaths
  .map((path) => path.replace(/\\/g, "/"))
  .filter((path) => !ig.ignores(path));

// Read file contents
const results = filteredPaths.map((relativePath) => ({
  name: "./" + relativePath,
  content: readFileSync(relativePath, "utf8"),
}));

const output = results.map((f) => `${f.name}\n---\n${f.content}`).join("\n\n");

writeFileSync("dump/file-list.txt", output, "utf-8");
console.log(
  `File list saved to dump/file-list.txt (matched ${results.length} files)`
);
