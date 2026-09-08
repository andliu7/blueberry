import type {
  Check,
  CheckContext,
  CheckFailure,
  CheckResult,
  NotMeasurable,
} from "../../check.ts";
import { failed, passed } from "../../check.ts";
import {
  CONSERVATION_CHECK_NAMES,
  FIXTURE_SCHEMA_VERSION,
  loadCorpus,
  NON_FIXTURE_FILES,
  type ConservationCheckName,
  type FixtureLoadError,
  type LoadedFixture,
  LOADER_CHECK_NAME,
} from "./fixture-schema.ts";

/**
 * The one check in this family that is the loader rather than a violation finder.
 *
 * WHY THE LOADER NEEDS A NAME AT ALL.
 *
 * Every check here begins by loading the corpus, and every check reports every load error
 * as its own failure. That is right for a fixture nobody meant to be unloadable, and it
 * leaves no way to express the other case: a fixture whose whole point is that the loader
 * MUST refuse it. The fourth pass adversary filed one, a pathway with two steps carrying
 * the same id, and the honest place to catch that is the loader; the long note in
 * `parsePathway` argues why it is not a chemistry violation and carries no CauseId.
 *
 * So a refusal is read exactly the way a violation is read, through `expect.mustFail`:
 *
 *   fixture refused, and it named this check in mustFail    the negative control fired.
 *                                                           No failure, in this check or
 *                                                           in any other.
 *   fixture refused, and it did not                         every check fails on it, as
 *                                                           before. Nothing is loosened.
 *   fixture named this check and loaded fine                this check fails: the negative
 *                                                           control did not fire. Handled
 *                                                           by the ordinary rule below,
 *                                                           because a loaded fixture
 *                                                           produces no violation here.
 *
 * THE ONE THING THIS DOES LOOSEN, SAID OUT LOUD.
 *
 * A fixture that declares this check is accepted as a fired control for ANY refusal, not
 * only the refusal its note describes. If such a fixture later rots into a different schema
 * error, it still reads as the control firing. Two things hold that down and neither is a
 * promise: the declaration is only readable when `<root>.expect` itself parsed, so a file
 * that is not JSON, or whose header or expectation is malformed, cannot claim the exemption
 * and fails hard; and every accepted refusal is printed in this check's NOT MEASURABLE
 * section on every run, with the exact refusal message, so a changed reason is visible in
 * the output rather than only in a diff. Narrowing it further would mean matching the
 * message text, and a check that greps its own error strings breaks on rewording.
 */
export { LOADER_CHECK_NAME };

/** Did this fixture declare, in its own file, that the loader must refuse it? */
export function declaresLoaderRefusal(error: FixtureLoadError): boolean {
  return error.expect?.mustFail.includes(LOADER_CHECK_NAME) === true;
}

/**
 * The shared body every check in this family runs, and the rule that makes the corpus
 * two sided.
 *
 * A check author writes a `ViolationFinder`: given one fixture, return every place the
 * chemistry is wrong. Nothing else. This file decides what a violation MEANS, using the
 * fixture's own `expect` declaration:
 *
 *   good fixture                        every violation is a failure.
 *   broken, this check in mustFail      NO violation is a failure. The negative control
 *                                       did not fire, so the check is not proven to work.
 *   broken, this check not in mustFail  every violation is a failure. A broken fixture
 *                                       has to break exactly the checks it declares, or
 *                                       the declaration is not describing the fixture.
 *
 * That third rule is the one worth defending. Without it a single fixture that fails
 * everything would satisfy every negative control at once, and the family would be proven
 * to fire without any check being proven to fire ON THE RIGHT THING. With it, cascades
 * have to be written down, and a cascade that is written down is a cascade an adversary
 * can argue with.
 *
 * Two more rules, both of which turn deletion into a red run:
 *
 *   - A check with no negative control anywhere in the corpus FAILS. Deleting the fixture
 *     that proves a check works does not quietly turn that check into decoration.
 *   - An empty corpus FAILS. Every check in this family is a statement about fixtures,
 *     and a statement about nothing is not evidence.
 *
 * A finder that throws is recorded as a failure against the fixture it threw on, never as
 * a skip and never as a fired negative control. A check that crashes has not decided
 * anything, and a broken fixture is required to fail cleanly rather than by explosion.
 */

/** One thing a finder found wrong. Rendered verbatim into the report. */
export interface Violation {
  /** The value that would be correct. Compact and comparable, not prose. */
  readonly expected: string;
  /** The value actually found. */
  readonly actual: string;
  /** Where in the fixture, for example "step-1.to / species acetone / atom O1". */
  readonly where: string;
  /**
   * The chem-core CauseId this maps to, when one fits.
   *
   * Carried so the feedback axis can count named causes reachable from the validator
   * corpus, and so a failure line says what a student would be told rather than only what
   * the arithmetic did.
   */
  readonly cause: string;
}

export type ViolationFinder = (fixture: LoadedFixture) => readonly Violation[];

/**
 * A check from this family, with its violation finder still reachable.
 *
 * WHY THE FINDER IS EXPOSED AT ALL.
 *
 * `run` deliberately swallows violations on a fixture that declared this check in
 * `mustFail`: a negative control that fires is the check working, not a failure. That is
 * correct for reporting a verdict and useless for measuring, because the fixtures whose
 * causes the feedback axis needs to count are exactly the ones whose violations `run`
 * consumes. So `checks/feedback/named-causes.ts` calls the finder directly and reads the
 * `cause` off each violation.
 *
 * This is additive. `run` is unchanged, the registry is unchanged, and nothing in this
 * file behaves differently. The alternative was for the feedback check to recompute the
 * chemistry itself, which would make the number it reports a statement about a second
 * implementation rather than about the one the suite runs.
 */
export interface ConservationFamilyCheck extends Check {
  readonly find: ViolationFinder;
}

/** Whether a registered check carries a violation finder. Narrowing, not a cast. */
export function isConservationFamilyCheck(check: Check): check is ConservationFamilyCheck {
  return typeof (check as Partial<ConservationFamilyCheck>).find === "function";
}

function render(fixture: LoadedFixture, violation: Violation): CheckFailure {
  return {
    expected: `${violation.where}: ${violation.expected}`,
    actual: `${violation.actual}  [cause: ${violation.cause}]`,
    fixture: fixture.relativePath,
  };
}

interface FamilyCheckInput {
  readonly name: ConservationCheckName;
  readonly description: string;
  readonly find: ViolationFinder;
}

/** Build one Check from a violation finder. Every check in this family is made here. */
export function conservationCheck(input: FamilyCheckInput): ConservationFamilyCheck {
  return {
    name: input.name,
    description: input.description,
    find: input.find,

    async run(context: CheckContext): Promise<CheckResult> {
      const failures: CheckFailure[] = [];
      const corpus = await loadCorpus(context.fixtures, context.packageRoot);
      const isLoaderCheck = input.name === LOADER_CHECK_NAME;
      let negativeControls = 0;
      const acceptedRefusals: NotMeasurable[] = [];

      for (const error of corpus.loadErrors) {
        if (declaresLoaderRefusal(error)) {
          // A fixture that declared the loader must refuse it, and it did. The control
          // fired. Not a failure here and not a failure in any other check in the family,
          // because there is exactly one fixture and exactly one verdict on it.
          if (isLoaderCheck) {
            negativeControls += 1;
            acceptedRefusals.push({
              property: `${error.relativePath} was refused by the loader, as it declares it must be`,
              reason:
                `${error.message}  ---  the declaration is in the file's own expect.mustFail, ` +
                `and it is printed here every run so that a refusal for a DIFFERENT reason than ` +
                `the fixture was written for is visible in the output rather than only in a diff.`,
            });
          }
          continue;
        }
        failures.push({
          expected: `the fixture parses against the v${FIXTURE_SCHEMA_VERSION} fixture schema`,
          actual: error.message,
          fixture: error.relativePath,
        });
      }

      for (const stray of corpus.strayFiles) {
        failures.push({
          expected:
            `a file in fixtures/ either ends in .fixture.json or is one of: ` +
            `${NON_FIXTURE_FILES.join(", ")}`,
          actual: "neither, so it raises the fixture count while no check ever reads it",
          fixture: stray,
        });
      }

      if (corpus.fixtures.length === 0) {
        failures.push({
          expected: "at least one fixture to run against",
          actual: "the corpus is empty, so this check verified nothing",
          fixture: "packages/validators/fixtures/",
        });
        return failed(failures);
      }

      for (const fixture of corpus.fixtures) {
        const declaredToFailHere = fixture.expect.mustFail.includes(input.name);
        if (declaredToFailHere) negativeControls += 1;

        let violations: readonly Violation[];
        try {
          violations = input.find(fixture);
        } catch (error) {
          failures.push({
            expected: "the check reaches a verdict on this fixture",
            actual: `it threw: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
            fixture: fixture.relativePath,
          });
          continue;
        }

        if (declaredToFailHere) {
          if (isLoaderCheck) {
            // The loader check has no violations to report: a fixture that reached this
            // loop is one the loader ACCEPTED, which is precisely the failure.
            failures.push({
              expected: `the loader refuses this fixture, which is what it declares in expect.mustFail`,
              actual:
                `it parsed cleanly and became a pathway, so ${LOADER_CHECK_NAME} is not proven ` +
                `to fire on it. Either the schema rule this fixture was written against was ` +
                `removed, or the fixture was edited into something the schema accepts. ` +
                `The fixture says: ${fixture.expect.note}`,
              fixture: fixture.relativePath,
            });
            continue;
          }
          if (violations.length === 0) {
            failures.push({
              expected: `${input.name} reports at least one violation on this negative control`,
              actual:
                `it reported none, so ${input.name} is not proven to fire. ` +
                `The fixture says: ${fixture.expect.note}`,
              fixture: fixture.relativePath,
            });
          }
          continue;
        }

        for (const violation of violations) {
          const rendered = render(fixture, violation);
          if (fixture.expect.kind === "broken") {
            failures.push({
              expected: `${rendered.expected}  (this fixture does not declare ${input.name} in mustFail)`,
              actual: rendered.actual,
              fixture: rendered.fixture,
            });
          } else {
            failures.push(rendered);
          }
        }
      }

      if (negativeControls === 0) {
        failures.push({
          expected: `at least one fixture naming ${input.name} in expect.mustFail`,
          actual:
            "none in the corpus, so this check has never been observed to fail and is " +
            "not evidence of anything",
          fixture: "packages/validators/fixtures/",
        });
      }

      const extra = acceptedRefusals.length === 0 ? undefined : { notMeasurable: acceptedRefusals };
      if (failures.length > 0) return failed(failures, extra);
      return passed(extra);
    },
  };
}

/**
 * Sanity on the family itself, run by every check rather than by one of them.
 *
 * Exported so index.ts can assert the names it registers are exactly the names the
 * fixtures are allowed to reference. If those two lists ever drift, a fixture's mustFail
 * entry points at a check that does not run.
 */
export function conservationCheckNames(): readonly ConservationCheckName[] {
  return CONSERVATION_CHECK_NAMES;
}
