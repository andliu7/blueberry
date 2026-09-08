import { allCauseIds, causeCount, causeDefinition } from "@blueberry/chem-core";
import {
  causeCopy,
  copyCount,
  copyCoverage,
  copyIsComplete,
  competingRoutesFor,
} from "@blueberry/feedback";

import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";

/**
 * Every named cause has authored copy.
 *
 * BUILD-PROMPT.md Phase 1 exit: "Every named cause has authored copy." CLAUDE.md says the
 * same thing in one line: a cause without copy is an incomplete cause.
 *
 * WHY THIS EXISTS WHEN THE REGISTRY IS ALREADY A COMPILE ERROR.
 *
 * `CAUSE_COPY` is annotated `Readonly<Record<CauseId, CauseCopy>>`, so a cause with no
 * entry does not build. That is a good guarantee and it is not this one. It is silenced
 * by a single `as` cast, it says nothing when the build is not run, and it produces no
 * number. The feedback axis in CLAUDE.md is measured by a reported figure, and a figure a
 * validator prints on every run is worth more than a build that merely did not fail.
 *
 * The feedback package recommended exactly this check and could not wire it, because it
 * does not own packages/validators. This is the wiring.
 *
 * Both counts come from functions, never from a literal. `causeCount()` and
 * `copyIsComplete()` are the contract; a number typed into this file would be the stale
 * literal CLAUDE.md already had to remove once.
 */
export const feedbackCopyCoverage: Check = {
  name: "feedback-copy-coverage",
  description:
    "every cause id in the chem-core registry has authored student facing copy in packages/feedback, with all three fields written and no orphan entries",

  run(): CheckResult {
    const failures: CheckFailure[] = [];
    const coverage = copyCoverage();

    for (const missing of coverage.missing) {
      const definition = causeDefinition(missing);
      failures.push({
        expected: `authored Tier 1 copy for cause "${missing}" (${definition.category}, ${definition.severity})`,
        actual:
          "none in packages/feedback, so this cause would reach a student with nothing but " +
          "its id, which is the generic failure the named cause registry exists to replace",
        fixture: "packages/feedback/src/copy/",
      });
    }

    for (const extra of coverage.extra) {
      failures.push({
        expected: `every copy entry to name a cause chem-core defines (${causeCount()} defined)`,
        actual: `"${extra}" is authored here and is not a cause id, so it is served to nobody`,
        fixture: "packages/feedback/src/copy/",
      });
    }

    // The three fields exist so a reviewer can check the three jobs independently: what
    // the student did, why it is wrong, and what to look at instead. An entry present
    // with an empty field passes the compile time guarantee and fails the actual one.
    for (const id of allCauseIds()) {
      if (coverage.missing.includes(id)) continue;
      const copy = causeCopy(id);
      for (const field of ["whatYouDid", "why", "lookAt"] as const) {
        if (copy[field].trim() === "") {
          failures.push({
            expected: `cause "${id}" to have a non empty "${field}"`,
            actual: "it is empty or whitespace, so one of the three jobs of Tier 1 copy is unwritten",
            fixture: "packages/feedback/src/copy/",
          });
        }
      }
    }

    // CLAUDE.md, graded chemistry: an advisory has to name the competing pathway, because
    // "strongly disfavoured" without saying what wins instead is the half answer it warns
    // against. Checked here rather than trusted to prose.
    const advisoriesWithoutRoute: string[] = [];
    for (const id of allCauseIds()) {
      if (coverage.missing.includes(id)) continue;
      if (causeDefinition(id).severity !== "advisory") continue;
      if (competingRoutesFor(id).length === 0) advisoriesWithoutRoute.push(id);
    }

    const budgets = [
      {
        name: "named causes with authored Tier 1 copy",
        measured: `${coverage.covered} of ${coverage.defined} (copy entries: ${copyCount()})`,
        ceiling: `all ${causeCount()}`,
        passed: copyIsComplete(),
      },
      {
        name: "advisory causes naming a competing pathway in structured form",
        measured: `${
          allCauseIds().filter((id) => causeDefinition(id).severity === "advisory").length -
          advisoriesWithoutRoute.length
        } of ${allCauseIds().filter((id) => causeDefinition(id).severity === "advisory").length}`,
        ceiling: "reported, not gated here",
        passed: true,
      },
    ];

    const notMeasurable = [
      {
        property: "whether the authored copy teaches",
        reason:
          "CLAUDE.md makes the wording a human review gate and BUILD-PROMPT.md Phase 1 makes " +
          "reading the feedback copy an explicit stop. This check proves the copy exists and " +
          "is complete in shape. `npm run review -w packages/feedback` renders it for a person.",
      },
    ];

    if (advisoriesWithoutRoute.length > 0) {
      notMeasurable.push({
        property: "competing pathway named for every advisory cause",
        reason:
          `${advisoriesWithoutRoute.length} advisory cause(s) carry no structured competing ` +
          `route: ${advisoriesWithoutRoute.join(", ")}. Some advisories genuinely have no ` +
          "single winning alternative, so this is reported for a human rather than failed. " +
          "Whether each is one of those is an authoring judgement.",
      });
    }

    if (failures.length > 0) return failed(failures, { budgets, notMeasurable });
    return passed({ budgets, notMeasurable });
  },
};
