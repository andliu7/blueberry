import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import { formatBytes, formatCeiling, GZIP_LEVEL, isWithinCeiling, KB } from "../../measure/gzip.ts";
import { measureChemCore } from "../../measure/chem-core.ts";

/**
 * Budget: chem-core bundle ceiling, 150 KB gzipped, enforced by CI.
 *
 * The number is measured from a real esbuild bundle of the real dist/ output, gzipped
 * at a fixed level. There is no estimate anywhere in this path and no constant standing
 * in for a measurement.
 *
 * The failure modes are kept distinct on purpose:
 *
 *   over the ceiling   The gate did its job. Report the overshoot in bytes.
 *   not built          chem-core has no dist/. Fail, do not skip. The subject exists in
 *                      source, so "I could not measure it" is a broken invocation, not
 *                      a missing subject. See measure/subject.ts for where that line is
 *                      drawn and why.
 *   bundler absent     Fail, for the same reason. The subject is present and
 *                      measurable; only the tool is missing, and that is an environment
 *                      defect somebody can fix in a minute. Reporting it as
 *                      notMeasurable would let a real regression hide behind a missing
 *                      devDependency.
 */

export const CHEM_CORE_CEILING_KB = 150;

const BUDGET_NAME = "chem-core bundle, gzipped";

export const chemCoreSize: Check = {
  name: "budget-chem-core-size",
  description: `chem-core built output bundled, minified, and gzipped against the ${CHEM_CORE_CEILING_KB} KB ceiling`,

  async run(): Promise<CheckResult> {
    const outcome = await measureChemCore();
    const ceiling = formatCeiling(CHEM_CORE_CEILING_KB);

    if (outcome.kind === "unresolved") {
      return failed([
        {
          expected: `a built chem-core entry to weigh against ${ceiling}`,
          actual: `no entry to measure: ${outcome.detail}`,
          fixture: "packages/chem-core/package.json",
        },
      ]);
    }

    if (outcome.kind === "bundler-absent") {
      return failed([
        {
          expected: `a bundler, so the ${ceiling} ceiling can be measured rather than estimated`,
          actual: outcome.detail,
          fixture: "n/a, environment defect, not a fixture",
        },
      ]);
    }

    if (outcome.kind === "build-failed") {
      const failures: CheckFailure[] = outcome.messages.map((message) => ({
        expected: "chem-core built output bundles cleanly for a browser target",
        actual: message,
        fixture: "packages/chem-core/dist/",
      }));
      return failed(failures);
    }

    const ceilingBytes = CHEM_CORE_CEILING_KB * KB;
    const withinBudget = isWithinCeiling(outcome.gzipBytes, CHEM_CORE_CEILING_KB);
    const budget = {
      name: BUDGET_NAME,
      measured: formatBytes(outcome.gzipBytes),
      ceiling,
      passed: withinBudget,
    };

    if (!withinBudget) {
      return failed(
        [
          {
            expected: `at most ${ceiling} gzipped`,
            actual: `${formatBytes(outcome.gzipBytes)} gzipped, ${outcome.gzipBytes - ceilingBytes} bytes over`,
            fixture: `packages/chem-core/dist/ via ${outcome.entryInput}`,
          },
        ],
        { budgets: [budget] },
      );
    }

    return passed({
      budgets: [
        budget,
        {
          name: "chem-core bundle, minified, before gzip",
          measured: formatBytes(outcome.rawBytes),
          ceiling: "no ceiling in CLAUDE.md, reported for context",
          passed: true,
        },
      ],
      notMeasurable: [
        {
          property: "chem-core size as any one consumer would ship it",
          reason:
            `the number above is the whole package with tree shaking off, measured from ` +
            `${outcome.entryInput}, gzip level ${GZIP_LEVEL}. A consumer importing three ` +
            `symbols ships less than this. The ceiling is on the package, so the ` +
            `conservative figure is the one gated.`,
        },
      ],
    });
  },
};
