import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import {
  chemCoreSourceFingerprint,
  readMutationRecord,
  type MutationRecord,
} from "../../measure/mutation-record.ts";

/**
 * The mutation score gate.
 *
 * BUILD-PROMPT.md Phase 1 exit: mutation testing on chem-core at or above 80 percent
 * killed. CLAUDE.md lists mutation survival rate under the measured half of the
 * correctness axis, which is the one axis with no human gate at all.
 *
 * WHERE THE SLOW PART RUNS, AND WHY IT IS NOT HERE.
 *
 * A full Stryker run over chem-core takes about three minutes on this machine. This check
 * has to run on every `npm run validate`, which is the command a builder runs after every
 * edit. Putting three minutes inside it would mean the whole suite gets run once a day
 * instead of once an edit, and a suite nobody waits for is a suite nobody runs. So the
 * measurement is its own command, `npm run mutate`, and this check reads what it recorded.
 *
 * WHY THAT IS A GATE AND NOT A DECORATION.
 *
 * Three failure modes, all of them loud:
 *
 *   NEVER MEASURED. No record on disk fails. A missing number must never read as a fine
 *   one, which is the same rule the budget gates already follow for apps/web.
 *
 *   STALE. The record carries a fingerprint of every chem-core source file the run
 *   measured. This recomputes it. One changed byte and the recorded score is no longer a
 *   statement about the code that is there, so the check fails as STALE and names the
 *   command to fix it. Editing chem-core therefore forces a fresh mutation run before the
 *   suite can be green again. Without this the gate would be a number somebody measured
 *   once and then coasted on, which is exactly the shape of check this repository keeps
 *   refusing to add.
 *
 *   BELOW THRESHOLD. 80 is from BUILD-PROMPT.md and is not a tuning knob. It is asserted
 *   here AND by `thresholds.break` in packages/chem-core/stryker.config.json, so lowering
 *   it takes two deliberate edits in two packages rather than one quiet one.
 *
 * The threshold recorded in the run is compared against the one this check enforces, so a
 * record produced under a loosened Stryker config cannot satisfy a check that still
 * expects 80.
 */

/** BUILD-PROMPT.md Phase 1 exit condition. Fixed. Never adjust to make a run pass. */
const REQUIRED_MUTATION_SCORE = 80;

const HOW_TO_FIX = "run `npm run mutate` from the repository root";

function describe(record: MutationRecord): string {
  return (
    `${record.mutationScore.toFixed(2)} percent killed ` +
    `(${record.killed} killed, ${record.survived} survived, ${record.timeout} timeout, ` +
    `${record.noCoverage} with no coverage, ${record.totalMutants} mutants total)`
  );
}

export const mutationScore: Check = {
  name: "mutation-chem-core-score",
  description:
    "the recorded Stryker score for packages/chem-core is at or above 80 percent killed, and was measured against the chem-core sources currently on disk",

  async run(): Promise<CheckResult> {
    const fingerprint = await chemCoreSourceFingerprint();
    const read = await readMutationRecord();

    if (read.status === "absent") {
      return failed([
        {
          expected: `a recorded mutation score of at least ${REQUIRED_MUTATION_SCORE} percent`,
          actual:
            `packages/chem-core/mutation/last-run.json does not exist, so chem-core has ` +
            `never been mutation tested in this checkout. No number is reported, because ` +
            `no number was measured. To fix, ${HOW_TO_FIX}.`,
          fixture: "packages/chem-core/mutation/last-run.json",
        },
      ]);
    }

    if (read.status === "unreadable") {
      return failed([
        {
          expected: "a mutation record this build can read",
          actual: `${read.reason}. To fix, ${HOW_TO_FIX}.`,
          fixture: "packages/chem-core/mutation/last-run.json",
        },
      ]);
    }

    const record = read.record;
    const failures: CheckFailure[] = [];

    if (record.sourceFingerprint !== fingerprint.fingerprint) {
      failures.push({
        expected:
          `the recorded score to describe the chem-core sources on disk ` +
          `(${fingerprint.fileCount} files, fingerprint ${fingerprint.fingerprint.slice(0, 16)})`,
        actual:
          `STALE: it was measured against ${record.fileCount} file(s) with fingerprint ` +
          `${record.sourceFingerprint.slice(0, 16)}, recorded ${record.recordedAt}. ` +
          `chem-core has changed since, so ${describe(record)} is a statement about code ` +
          `that is no longer there. To fix, ${HOW_TO_FIX}.`,
        fixture: "packages/chem-core/mutation/last-run.json",
      });
    }

    if (record.mutationScore < REQUIRED_MUTATION_SCORE) {
      failures.push({
        expected: `at least ${REQUIRED_MUTATION_SCORE} percent of mutants killed`,
        actual:
          `${describe(record)}. Each survivor is a statement that some behaviour of ` +
          `chem-core is unasserted. The fix is an assertion that would fail if that ` +
          `behaviour changed, never a lower threshold.`,
        fixture: "packages/chem-core/mutation/last-run.json",
      });
    }

    if (record.thresholdBreak < REQUIRED_MUTATION_SCORE) {
      failures.push({
        expected: `packages/chem-core/stryker.config.json to break below ${REQUIRED_MUTATION_SCORE} percent`,
        actual:
          `the recorded run used a break threshold of ${record.thresholdBreak}. A score ` +
          `measured under a loosened config is not evidence against the fixed one.`,
        fixture: "packages/chem-core/stryker.config.json",
      });
    }

    if (record.totalMutants === 0) {
      failures.push({
        expected: "Stryker to generate at least one mutant from packages/chem-core/src",
        actual:
          "the record says zero mutants, so a score of any value is a statement about " +
          "nothing. Check the `mutate` glob in stryker.config.json.",
        fixture: "packages/chem-core/mutation/last-run.json",
      });
    }

    const budgets = [
      {
        name: "chem-core mutation score, Stryker, killed over valid mutants",
        measured: describe(record),
        ceiling: `at least ${REQUIRED_MUTATION_SCORE} percent`,
        passed: record.mutationScore >= REQUIRED_MUTATION_SCORE,
      },
      {
        name: "mutation record freshness against the chem-core sources on disk",
        measured:
          record.sourceFingerprint === fingerprint.fingerprint
            ? `fresh, ${fingerprint.fileCount} files, measured ${record.recordedAt} with Stryker ${record.strykerVersion}`
            : "STALE, the sources have changed since the score was measured",
        ceiling: "fingerprint identical",
        passed: record.sourceFingerprint === fingerprint.fingerprint,
      },
    ];

    const notMeasurable = [
      {
        property: "whether a surviving mutant is equivalent",
        reason:
          "Some mutants cannot change behaviour: an unreachable defensive branch, or an " +
          "arithmetic change on a value that is always one. Deciding that is a human " +
          "judgement about the code, and this harness counts survivors rather than " +
          "adjudicating them. The score is therefore a floor on how well tested the package " +
          "is, never a claim that the remaining survivors are all real gaps.",
      },
      {
        property: "mutation coverage of packages outside chem-core",
        reason:
          "Stryker is pointed at packages/chem-core/src only, which is what BUILD-PROMPT.md " +
          "Phase 1 asks for. packages/feedback and packages/validators are not mutation " +
          "tested, so this number says nothing about them.",
      },
    ];

    if (failures.length > 0) return failed(failures, { budgets, notMeasurable });
    return passed({ budgets, notMeasurable });
  },
};
