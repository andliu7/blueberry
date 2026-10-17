import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The landing page does not admit to being unfinished.
 *
 * It has twice shipped copy that said so out loud: six invented testimonials
 * under a line reading "(these are fake testimonials)", and two plan cards
 * priced "TBD" sitting in the row beside ones that could be bought. Both were
 * on the one screen a stranger uses to decide whether the site is real.
 *
 * This pins the class of defect rather than either instance. A word from this
 * list in a landing file is either untrue copy or an admission that some is,
 * and both belong somewhere the funnel is not.
 *
 * A source scan and not a render test, on purpose: this suite runs in node with
 * no DOM, and the repository's position is that React components are judged by
 * eye. The copy is a string in the source either way, which is what is asserted.
 */
// The testimonials carousel and its data were deleted with the home rebuild (SITE-REPLAN.md
// section 7 has no praise section), so their rows went with them; the new home files joined.
const LANDING_FILES = [
  "src/components/HomePage.tsx",
  "src/components/HomeHero.tsx",
  "src/components/HomeLoader.tsx",
  "src/components/HomePhoneDemo.tsx",
  "src/components/HomeDestinations.tsx",
  "src/lib/homeDemo.ts",
  "src/components/ui/subscription-plans.tsx",
  "src/data/site.ts",
];

const UNSHIPPABLE = /fake|lorem|TBD|placeholder/i;

/**
 * Code with the comments blanked out, line numbering intact.
 *
 * A comment is not copy. It never reaches the screen, and the comment explaining
 * why a placeholder was removed would otherwise trip the check that removed it.
 * Block comments are replaced space for space rather than deleted so the line
 * numbers in a failure still point at the file.
 */
function screenCopy(source: string): string[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""));
}

describe("landing page copy", () => {
  for (const file of LANDING_FILES) {
    it(`${file} admits to nothing unfinished`, () => {
      const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      // Reported with line numbers, because "the file has a match" is not enough
      // to act on in a file of several hundred lines.
      const offenders = screenCopy(source)
        .map((line, i) => ({ at: `${file}:${i + 1}`, text: line.trim() }))
        .filter(({ text }) => UNSHIPPABLE.test(text))
        .map(({ at, text }) => `${at}: ${text}`);
      expect(offenders).toEqual([]);
    });
  }
});
