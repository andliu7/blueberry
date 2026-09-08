import type { BudgetResult, CheckFailure, NotMeasurable } from "./check.ts";
import type { FixtureScan } from "./fixtures.ts";
import type { SuiteOutcome } from "./registry.ts";

/**
 * The report format is fixed by .claude/agents/chem-validator.md, "Reporting format".
 * The consuming agent reads this text, so the section headings and the shape of the
 * first three lines are a contract, not a style choice.
 */

export interface ReportInput {
  readonly suite: SuiteOutcome;
  /**
   * The verdict, decided by the caller and printed verbatim.
   *
   * Every count on the first line is recomputed here from suite.outcomes rather than
   * read off SuiteOutcome.passed, passedCount, or failedCount. Those three are derived
   * values produced by the same aggregation code the suite is capable of failing on,
   * and a report that trusts them can print "SUITE: pass" directly above a list of
   * failures. That is not hypothetical: it is what this file did on first run, and the
   * harness self test is what caught it.
   */
  readonly passed: boolean;
  readonly integrityLine: string;
  readonly fixtures: FixtureScan;
  readonly previousFixtureCount: number | null;
  /**
   * Failures that belong to the run rather than to any one check, such as a dropped
   * fixture count. They appear under FAILURES so the report never says "SUITE: fail"
   * above an empty failure list.
   */
  readonly suiteLevelFailures: readonly (CheckFailure & { readonly name: string })[];
  /** Lines printed above the report, for anything that must be read before the verdict. */
  readonly leadingWarnings: readonly string[];
}

function collectBudgets(suite: SuiteOutcome): BudgetResult[] {
  return suite.outcomes.flatMap((outcome) => [...outcome.budgets]);
}

function collectNotMeasurable(suite: SuiteOutcome): NotMeasurable[] {
  return suite.outcomes.flatMap((outcome) => [...outcome.notMeasurable]);
}

export function formatReport(input: ReportInput): string {
  const { suite, fixtures, previousFixtureCount } = input;
  const lines: string[] = [];

  // Recomputed from raw outcomes. See the note on ReportInput.passed.
  const failing = suite.outcomes.filter((outcome) => outcome.status === "fail");
  const checksRun = suite.outcomes.length;
  const failedCount = failing.length;
  const passedCount = checksRun - failedCount;

  for (const warning of input.leadingWarnings) lines.push(warning);
  if (input.leadingWarnings.length > 0) lines.push("");

  lines.push(
    `SUITE: ${input.passed ? "pass" : "fail"}   checks run: ${checksRun}   ` +
      `passed: ${passedCount}   failed: ${failedCount}`,
  );
  lines.push(`SUITE INTEGRITY: ${input.integrityLine}`);
  lines.push(
    `FIXTURE COUNT: ${fixtures.count}   (previous run: ` +
      `${previousFixtureCount === null ? "none recorded" : String(previousFixtureCount)})`,
  );

  lines.push("");
  lines.push("FAILURES");
  const emptyRegistry = checksRun === 0;
  if (emptyRegistry) {
    lines.push("  registry");
    lines.push("    expected: at least one registered check");
    lines.push("    actual:   zero checks registered in src/checks/index.ts");
    lines.push("    fixture:  n/a");
  }
  for (const failure of input.suiteLevelFailures) {
    lines.push(`  ${failure.name}`);
    lines.push(`    expected: ${failure.expected}`);
    lines.push(`    actual:   ${failure.actual}`);
    lines.push(`    fixture:  ${failure.fixture}`);
  }
  if (failedCount === 0 && !emptyRegistry && input.suiteLevelFailures.length === 0) {
    lines.push("  none");
  }
  for (const outcome of failing) {
    lines.push(`  ${outcome.name}`);
    for (const failure of outcome.failures) {
      lines.push(`    expected: ${failure.expected}`);
      lines.push(`    actual:   ${failure.actual}`);
      lines.push(`    fixture:  ${failure.fixture}`);
    }
  }

  lines.push("");
  lines.push("BUDGETS");
  const budgets = collectBudgets(suite);
  if (budgets.length === 0) {
    lines.push("  none measured. No budget harness is registered yet, so no budget number");
    lines.push("  in CLAUDE.md has been checked by this run.");
  }
  for (const budget of budgets) {
    lines.push(
      `  ${budget.name}: ${budget.measured} against ${budget.ceiling}  ` +
        `${budget.passed ? "pass" : "fail"}`,
    );
  }

  lines.push("");
  lines.push("NOT MEASURABLE HERE");
  const notMeasurable = collectNotMeasurable(suite);
  if (notMeasurable.length === 0) {
    lines.push("  none reported");
  }
  for (const entry of notMeasurable) {
    lines.push(`  ${entry.property}: ${entry.reason}`);
  }

  return lines.join("\n");
}
