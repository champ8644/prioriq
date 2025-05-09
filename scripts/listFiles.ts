import fs from "fs";
import path from "path";

function readFilesRecursively(dir: string): void {
  function recurse(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        recurse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        console.log(`${fullPath}\n---\n${content}\n`);
      }
    }
  }

  recurse(dir);
}

readFilesRecursively(path.resolve("src"));
