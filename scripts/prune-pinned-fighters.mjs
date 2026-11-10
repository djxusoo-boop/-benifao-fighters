// Keep originals in public/. Only omit matching, immutable assets from the deployment build.
import { createHash } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import pinned from "../build/pinned-fighters.json" with { type: "json" };

const root = path.resolve("dist/client/assets/new-fighters");
let removed = 0;
for (const [name, expected] of Object.entries(pinned)) {
  const filename = path.resolve(root, name);
  if (!filename.startsWith(root + path.sep)) throw new Error("Invalid asset path");
  try {
    const content = await readFile(filename);
    if (createHash("sha256").update(content).digest("hex") === expected) {
      await unlink(filename);
      removed++;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
console.log(`Deployment: ${removed} original PNG assets served from the pinned repository.`);
