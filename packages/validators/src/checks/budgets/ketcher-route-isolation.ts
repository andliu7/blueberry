import type { Check, CheckFailure, CheckResult, NotMeasurable } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import { KETCHER_MANIFEST_FREE_PACKAGES, RDKIT_RULE } from "../../measure/banned.ts";
import { formatChain } from "../../measure/import-graph.ts";
import { readDeclaredDependencies } from "../../measure/manifests.ts";
import { BUDGET_SUBJECTS_MANIFEST, measureGameRoute } from "../../measure/web-app.ts";

/**
 * Gate: the game route must not reach Ketcher, and nothing may import @rdkit/rdkit.
 *
 * CLAUDE.md, Budgets: "Ketcher route: lazy only. Must never be reachable from the game
 * route's initial chunk", with the reason stated a paragraph later: ketcher-standalone
 * inlines the Indigo WASM engine at 15.5 MB and ketcher-react adds 3.1 MB, so "a single
 * unguarded import puts that download in front of every student". D3: "Do not add
 * @rdkit/rdkit WASM to the client. It never enters a bundle."
 *
 * The check has two halves and they arm at different times, which is deliberate.
 *
 *   The manifest half runs today and always. A declared dependency is measurable with
 *   no build, no app, and no bundler, and it catches the realistic way this violation
 *   arrives: somebody runs `npm install @rdkit/rdkit` because the WASM build looks like
 *   the quick route to canonical SMILES. It is a manifest assertion, not an import graph
 *   assertion, and the failures say so rather than overclaiming.
 *
 *   The import graph half is what BUILD-PROMPT.md asks for, "run against built output
 *   rather than source", and it needs apps/web. Until apps/web exists it reports under
 *   notMeasurable and arms itself automatically. See measure/subject.ts for the argument
 *   and for the three state machine that makes the arming automatic rather than a
 *   reminder somebody has to act on.
 */

export const ketcherRouteIsolation: Check = {
  name: "budget-ketcher-route-isolation",
  description:
    "no workspace declares @rdkit/rdkit, and the game route's built graph reaches no ketcher or RDKit package over a static edge",

  async run(): Promise<CheckResult> {
    const failures: CheckFailure[] = [];
    const notMeasurable: NotMeasurable[] = [];

    // Half one: dependency manifests. Always measurable.
    const declared = await readDeclaredDependencies();

    for (const dependency of declared) {
      if (RDKIT_RULE.matches(dependency.name)) {
        failures.push({
          expected: `no workspace declares ${dependency.name}. ${RDKIT_RULE.source}`,
          actual: `${dependency.manifest} declares it under ${dependency.section} at ${dependency.range}`,
          fixture: dependency.manifest,
        });
      }
    }

    for (const dependency of declared) {
      const packageIsKetcherFree = KETCHER_MANIFEST_FREE_PACKAGES.some((prefix) =>
        dependency.manifest.startsWith(prefix),
      );
      if (!packageIsKetcherFree) continue;
      if (!dependency.name.startsWith("ketcher")) continue;
      failures.push({
        expected:
          `${dependency.manifest} declares no ketcher package. Ketcher belongs to apps/web ` +
          `behind a lazy route, never to the engine or the validator suite`,
        actual: `${dependency.manifest} declares ${dependency.name} under ${dependency.section}`,
        fixture: dependency.manifest,
      });
    }

    // Half two: the built import graph of the game route.
    const route = await measureGameRoute();

    switch (route.kind) {
      case "subject-absent":
        notMeasurable.push({
          property: "game route built import graph reaches no ketcher or @rdkit package",
          reason:
            `NOT MEASURED. ${route.classification.evidence}. apps/web is a Phase 3 and ` +
            `Phase 4 deliverable and does not exist yet, so there is no built graph to ` +
            `walk. This gate arms itself with no human step the moment ` +
            `apps/web/package.json appears: from that run onward an unmeasurable graph ` +
            `is a hard failure, not a note. The manifest half of this check ran and ` +
            `passed over ${declared.length} declared dependencies.`,
        });
        break;

      case "subject-unbuilt":
        failures.push({
          expected:
            `apps/web built, so the game route's import graph can be walked against the ` +
            `ketcher-standalone 15.5 MB and ketcher-react 3.1 MB rule`,
          actual: `${route.classification.evidence} Run the app's build, then re-run this check.`,
          fixture: "apps/web/dist/",
        });
        break;

      case "manifest-missing":
        failures.push({
          expected: `apps/web/${BUDGET_SUBJECTS_MANIFEST}, naming the game route's entry chunk`,
          actual:
            `apps/web is built and publishes no ${BUDGET_SUBJECTS_MANIFEST}. Which emitted ` +
            `chunk is the game route's initial chunk cannot be determined from dist/ alone, ` +
            `and this check does not guess by filename. See measure/subject.ts.`,
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
          expected: `the chunk named by gameRouteEntry to exist in apps/web/dist`,
          actual: `${route.entryFile} is named in the manifest and is not on disk`,
          fixture: `apps/web/${BUDGET_SUBJECTS_MANIFEST}`,
        });
        break;

      case "bundler-absent":
        failures.push({
          expected: "a bundler, so the assertion runs against the built graph rather than source text",
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

      case "measured":
        for (const violation of route.bannedReach) {
          failures.push({
            expected: `the game route's initial chunk reaches no ${violation.rule.name}. ${violation.rule.source}`,
            actual: `statically reaches ${violation.specifier} via ${formatChain(violation.chain)}`,
            fixture: `apps/web/dist/${route.entryFile}`,
          });
        }
        notMeasurable.push({
          property: "whether a lazy chunk is actually reached lazily at runtime",
          reason:
            `this walk treats every dynamic import as a boundary, which is the correct ` +
            `reading of "lazy only", but it cannot tell a React.lazy boundary from a ` +
            `dynamic import that fires immediately on mount. ` +
            `${route.declaredLazyChunks.length} chunk(s) were declared lazy. Whether the ` +
            `Suspense boundary around them shows a real loading state is a human gate.`,
        });
        break;
    }

    if (failures.length > 0) {
      return failed(failures, { notMeasurable });
    }
    return passed({ notMeasurable });
  },
};
