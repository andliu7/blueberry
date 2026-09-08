import {
  allCauseIds,
  causeCount,
  causeDefinition,
  type CauseId,
} from "@blueberry/chem-core";

import type { Check, CheckContext, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import { conservationChecks } from "../conservation/index.ts";
import {
  declaresLoaderRefusal,
  isConservationFamilyCheck,
  LOADER_CHECK_NAME,
  type Violation,
} from "../conservation/family.ts";
import { loadCorpus, type LoadedFixture } from "../conservation/fixture-schema.ts";

/**
 * The feedback axis, measured.
 *
 * CLAUDE.md makes two numbers the win condition against the bar, whose observed count is
 * one yellow triangle:
 *
 *   count of distinct named failure causes
 *   percentage of wrong attempts resolving to a named cause rather than a generic failure
 *
 * BUILD-PROMPT.md Phase 1 turns the first into a floor of 12 REACHABLE causes, and asks
 * for the second as a reported number. The Budgets table sets it at 90 percent or better.
 *
 * WHAT "REACHABLE" MEANS HERE, AND WHY IT IS NOT causeCount().
 *
 * `causeCount()` is how many causes are DEFINED. A definition nothing can produce teaches
 * nobody, and counting definitions would let the axis be won by typing. Reachable means
 * some fixture in the committed corpus actually makes the engine emit it. So this check
 * runs every conservation violation finder over every fixture and counts the distinct
 * cause ids that come out. Both numbers are reported, because the gap between them is the
 * honest statement of how much of the registry is currently exercised.
 *
 * WHY THE FINDERS ARE CALLED DIRECTLY RATHER THAN THE CHECKS RUN.
 *
 * A family check suppresses violations on a fixture that declared it in `mustFail`, which
 * is right for a verdict and wrong for a count: the broken fixtures are precisely the
 * wrong attempts whose causes this is trying to count. See the note on
 * `ConservationFamilyCheck` in conservation/family.ts.
 *
 * WHAT A "WRONG ATTEMPT" IS IN THIS CORPUS.
 *
 * A fixture declared `expect.kind: "broken"`. That is the closest thing the repository
 * has to a student getting it wrong: a mechanism that is chemically incorrect in a stated
 * way. It resolves to a named cause when at least one violation found on it carries a
 * cause id that is in the chem-core registry.
 *
 * WHAT THIS CHECK CANNOT SEE, STATED SO THE NUMBER IS NOT READ AS MORE.
 *
 * Tier 2, the authored per problem distractor, has no subject yet: packages/curriculum
 * does not exist. The Budgets row is about Tier 1 and Tier 2 together, so the number here
 * is a lower bound on it, and it is reported as a Tier 1 figure rather than as the budget
 * itself. The stereochemistry, sterics, reactivity, and route cause families have no
 * check to emit them yet either, so a low reachable count is a statement about corpus
 * coverage and not about the registry.
 */

/** BUILD-PROMPT.md Phase 1 exit. Fixed. */
const MINIMUM_REACHABLE_CAUSES = 12;

/** CLAUDE.md Budgets: wrong attempts resolved without a model call. Fixed. */
const MINIMUM_NAMED_CAUSE_RATE_PERCENT = 90;

interface FixtureCauses {
  readonly fixture: LoadedFixture;
  readonly causes: readonly string[];
  /** Causes emitted that are not in the chem-core registry. Always a failure. */
  readonly unknown: readonly string[];
  /** A finder that threw. The fixture reached no verdict, so it counts as unresolved. */
  readonly errors: readonly string[];
}

function collect(fixture: LoadedFixture): FixtureCauses {
  const known = new Set<string>(allCauseIds());
  const causes = new Set<string>();
  const unknown = new Set<string>();
  const errors: string[] = [];

  for (const check of conservationChecks) {
    if (!isConservationFamilyCheck(check)) {
      errors.push(`${check.name} carries no violation finder, so its causes cannot be counted`);
      continue;
    }
    let violations: readonly Violation[];
    try {
      violations = check.find(fixture);
    } catch (error) {
      errors.push(
        `${check.name} threw: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
      );
      continue;
    }
    for (const violation of violations) {
      if (known.has(violation.cause)) {
        causes.add(violation.cause);
      } else {
        unknown.add(violation.cause);
      }
    }
  }

  return {
    fixture,
    causes: [...causes].sort(),
    unknown: [...unknown].sort(),
    errors,
  };
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

export const feedbackNamedCauses: Check = {
  name: "feedback-named-causes",
  description:
    "every wrong attempt in the corpus resolves to a named cause from the chem-core registry, at least 12 distinct causes are reachable, and the resolution rate is reported as a number",

  async run(context: CheckContext): Promise<CheckResult> {
    const failures: CheckFailure[] = [];
    const corpus = await loadCorpus(context.fixtures, context.packageRoot);

    // Load errors first, and named rather than folded into an empty corpus. A run where
    // every fixture failed to parse and a run where the directory is empty produce the
    // same count and are completely different problems.
    for (const error of corpus.loadErrors) {
      // A fixture the loader is DECLARED to refuse is not a wrong attempt whose cause went
      // unnamed. It never became a pathway, so no finder ever saw it and it contributes to
      // neither the reachable set nor the rate. conservation-fixture-schema owns the verdict
      // on it and prints the refusal on every run. See LOADER_CHECK_NAME in
      // conservation/family.ts.
      if (declaresLoaderRefusal(error)) continue;
      failures.push({
        expected: "the fixture parses against the fixture schema, so its causes can be counted",
        actual: error.message,
        fixture: error.relativePath,
      });
    }

    if (corpus.fixtures.length === 0) {
      failures.push({
        expected: "at least one fixture to resolve to a named cause",
        actual:
          corpus.loadErrors.length > 0
            ? `no fixture parsed, so no feedback number was measured. ${corpus.loadErrors.filter((error) => !declaresLoaderRefusal(error)).length} unexpected load error(s) above, and ${corpus.loadErrors.filter(declaresLoaderRefusal).length} refusal(s) ${LOADER_CHECK_NAME} accounts for.`
            : "the corpus is empty, so no feedback number was measured",
        fixture: "packages/validators/fixtures/",
      });
      return failed(failures);
    }

    const collected = corpus.fixtures.map(collect);
    const wrongAttempts = collected.filter((entry) => entry.fixture.expect.kind === "broken");

    const reachable = new Set<string>();
    for (const entry of collected) {
      for (const cause of entry.causes) reachable.add(cause);
    }

    // A cause string that is not in the registry is the generic failure this axis exists
    // to eliminate, wearing a name. It fails rather than being counted as unresolved,
    // because it means the engine and the registry disagree about what causes exist.
    for (const entry of collected) {
      for (const unknownCause of entry.unknown) {
        failures.push({
          expected: `every violation to carry a CauseId from the chem-core registry (${causeCount()} defined)`,
          actual: `it carried "${unknownCause}", which is not one`,
          fixture: entry.fixture.relativePath,
        });
      }
      for (const error of entry.errors) {
        failures.push({
          expected: "every conservation finder to reach a verdict on this fixture",
          actual: error,
          fixture: entry.fixture.relativePath,
        });
      }
    }

    const resolved = wrongAttempts.filter((entry) => entry.causes.length > 0);
    const unresolved = wrongAttempts.filter((entry) => entry.causes.length === 0);
    const rate = percent(resolved.length, wrongAttempts.length);

    if (wrongAttempts.length === 0) {
      failures.push({
        expected: "at least one fixture declared expect.kind broken, so the rate means something",
        actual:
          "the corpus contains no wrong attempts, so a rate of 100 percent would be a " +
          "statement about nothing",
        fixture: "packages/validators/fixtures/",
      });
    }

    for (const entry of unresolved) {
      failures.push({
        expected: "this wrong attempt to resolve to a named cause a student can be shown",
        actual:
          `no conservation finder produced any violation on it, so it would reach a ` +
          `student as a generic failure. The fixture says: ${entry.fixture.expect.note}`,
        fixture: entry.fixture.relativePath,
      });
    }

    if (reachable.size < MINIMUM_REACHABLE_CAUSES) {
      failures.push({
        expected: `at least ${MINIMUM_REACHABLE_CAUSES} distinct named causes reachable from the corpus`,
        actual:
          `${reachable.size} reachable out of ${causeCount()} defined. Reached: ` +
          `${[...reachable].sort().join(", ")}`,
        fixture: "packages/validators/fixtures/",
      });
    }

    if (wrongAttempts.length > 0 && rate < MINIMUM_NAMED_CAUSE_RATE_PERCENT) {
      failures.push({
        expected: `at least ${MINIMUM_NAMED_CAUSE_RATE_PERCENT} percent of wrong attempts resolved at Tier 1`,
        actual: `${rate.toFixed(1)} percent (${resolved.length} of ${wrongAttempts.length})`,
        fixture: "packages/validators/fixtures/",
      });
    }

    const byCategory = new Map<string, number>();
    for (const cause of reachable) {
      const category = causeDefinition(cause as CauseId).category;
      byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
    }
    const categoryLine = [...byCategory]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, count]) => `${category} ${count}`)
      .join(", ");

    const budgets = [
      {
        name: "distinct named causes reachable from the corpus",
        measured: `${reachable.size} reachable of ${causeCount()} defined (${categoryLine})`,
        ceiling: `at least ${MINIMUM_REACHABLE_CAUSES}`,
        passed: reachable.size >= MINIMUM_REACHABLE_CAUSES,
      },
      {
        name: "wrong attempts resolving to a named cause, Tier 1 only",
        measured: `${rate.toFixed(1)} percent (${resolved.length} of ${wrongAttempts.length} broken fixtures)`,
        ceiling: `at least ${MINIMUM_NAMED_CAUSE_RATE_PERCENT} percent`,
        passed: wrongAttempts.length > 0 && rate >= MINIMUM_NAMED_CAUSE_RATE_PERCENT,
      },
    ];

    const notMeasurable = [
      {
        property: "Tier 2, the anticipated distractor, in the resolution rate",
        reason:
          "curriculum-corpus now reports Tier 2 COVERAGE on every run, meaning what percentage " +
          "of authored problems could resolve at Tier 2 at all. That is not the same number as " +
          "this one and the two must not be added together: this is a rate over wrong attempts " +
          "in the mechanism fixture corpus, and that is a proportion of problems in a different " +
          "corpus with a different answer shape. Neither is the Budgets row, which covers Tier 1 " +
          "and Tier 2 together over attempts arriving from outside any corpus. The rate above is " +
          "Tier 1 alone and remains a lower bound on it. The field measurement needs real student " +
          "attempts, which arrive with Phases 5 and 6.",
      },
      {
        property: "causes outside the conservation and electron flow families",
        reason:
          `${causeCount() - reachable.size} defined cause(s) were not reached. The ` +
          "stereochemistry, sterics, reactivity, and route families have no check that emits " +
          "them yet, so their absence here is corpus and check coverage, not a claim that the " +
          "registry is wrong. A cause that no check can ever emit is dead weight and should be " +
          "reported by a later phase's adversary.",
      },
      {
        property: "whether the wording of a named cause teaches",
        reason:
          "CLAUDE.md makes that half of the feedback axis a human gate. This check counts " +
          "causes and measures a rate. It cannot read.",
      },
      {
        property: "how much of the rate is independent of the fixture schema",
        reason:
          "The v1 schema refuses a broken fixture that names no check in expect.mustFail, and " +
          "conservation/family.ts fails any check whose declared negative control does not " +
          "fire. Together those two make a rate below 100 percent hard to produce from the " +
          "committed corpus alone: a broken fixture that resolves to nothing would already " +
          "have failed its own family check. So the rate here is currently close to a " +
          "restatement of a corpus invariant, and it becomes an independent measurement the " +
          "moment a wrong attempt can arrive from outside the corpus, which is Phase 2. What " +
          "this check verifies today that nothing else does: every cause string a finder " +
          "emits is a real CauseId, because Violation.cause is typed as a plain string and " +
          "the compiler will not catch a renamed or deleted cause.",
      },
    ];

    if (failures.length > 0) return failed(failures, { budgets, notMeasurable });
    return passed({ budgets, notMeasurable });
  },
};
