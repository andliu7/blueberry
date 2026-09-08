/**
 * EVERY QUESTION A LESSON SERVES CARRIES A VISUAL.
 *
 * Owner ruling 1 of 2026-09-04: "a question that is only prose has already
 * lost the student". `src/lesson/lessonFigures.ts` is the authored table that
 * makes that true, and a table is only as good as the thing that notices when
 * the corpus outgrows it. So this walks the REAL served corpus rather than
 * the table's own key list: the table proving itself against itself would
 * pass forever while a newly authored question shipped as a wall of text.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not assert the chemistry. No
 * check here can tell 2,3-dimethylbut-2-ene from 2,3-dimethylbut-1-ene, and
 * one that pretended to would be a check that teaches a reviewer to stop
 * reading. The chemistry in that file is authored and reviewed by a person,
 * exactly as `packages/feedback`'s copy is. What is mechanised is COVERAGE
 * (every served question has a scheme, every candidate has a picture),
 * KEYING (no figure is authored against a problem or an option id the corpus
 * does not have, which is what catches a rename) and the drawing INVARIANTS
 * that would silently produce a broken picture.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SEED_CORPUS, type Problem } from "@blueberry/curriculum";
import { optionFigureFor, optionFigureKeys, schemeFor, schemeKeys, type Scheme } from "../lesson/lessonFigures";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

/**
 * The answer kinds a lesson serves today, mirrored from `SERVED_KINDS` in
 * src/tabs/courses/courseCopy.ts.
 *
 * MIRRORED, AND THE MIRROR IS CHECKED, which is the whole point of the test
 * directly below. The honest way to write this would be to import
 * `problemsForTopic` and read the app's own gate, and that import does not
 * work: CoursesTab pulls in the i18n store, which touches `document` at
 * module load, and this suite runs in a node environment with no DOM (see
 * vitest.config.ts, which says React components are judged by the human gate
 * rather than unit tested). Rather than stub a DOM to reach one constant, or
 * quietly let a copy drift, the copy is asserted against the source text. A
 * kind added there and not here fails HERE, not in front of a student.
 */
const SERVED_KINDS: readonly string[] = ["major_product", "reagents", "structure"];

/* Moved 2026-09-05. SERVED_KINDS lived in CoursesTab.tsx until the course copy
   and the served-kinds gate were lifted into courseCopy.ts, so that three
   eagerly-loaded modules could import the DATA without pinning the whole lazy
   Courses tab into the entry chunk. The constant is unchanged and so is every
   assertion below; only where it is read from moved. */
const COURSES_TAB = "tabs/courses/courseCopy.ts";

describe("the mirror of what a lesson serves", () => {
  it("matches the courses tab's own list", () => {
    const source = readFileSync(new URL(`../${COURSES_TAB}`, import.meta.url), "utf8");
    const declaration = /const SERVED_KINDS = new Set\(\[([^\]]*)\]\)/.exec(source);
    // A miss here is a rename or a refactor of that constant, and it must
    // fail rather than pass on an empty match.
    expect(declaration, `${COURSES_TAB} no longer declares SERVED_KINDS as a Set literal`).not.toBeNull();
    const declared = [...(declaration?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect([...declared].sort()).toEqual([...SERVED_KINDS].sort());
  });
});

/** Every problem a student can actually reach through the courses tab. */
function servedProblems(): readonly Problem[] {
  return SEED_CORPUS.filter((problem) => SERVED_KINDS.includes(problem.answer.kind));
}

describe("the served corpus", () => {
  it("is not empty, so an empty pass cannot be mistaken for coverage", () => {
    expect(servedProblems().length).toBeGreaterThan(0);
  });

  it("gives every question a drawn scheme", () => {
    for (const problem of servedProblems()) {
      expect(schemeFor(problem.id), `${problem.id} has no scheme, so it would reach a student as prose`).not.toBeNull();
    }
  });

  it("gives every candidate product a picture, because option cards are pictures with captions", () => {
    for (const problem of servedProblems()) {
      if (problem.answer.kind !== "major_product") continue;
      for (const candidate of problem.answer.candidates) {
        expect(
          optionFigureFor(problem.id, candidate.id),
          `${problem.id}::${candidate.id} has no figure`,
        ).not.toBeNull();
      }
    }
  });
});

describe("the figure table stays keyed to the corpus", () => {
  const ids = new Set(SEED_CORPUS.map((problem) => problem.id));

  it("authors no scheme against a problem id the corpus does not have", () => {
    for (const key of schemeKeys()) {
      expect(ids.has(key), `${key} is not a corpus problem id`).toBe(true);
    }
  });

  it("authors no option figure against an option the problem does not offer", () => {
    for (const key of optionFigureKeys()) {
      const [problemId, optionId] = key.split("::");
      const problem = SEED_CORPUS.find((candidate) => candidate.id === problemId);
      expect(problem, `${key} names no corpus problem`).toBeDefined();
      expect(problem?.answer.kind, key).toBe("major_product");
      const options = problem?.answer.kind === "major_product" ? problem.answer.candidates : [];
      expect(
        options.some((option) => option.id === optionId),
        `${key} names no candidate on that problem`,
      ).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Drawing invariants                                                   */
/* ------------------------------------------------------------------ */

function everyFigure(): readonly { readonly where: string; readonly figure: Figure }[] {
  const out: { where: string; figure: Figure }[] = [];
  for (const key of schemeKeys()) {
    const scheme = schemeFor(key) as Scheme;
    out.push({ where: `${key} left`, figure: scheme.left });
    if (scheme.right !== undefined) out.push({ where: `${key} right`, figure: scheme.right });
  }
  for (const key of optionFigureKeys()) {
    const [problemId, optionId] = key.split("::");
    out.push({ where: key, figure: optionFigureFor(problemId ?? "", optionId ?? "") as Figure });
  }
  return out;
}

describe("every drawing is inside its box and is actually a drawing", () => {
  it("draws something in every figure", () => {
    for (const { where, figure } of everyFigure()) {
      const marks = (figure.bonds?.length ?? 0) + (figure.labels?.length ?? 0);
      expect(marks, `${where} is an empty figure`).toBeGreaterThan(0);
    }
  });

  /**
   * The viewBox is 120 by 84 and `StructureFigure` uses `meet`, so a bond
   * outside it is not clipped: it silently shrinks EVERY OTHER figure on the
   * screen to fit, which is how one stray coordinate makes a whole option set
   * look wrong. A small margin is allowed for a label, whose glyph box the
   * renderer places around its anchor rather than inside these bounds.
   */
  it("keeps every bond endpoint inside the viewBox", () => {
    for (const { where, figure } of everyFigure()) {
      for (const bond of figure.bonds ?? []) {
        for (const [axis, value, limit] of [
          ["x1", bond.x1, FIGURE_WIDTH],
          ["x2", bond.x2, FIGURE_WIDTH],
          ["y1", bond.y1, FIGURE_HEIGHT],
          ["y2", bond.y2, FIGURE_HEIGHT],
        ] as const) {
          expect(value, `${where} ${axis}`).toBeGreaterThanOrEqual(0);
          expect(value, `${where} ${axis}`).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  it("draws no zero length bond, which renders as nothing at all", () => {
    for (const { where, figure } of everyFigure()) {
      for (const bond of figure.bonds ?? []) {
        expect(Math.hypot(bond.x2 - bond.x1, bond.y2 - bond.y1), where).toBeGreaterThan(1);
      }
    }
  });

  /**
   * A bond drawn twice between the same two points is the failure mode the
   * ring helper's comment names: a double bond laid over a single one is
   * three lines, which reads as a triple bond. Direction is normalised
   * because a bond drawn back to front is the same two lines.
   */
  it("draws no bond twice over the same two points", () => {
    for (const { where, figure } of everyFigure()) {
      const seen = new Set<string>();
      for (const bond of figure.bonds ?? []) {
        const ends = [`${bond.x1},${bond.y1}`, `${bond.x2},${bond.y2}`].sort().join("-");
        expect(seen.has(ends), `${where} draws ${ends} twice`).toBe(false);
        seen.add(ends);
      }
    }
  });
});

describe("the scheme asks exactly one thing", () => {
  /**
   * A predict-the-product question leaves the RIGHT hand side open and states
   * its reagents; a supply-the-reagents question states both sides and leaves
   * the ARROW open. A scheme that stated everything would be a diagram with
   * no question in it, and one that stated nothing would be unanswerable.
   */
  it("leaves the product open when the product is the answer", () => {
    for (const problem of servedProblems()) {
      if (problem.answer.kind !== "major_product") continue;
      const scheme = schemeFor(problem.id) as Scheme;
      expect(scheme.right, problem.id).toBeUndefined();
      expect(scheme.over, problem.id).toBeDefined();
    }
  });

  it("draws both sides and leaves the arrow open when the reagents are the answer", () => {
    for (const problem of servedProblems()) {
      if (problem.answer.kind !== "reagents") continue;
      const scheme = schemeFor(problem.id) as Scheme;
      expect(scheme.right, problem.id).toBeDefined();
      expect(scheme.over, problem.id).toBeUndefined();
    }
  });
});
