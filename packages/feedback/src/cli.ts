/**
 * Review CLI. The only file in this package that touches the outside world.
 *
 *   npm run review -w @blueberry/feedback              prints the copy as Markdown
 *   npm run review -w @blueberry/feedback -- --count   prints the coverage numbers only
 *
 * Runs the sources directly with `node --experimental-strip-types`, so a
 * reviewer does not need a build to read the copy. Everything it prints comes
 * from `review.ts` and `registry.ts`, which are pure.
 */

import { copyCoverage } from "./registry.ts";
import { renderCopyReview } from "./review.ts";

function main(argv: readonly string[]): number {
  const countOnly = argv.includes("--count");
  const coverage = copyCoverage();

  if (countOnly) {
    process.stdout.write(`causes defined by chem-core: ${coverage.defined}\n`);
    process.stdout.write(`causes with authored copy:   ${coverage.covered}\n`);
    process.stdout.write(`missing: ${coverage.missing.length === 0 ? "none" : coverage.missing.join(", ")}\n`);
    process.stdout.write(`unknown: ${coverage.extra.length === 0 ? "none" : coverage.extra.join(", ")}\n`);
  } else {
    process.stdout.write(`${renderCopyReview()}\n`);
  }

  return coverage.missing.length === 0 && coverage.extra.length === 0 ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
