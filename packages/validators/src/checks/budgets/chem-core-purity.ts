import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import {
  CHEM_CORE_BANNED,
  CHEM_CORE_EXTERNALS,
  listChemCoreDistModules,
  measureChemCore,
  resolveChemCoreEntry,
} from "../../measure/chem-core.ts";
import { analysePurity, formatChain } from "../../measure/purity.ts";

/**
 * Gate: chem-core must not transitively reach React, the DOM, three, or RDKit.
 *
 * CLAUDE.md states the rule twice, once as layout, "packages/chem-core Engine. No React,
 * no DOM, no rendering, no RDKit. Pure TS", and once as an instruction: "Anything that
 * imports React does not belong in chem-core. If you find yourself wanting to, the
 * abstraction is wrong."
 *
 * This runs on the built graph, not the source text, for the reason spelled out in
 * measure/import-graph.ts. A grep would flag chem-core's own index.ts header, which
 * contains the words "No React" and "no DOM", and would miss a re-export chain.
 *
 * Proof that it fires is in budget-gate-self-test.ts, which runs this same analysis
 * against the deliberately impure build in ./impure-build-fixture and fails the suite if
 * the analysis comes back clean.
 */

export const chemCorePurity: Check = {
  name: "budget-chem-core-purity",
  description:
    "chem-core built import graph reaches no React, DOM, rendering, or RDKit dependency",

  async run(): Promise<CheckResult> {
    const entry = await resolveChemCoreEntry();
    if (entry.kind !== "ok") {
      return failed([
        {
          expected: "a built chem-core entry whose import graph can be walked",
          actual: `no entry to walk: ${entry.detail}`,
          fixture: "packages/chem-core/package.json",
        },
      ]);
    }

    const prepared = await measureChemCore();
    if (prepared.kind === "unresolved") {
      return failed([
        {
          expected: "a built chem-core entry whose import graph can be walked",
          actual: prepared.detail,
          fixture: "packages/chem-core/package.json",
        },
      ]);
    }

    const outcome = await analysePurity({
      entryPointAbsolute: entry.absolute,
      external: CHEM_CORE_EXTERNALS,
      rules: CHEM_CORE_BANNED,
      expectedModules: await listChemCoreDistModules(),
      preBundled: prepared,
    });

    if (outcome.kind === "bundler-absent") {
      return failed([
        {
          expected: "a bundler, so the import graph is the real one and not a regex over source",
          actual: outcome.detail,
          fixture: "n/a, environment defect, not a fixture",
        },
      ]);
    }

    if (outcome.kind === "build-failed") {
      return failed(
        outcome.messages.map((message) => ({
          expected: "chem-core built output bundles cleanly for a browser target",
          // A resolution error here is itself a purity signal: a browser target that
          // cannot resolve an import usually means a Node builtin reached the engine.
          actual: message,
          fixture: "packages/chem-core/dist/",
        })),
      );
    }

    const { findings } = outcome;
    const failures: CheckFailure[] = [];

    for (const violation of findings.importViolations) {
      failures.push({
        expected: `chem-core reaches no ${violation.rule.name}. ${violation.rule.source}`,
        actual: `reaches ${violation.specifier} via ${formatChain(violation.chain)}`,
        fixture: "packages/chem-core/dist/, built import graph",
      });
    }

    for (const hit of findings.domGlobals) {
      failures.push({
        expected: "chem-core evaluates no DOM host global. CLAUDE.md: chem-core is 'no DOM'",
        actual: `${hit.identifier} appears ${hit.occurrences} time(s) in the minified bundle, near: ${hit.excerpt}`,
        fixture: "packages/chem-core/dist/, minified bundle text",
      });
    }

    for (const module of findings.uninspected) {
      failures.push({
        expected: "every module in chem-core's dist is reachable from the package entry, so the purity walk covers all of it",
        actual: `${module} exists in dist and the walk from ${findings.entryInput} never reached it, so its imports were not inspected`,
        fixture: module,
      });
    }

    if (failures.length > 0) return failed(failures);

    return passed({
      notMeasurable: [
        {
          property: "DOM access through a computed property name",
          reason:
            `the DOM half of this gate is an identifier scan over the minified bundle ` +
            `(${findings.modulesInspected} modules inspected from ${findings.entryInput}). ` +
            `It catches document.createElement. It cannot catch globalThis["docu"+"ment"], ` +
            `and only executing the module would. See measure/dom-globals.ts.`,
        },
      ],
    });
  },
};
