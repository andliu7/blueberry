import { rmSync, cpSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Copies the finished build into `docs/`, which is what GitHub Pages serves.
 *
 * A script rather than a line in the README because that line was shell
 * specific. `rm -rf`, `cp -r` and `touch` do not exist in Windows PowerShell,
 * and PowerShell 5.1 rejects `&&` as a separator outright, so the documented
 * one-liner failed on the machine this project is actually developed on. Node
 * does the same work identically on every platform.
 */

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const docs = resolve(root, "docs");

if (!existsSync(dist)) {
  console.error("No dist/ folder. Run `npm run build` first.");
  process.exit(1);
}

rmSync(docs, { recursive: true, force: true });
cpSync(dist, docs, { recursive: true });

// Stops GitHub Pages running the output through Jekyll, which would drop any
// file or folder beginning with an underscore.
writeFileSync(resolve(docs, ".nojekyll"), "");

console.log("Copied dist/ to docs/. Commit and push to publish.");
