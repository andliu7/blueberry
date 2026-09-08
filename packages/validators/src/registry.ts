import type {
  BudgetResult,
  Check,
  CheckContext,
  CheckFailure,
  NotMeasurable,
} from "./check.ts";

/**
 * Running and aggregating checks.
 *
 * The rules encoded here, each of which exists to close a way a suite can look green
 * while having verified nothing:
 *
 *   - A check that throws is a failed check, never a skipped one.
 *   - A check that reports "fail" with no named cause is itself a failure.
 *   - A registry with zero checks does not pass.
 *   - Two checks with the same name is a hard error, because one silently shadows the
 *     other in the report and you cannot tell which one ran.
 */

export interface CheckOutcome {
  readonly name: string;
  readonly description: string;
  readonly status: "pass" | "fail";
  readonly failures: readonly CheckFailure[];
  readonly budgets: readonly BudgetResult[];
  readonly notMeasurable: readonly NotMeasurable[];
  readonly durationMs: number;
}

export interface SuiteOutcome {
  readonly passed: boolean;
  readonly checksRun: number;
  readonly passedCount: number;
  readonly failedCount: number;
  /** True when no checks were registered at all. Reported separately from a failure. */
  readonly emptyRegistry: boolean;
  readonly outcomes: readonly CheckOutcome[];
}

/** Throws on a malformed registry. Called before anything runs. */
export function assertRegistryValid(checks: readonly Check[]): void {
  const seen = new Set<string>();
  for (const check of checks) {
    if (typeof check.name !== "string" || check.name.trim() === "") {
      throw new Error("a registered check has an empty name");
    }
    if (seen.has(check.name)) {
      throw new Error(
        `duplicate check name: ${check.name}. Two checks with one name means the report ` +
          `cannot say which of them ran.`,
      );
    }
    seen.add(check.name);
    if (typeof check.run !== "function") {
      throw new Error(`check ${check.name} has no run() function`);
    }
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

export async function runChecks(
  checks: readonly Check[],
  context: CheckContext,
): Promise<SuiteOutcome> {
  assertRegistryValid(checks);

  const outcomes: CheckOutcome[] = [];

  for (const check of checks) {
    const startedAt = performance.now();
    let outcome: CheckOutcome;

    try {
      const result = await check.run(context);
      const failures = result.failures ?? [];

      if (result.status === "fail" && failures.length === 0) {
        outcome = {
          name: check.name,
          description: check.description,
          status: "fail",
          failures: [
            {
              expected: "a failing check names its cause",
              actual: "status fail with an empty failure list",
              fixture: "n/a, defect in the check itself",
            },
          ],
          budgets: result.budgets ?? [],
          notMeasurable: result.notMeasurable ?? [],
          durationMs: performance.now() - startedAt,
        };
      } else if (result.status === "pass" && failures.length > 0) {
        outcome = {
          name: check.name,
          description: check.description,
          status: "fail",
          failures: [
            {
              expected: "status pass with no failures",
              actual: `status pass with ${failures.length} failure(s) attached`,
              fixture: "n/a, defect in the check itself",
            },
            ...failures,
          ],
          budgets: result.budgets ?? [],
          notMeasurable: result.notMeasurable ?? [],
          durationMs: performance.now() - startedAt,
        };
      } else {
        outcome = {
          name: check.name,
          description: check.description,
          status: result.status,
          failures,
          budgets: result.budgets ?? [],
          notMeasurable: result.notMeasurable ?? [],
          durationMs: performance.now() - startedAt,
        };
      }
    } catch (error) {
      outcome = {
        name: check.name,
        description: check.description,
        status: "fail",
        failures: [
          {
            expected: "check runs to completion",
            actual: `threw ${errorMessage(error)}`,
            fixture: "n/a, the check did not reach a fixture verdict",
          },
        ],
        budgets: [],
        notMeasurable: [],
        durationMs: performance.now() - startedAt,
      };
    }

    outcomes.push(outcome);
  }

  const failedCount = outcomes.filter((outcome) => outcome.status === "fail").length;
  const passedCount = outcomes.length - failedCount;
  const emptyRegistry = outcomes.length === 0;

  return {
    // An empty registry does not pass. A suite that checks nothing has proved nothing.
    passed: failedCount === 0 && !emptyRegistry,
    checksRun: outcomes.length,
    passedCount,
    failedCount,
    emptyRegistry,
    outcomes,
  };
}
