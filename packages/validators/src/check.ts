/**
 * The contract every validator check implements.
 *
 * This file is the interface a check author codes against. It is deliberately small.
 * A check receives paths and returns a verdict plus enough detail to print the report
 * format in .claude/agents/chem-validator.md. It does not print, it does not decide exit
 * codes, and it does not know about the lock.
 *
 * To add a check:
 *   1. Write a module under src/checks/ exporting a `Check`.
 *   2. Add it to the array in src/checks/index.ts.
 * That is the whole registration path. src/cli.ts never changes.
 */

export type CheckStatus = "pass" | "fail";

/**
 * One concrete thing that was wrong.
 *
 * expected and actual are printed verbatim, so make them values a human can compare at
 * a glance, not prose. "charge sum 0" and "charge sum -1", not "charge was wrong".
 */
export interface CheckFailure {
  readonly expected: string;
  readonly actual: string;
  /**
   * Path to the fixture that produced this failure, package relative where possible.
   * When a check has no fixture, say so plainly rather than inventing a path.
   */
  readonly fixture: string;
}

/** A measured number against a ceiling from the Budgets table in CLAUDE.md. */
export interface BudgetResult {
  readonly name: string;
  /** The measured value with units, for example "142 KB gzipped". */
  readonly measured: string;
  /** The ceiling with units, for example "150 KB gzipped". */
  readonly ceiling: string;
  readonly passed: boolean;
}

/**
 * A property this harness cannot measure, named rather than estimated.
 *
 * chem-validator.md: never report a number you did not measure. If the harness for a
 * budget does not exist yet, say the harness does not exist.
 */
export interface NotMeasurable {
  readonly property: string;
  readonly reason: string;
}

/** Everything a check is given. Anything not here, a check has no business reading. */
export interface CheckContext {
  readonly repoRoot: string;
  readonly packageRoot: string;
  readonly fixturesDir: string;
  /** Absolute paths to every fixture file found, sorted. May be empty. */
  readonly fixtures: readonly string[];
}

export interface CheckResult {
  readonly status: CheckStatus;
  /**
   * Every failure the check found, not just the first. An adversary reading one failure
   * per run learns one thing per run.
   * Must be empty when status is "pass" and non empty when status is "fail". The
   * registry enforces this, because a failing check with no stated cause is the generic
   * yellow triangle that CLAUDE.md names as the thing being beaten.
   */
  readonly failures: readonly CheckFailure[];
  readonly budgets?: readonly BudgetResult[];
  readonly notMeasurable?: readonly NotMeasurable[];
}

export interface Check {
  /** Unique, stable, printed in the report. Kebab case. */
  readonly name: string;
  /** One line, for humans reading the registry. */
  readonly description: string;
  run(context: CheckContext): CheckResult | Promise<CheckResult>;
}

/** Convenience for the common passing result. */
export function passed(extra?: Omit<CheckResult, "status" | "failures">): CheckResult {
  return {
    status: "pass",
    failures: [],
    budgets: extra?.budgets ?? [],
    notMeasurable: extra?.notMeasurable ?? [],
  };
}

/** Convenience for the common failing result. Rejects an empty failure list. */
export function failed(
  failures: readonly CheckFailure[],
  extra?: Omit<CheckResult, "status" | "failures">,
): CheckResult {
  if (failures.length === 0) {
    throw new Error("failed() needs at least one failure. A cause-free failure teaches nothing.");
  }
  return {
    status: "fail",
    failures,
    budgets: extra?.budgets ?? [],
    notMeasurable: extra?.notMeasurable ?? [],
  };
}
