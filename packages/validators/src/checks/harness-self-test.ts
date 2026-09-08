import type { Check, CheckContext, CheckFailure, CheckResult } from "../check.ts";
import { failed, passed } from "../check.ts";
import { runChecks } from "../registry.ts";

/**
 * The one check shipped with the skeleton.
 *
 * It is not a chemistry check and it is not a placeholder. It checks the aggregation
 * logic in src/registry.ts, which is the code that decides whether this process exits
 * zero. If that code ever swallows a failure, every chemistry check written later
 * reports green while proving nothing, and nothing else in the suite would notice.
 *
 * A check that always passes would be worse than no check, so this one asserts against
 * real behaviour and fails if the behaviour changes. Flip any assertion below and
 * `npm run validate` exits nonzero. That is the intended way to test the failure path.
 */

const CONTEXT_FOR_SYNTHETIC_CHECKS: CheckContext = {
  repoRoot: "",
  packageRoot: "",
  fixturesDir: "",
  fixtures: [],
};

function alwaysPasses(name: string): Check {
  return {
    name,
    description: "synthetic, passes",
    run: (): CheckResult => passed(),
  };
}

function alwaysFails(name: string): Check {
  return {
    name,
    description: "synthetic, fails",
    run: (): CheckResult =>
      failed([{ expected: "the expected value", actual: "the actual value", fixture: "synthetic" }]),
  };
}

function alwaysThrows(name: string): Check {
  return {
    name,
    description: "synthetic, throws",
    run: (): CheckResult => {
      throw new Error("synthetic explosion");
    },
  };
}

/** Reports "fail" but names no cause. The registry must not let this through as-is. */
function failsWithoutNamingACause(name: string): Check {
  return {
    name,
    description: "synthetic, fails with an empty failure list",
    run: (): CheckResult => ({ status: "fail", failures: [] }),
  };
}

export const harnessSelfTest: Check = {
  name: "harness-self-test",
  description:
    "aggregation in src/registry.ts counts failures, does not swallow throws, and does not pass an empty registry",

  async run(): Promise<CheckResult> {
    const failures: CheckFailure[] = [];
    const site = "packages/validators/src/registry.ts";

    const record = (expected: string, actual: string): void => {
      failures.push({ expected, actual, fixture: `n/a, in-memory check of ${site}` });
    };

    // 1. All passing means the suite passes and reports the right counts.
    const allPass = await runChecks(
      [alwaysPasses("synthetic-pass-a"), alwaysPasses("synthetic-pass-b")],
      CONTEXT_FOR_SYNTHETIC_CHECKS,
    );
    if (!allPass.passed) record("two passing checks give passed=true", `passed=${allPass.passed}`);
    if (allPass.checksRun !== 2) record("checksRun=2", `checksRun=${allPass.checksRun}`);
    if (allPass.passedCount !== 2) record("passedCount=2", `passedCount=${allPass.passedCount}`);
    if (allPass.failedCount !== 0) record("failedCount=0", `failedCount=${allPass.failedCount}`);

    // 2. One failure among passing checks fails the suite and survives into the report.
    const mixed = await runChecks(
      [alwaysPasses("synthetic-pass-a"), alwaysFails("synthetic-fail-a")],
      CONTEXT_FOR_SYNTHETIC_CHECKS,
    );
    if (mixed.passed) record("one failing check gives passed=false", `passed=${mixed.passed}`);
    if (mixed.failedCount !== 1) record("failedCount=1", `failedCount=${mixed.failedCount}`);
    if (mixed.passedCount !== 1) record("passedCount=1", `passedCount=${mixed.passedCount}`);
    const carried = mixed.outcomes.find((outcome) => outcome.name === "synthetic-fail-a");
    if (carried === undefined) {
      record("the failing check appears in outcomes", "it is absent");
    } else if (carried.failures.length !== 1) {
      record("the failure detail is carried through", `${carried.failures.length} failures carried`);
    } else if (carried.failures[0]?.expected !== "the expected value") {
      record(
        "expected/actual survive aggregation unmodified",
        `expected was ${String(carried.failures[0]?.expected)}`,
      );
    }

    // 3. A check that throws is a failure, never a skip.
    const throwing = await runChecks([alwaysThrows("synthetic-throw")], CONTEXT_FOR_SYNTHETIC_CHECKS);
    if (throwing.passed) record("a throwing check gives passed=false", `passed=${throwing.passed}`);
    if (throwing.failedCount !== 1) {
      record("a throwing check counts as one failure", `failedCount=${throwing.failedCount}`);
    }
    if (throwing.checksRun !== 1) {
      record("a throwing check still counts as run", `checksRun=${throwing.checksRun}`);
    }

    // 4. A failure with no named cause is itself reported as a failure with a cause.
    const causeless = await runChecks(
      [failsWithoutNamingACause("synthetic-causeless")],
      CONTEXT_FOR_SYNTHETIC_CHECKS,
    );
    if (causeless.passed) record("a causeless failure gives passed=false", `passed=${causeless.passed}`);
    if ((causeless.outcomes[0]?.failures.length ?? 0) === 0) {
      record(
        "the registry substitutes a named cause for a causeless failure",
        "the failure list was left empty",
      );
    }

    // 5. An empty registry does not pass. A suite that checks nothing has proved nothing.
    const empty = await runChecks([], CONTEXT_FOR_SYNTHETIC_CHECKS);
    if (empty.passed) record("an empty registry gives passed=false", `passed=${empty.passed}`);
    if (!empty.emptyRegistry) record("emptyRegistry=true", `emptyRegistry=${empty.emptyRegistry}`);

    // 6. Duplicate names are rejected before anything runs.
    let duplicateRejected = false;
    try {
      await runChecks(
        [alwaysPasses("synthetic-duplicate"), alwaysPasses("synthetic-duplicate")],
        CONTEXT_FOR_SYNTHETIC_CHECKS,
      );
    } catch {
      duplicateRejected = true;
    }
    if (!duplicateRejected) {
      record("two checks sharing a name is rejected", "the duplicate registry ran");
    }

    if (failures.length > 0) return failed(failures);

    // This check verifies the registry mechanism, not chemistry. It deliberately says
    // nothing about whether chemistry checks are registered: it used to assert that none
    // were, and that claim silently went false the moment the conservation family landed.
    // A self test that narrates other checks goes stale without failing, which is the one
    // thing a self test must never do.
    return passed({});
  },
};
