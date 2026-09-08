import type { BudgetResult, Check, CheckFailure, CheckResult, NotMeasurable } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import { formatBytes, formatCeiling, GZIP_LEVEL, isWithinCeiling, KB } from "../../measure/gzip.ts";
import { BUDGET_SUBJECTS_MANIFEST, measureGameRoute } from "../../measure/web-app.ts";

/**
 * Budget: game route initial payload, Ketcher excluded, 400 KB gzipped.
 *
 * "Ketcher excluded" is not a subtraction this check performs. It is a consequence of
 * how the initial set is computed: the walk stops at every dynamic import, so a Ketcher
 * chunk behind React.lazy is never in the set to begin with. If Ketcher were statically
 * reachable it would be counted, the number would be roughly 18 MB, and this gate and
 * budget-ketcher-route-isolation would both fail with the same underlying cause named
 * two different useful ways. Subtracting Ketcher out by name would have hidden exactly
 * the failure the budget exists to catch.
 *
 * apps/web does not exist yet. What this check does about that, and the argument for it,
 * is in measure/subject.ts. In short: notMeasurable while the subject is absent, hard
 * failure from the moment apps/web/package.json appears, with the transition driven off
 * the file system on every run rather than off anybody remembering. No BudgetResult row
 * is emitted while nothing has been weighed, because a row saying "pass" next to a
 * ceiling nobody measured is the exact false confidence this suite exists to prevent.
 */

export const GAME_ROUTE_CEILING_KB = 400;

export const gameRoutePayload: Check = {
  name: "budget-game-route-payload",
  description: `game route initial payload, Ketcher excluded, against the ${GAME_ROUTE_CEILING_KB} KB gzipped ceiling`,

  async run(): Promise<CheckResult> {
    const ceiling = formatCeiling(GAME_ROUTE_CEILING_KB);
    const failures: CheckFailure[] = [];
    const notMeasurable: NotMeasurable[] = [];
    const budgets: BudgetResult[] = [];

    const route = await measureGameRoute();

    switch (route.kind) {
      case "subject-absent":
        notMeasurable.push({
          property: `game route initial payload against the ${ceiling} ceiling`,
          reason:
            `NOT MEASURED, and no number is reported for it. ` +
            `${route.classification.evidence}. apps/web is a Phase 3 and Phase 4 ` +
            `deliverable. This gate arms itself with no human step the moment ` +
            `apps/web/package.json appears: from that run onward an unmeasurable payload ` +
            `is a hard failure rather than this note. Verified every run by ` +
            `budget-gate-self-test, which drives all three subject states.`,
        });
        break;

      case "subject-unbuilt":
        failures.push({
          expected: `apps/web built, so the initial payload can be weighed against ${ceiling}`,
          actual: `${route.classification.evidence} Nothing was weighed and no number is reported.`,
          fixture: "apps/web/dist/",
        });
        break;

      case "manifest-missing":
        failures.push({
          expected: `apps/web/${BUDGET_SUBJECTS_MANIFEST}, naming gameRouteEntry`,
          actual:
            `apps/web is built and publishes no ${BUDGET_SUBJECTS_MANIFEST}. Which chunk ` +
            `the game route loads first cannot be read off a directory of content hashed ` +
            `filenames, and this check will not guess one. A guessed entry produces a ` +
            `number, and a number produced by guessing is what CLAUDE.md forbids.`,
          fixture: `apps/web/${BUDGET_SUBJECTS_MANIFEST}`,
        });
        break;

      case "manifest-malformed":
        failures.push({
          expected: `apps/web/${BUDGET_SUBJECTS_MANIFEST} in the documented shape`,
          actual: route.detail,
          fixture: `apps/web/${BUDGET_SUBJECTS_MANIFEST}`,
        });
        break;

      case "entry-missing":
        failures.push({
          expected: "the chunk named by gameRouteEntry to exist in apps/web/dist",
          actual: `${route.entryFile} is named in the manifest and is not on disk`,
          fixture: `apps/web/${BUDGET_SUBJECTS_MANIFEST}`,
        });
        break;

      case "bundler-absent":
        failures.push({
          expected: "a bundler, so the initial set comes from the real graph rather than a filename pattern",
          actual: route.detail,
          fixture: "n/a, environment defect, not a fixture",
        });
        break;

      case "build-failed":
        for (const message of route.messages) {
          failures.push({
            expected: "the game route's emitted chunks parse and resolve as a module graph",
            actual: message,
            fixture: "apps/web/dist/",
          });
        }
        break;

      case "measured": {
        const ceilingBytes = GAME_ROUTE_CEILING_KB * KB;
        const withinBudget = isWithinCeiling(route.totalGzipBytes, GAME_ROUTE_CEILING_KB);

        budgets.push({
          name: `game route initial payload, ${route.initialChunks.length} file(s), gzipped per file`,
          measured: formatBytes(route.totalGzipBytes),
          ceiling,
          passed: withinBudget,
        });

        if (!withinBudget) {
          const heaviest = [...route.initialChunks]
            .sort((a, b) => b.gzipBytes - a.gzipBytes)
            .slice(0, 5)
            .map((chunk) => `${chunk.file} ${formatBytes(chunk.gzipBytes)}`)
            .join(", ");
          failures.push({
            expected: `at most ${ceiling} gzipped, Ketcher excluded`,
            actual:
              `${formatBytes(route.totalGzipBytes)}, ` +
              `${route.totalGzipBytes - ceilingBytes} bytes over. Heaviest: ${heaviest}`,
            fixture: `apps/web/dist/${route.entryFile}`,
          });
        }

        if (!route.additionalAssetsDeclared) {
          notMeasurable.push({
            property: "stylesheets and fonts that load with the game route",
            reason:
              `the number above counts JavaScript only. Vite emits CSS as a <link> tag, ` +
              `which no import graph walk can see, and apps/web declared no ` +
              `additionalInitialAssets in ${BUDGET_SUBJECTS_MANIFEST}. The real download ` +
              `is this number plus the stylesheet. Declare the field to close the gap.`,
          });
        }
        break;
      }
    }

    if (failures.length > 0) return failed(failures, { budgets, notMeasurable });

    return passed({
      budgets,
      notMeasurable: [
        ...notMeasurable,
        {
          property: "time to interactive on the reference devices",
          reason:
            `bytes are not latency. The Budgets table also names Pixel 6a and iPhone 12, ` +
            `60 fps sustained, and interaction to feedback under 100 ms. None of those are ` +
            `this gate, and gzip level ${GZIP_LEVEL} bytes must not be read as a proxy for ` +
            `any of them.`,
        },
      ],
    });
  },
};
