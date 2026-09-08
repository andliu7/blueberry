import { checks } from "./checks/index.ts";
import type { CheckContext, CheckFailure } from "./check.ts";
import {
  EXIT_CHECK_FAILED,
  EXIT_HARNESS_ERROR,
  EXIT_OK,
  EXIT_SUITE_MODIFIED,
} from "./exit-codes.ts";
import { readLastRun, scanFixtures, writeLastRun } from "./fixtures.ts";
import { checkIntegrity, formatIntegrityFailure } from "./integrity.ts";
import { FIXTURES_DIR, PACKAGE_ROOT, REPO_ROOT } from "./paths.ts";
import { formatReport } from "./report.ts";
import { runChecks } from "./registry.ts";

/**
 * The headless validator entry point.
 *
 * Order of operations is the point of this file:
 *
 *   1. Suite integrity, before anything else. On mismatch, print the changed file list
 *      and exit nonzero without running or reporting a single check. CLAUDE.md, "Suite
 *      integrity": on mismatch the validator reports MODIFIED and refuses to report
 *      results. A suite edited by the agent under test is not evidence, and a report
 *      that mixes "here is what I found" with "and I cannot vouch for the thing that
 *      found it" is worse than no report.
 *   2. Count fixtures off the real directory.
 *   3. Run the registered checks.
 *   4. Print the format in .claude/agents/chem-validator.md and exit nonzero if
 *      anything failed.
 *
 * No prompts, no interactive input, no writes to any source file. The only thing this
 * process writes is results/last-run.json, which is gitignored and excluded from the
 * lock. It never regenerates the lock. Accepting a suite change is a separate deliberate
 * command.
 */

async function main(): Promise<number> {
  // Step 1. Integrity, first, unconditionally.
  const integrity = await checkIntegrity();
  if (integrity.status !== "unmodified") {
    for (const line of formatIntegrityFailure(integrity)) console.log(line);
    return EXIT_SUITE_MODIFIED;
  }

  // Step 2. Fixtures, counted rather than assumed.
  const fixtures = await scanFixtures();
  const lastRun = await readLastRun();
  const previousFixtureCount = lastRun === null ? null : lastRun.fixtureCount;

  const leadingWarnings: string[] = [];
  const suiteLevelFailures: (CheckFailure & { name: string })[] = [];
  let fixtureCountDropped = false;

  if (previousFixtureCount !== null && fixtures.count < previousFixtureCount) {
    fixtureCountDropped = true;
    leadingWarnings.push(
      `FIXTURE COUNT DROPPED: ${previousFixtureCount} to ${fixtures.count}. ` +
        `A green run on a shrunken fixture set is a failed run.`,
    );
    suiteLevelFailures.push({
      name: "fixture-count-non-decreasing",
      expected: `at least ${previousFixtureCount} fixtures`,
      actual: `${fixtures.count} fixtures`,
      fixture: `${fixtures.dir}/`,
    });
  }
  if (!fixtures.dirExists) {
    leadingWarnings.push(
      `WARNING: ${fixtures.dir}/ does not exist. Fixture count reported as 0, not assumed.`,
    );
  } else if (fixtures.count === 0) {
    leadingWarnings.push(
      "WARNING: the fixture corpus is empty. No chemistry has been verified by this run.",
    );
  }

  // Step 3. Run the checks.
  const context: CheckContext = {
    repoRoot: REPO_ROOT,
    packageRoot: PACKAGE_ROOT,
    fixturesDir: FIXTURES_DIR,
    fixtures: fixtures.files,
  };

  const suite = await runChecks(checks, context);

  // The verdict is recomputed here from the raw per check outcomes, not read off
  // SuiteOutcome.passed. That flag is produced by the aggregation code in registry.ts,
  // which is itself one of the things under test. Trusting it means a bug that makes
  // aggregation always report success also makes this process exit zero, and the one
  // check that noticed gets printed under a "SUITE: pass" heading. That happened on the
  // first run of this file. A registry that reports nothing is also not a pass.
  const failedOutcomes = suite.outcomes.filter((outcome) => outcome.status === "fail");
  const overallPassed =
    failedOutcomes.length === 0 && suite.outcomes.length > 0 && !fixtureCountDropped;

  // Step 4. Report.
  console.log(
    formatReport({
      suite,
      passed: overallPassed,
      integrityLine: "unmodified",
      fixtures,
      previousFixtureCount,
      suiteLevelFailures,
      leadingWarnings,
    }),
  );

  // Only a passing run updates the fixture count baseline. A failing run must not turn
  // a dropped corpus into the new normal for the next invocation.
  if (overallPassed) {
    await writeLastRun({
      fixtureCount: fixtures.count,
      suiteHash: integrity.suiteHashOnDisk,
      recordedAt: new Date().toISOString(),
    });
  }

  return overallPassed ? EXIT_OK : EXIT_CHECK_FAILED;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.log("VALIDATOR HARNESS ERROR");
  console.log(`  ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  console.log("");
  console.log("No results are reported. The harness itself did not complete.");
  process.exitCode = EXIT_HARNESS_ERROR;
}
