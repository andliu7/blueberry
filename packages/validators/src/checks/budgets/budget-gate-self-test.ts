import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Check, CheckContext, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import { CHEM_CORE_BANNED } from "../../measure/banned.ts";
import { CHEM_CORE_EXTERNALS } from "../../measure/chem-core.ts";
import { gzippedByteLength, isWithinCeiling, KB } from "../../measure/gzip.ts";
import { analysePurity, formatChain, isPure } from "../../measure/purity.ts";
import { classifyWebAppSubject } from "../../measure/subject.ts";
import { measureGameRoute } from "../../measure/web-app.ts";
import { CHEM_CORE_CEILING_KB } from "./chem-core-size.ts";
import { gameRoutePayload, GAME_ROUTE_CEILING_KB } from "./game-route-payload.ts";

/**
 * Proof that these gates fire.
 *
 * BUILD-PROMPT.md, Phase 0: "the deliberately broken fixtures, proving the suite fails
 * when it should", and separately, in the exit condition, "A validator suite that has
 * never failed has not been tested." A budget gate is unusually easy to get wrong in the
 * silent direction, because the failure mode is not a wrong number, it is no number at
 * all reported as if it were a good one. So this check exists to make the gates fail, on
 * every run, against subjects built to break them.
 *
 * Four things are asserted, and each corresponds to a way the gates could go blind.
 *
 *   1. The purity analysis reports the deliberately impure build as impure, with a chain
 *      that reaches react from the entry. This is the fourth broken fixture named in
 *      BUILD-PROMPT.md. If the walk ever stops resolving, this check goes red.
 *
 *   2. It reports the DOM global and the orphan module too, so the two findings that are
 *      not import edges are also exercised.
 *
 *   3. The web app subject state machine returns absent, unbuilt, and built for three
 *      synthetic directories. This is the mechanism that turns the two apps/web gates
 *      from notes into hard failures the moment apps/web is scaffolded, and an untested
 *      arming mechanism is one that quietly fails to arm.
 *
 *   4. The game route walk treats a dynamic import as a boundary and a static import as
 *      a violation, measured against two synthetic built apps that differ only in that
 *      one character of syntax. This is the whole Ketcher rule, and a walk that got it
 *      backwards would either ban the editor or wave through 15.5 MB.
 *
 * Everything synthetic is written under the OS temp directory, never inside
 * packages/validators, because the integrity lock hashes every file in this package and
 * a check that wrote scratch files into it would report the suite as MODIFIED on the
 * next run.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IMPURE_FIXTURE_ENTRY = path.join(HERE, "impure-build-fixture", "index.js");

async function writeFiles(root: string, files: Record<string, string>): Promise<void> {
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(root, ...relative.split("/"));
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, contents, "utf8");
  }
}

/** A synthetic built app. `eager` decides whether the editor chunk is lazy or not. */
function syntheticApp(eager: boolean): Record<string, string> {
  const editorImport = eager
    ? 'import "./editor.js";\nexport const openEditor = () => 1;\n'
    : 'export const openEditor = () => import("./editor.js");\n';
  return {
    "package.json": JSON.stringify({ name: "synthetic-web", private: true }, null, 2),
    "dist/index.html": "<!doctype html><html><body></body></html>",
    "dist/budget-subjects.json": JSON.stringify(
      { gameRouteEntry: "assets/game.js", lazyChunks: eager ? [] : ["assets/editor.js"] },
      null,
      2,
    ),
    "dist/assets/game.js": `import { shared } from "./shared.js";\n${editorImport}export { shared };\n`,
    "dist/assets/shared.js": "export const shared = 1;\n",
    "dist/assets/editor.js": 'import "ketcher-standalone";\nexport const editor = 1;\n',
  };
}

export const budgetGateSelfTest: Check = {
  name: "budget-gate-self-test",
  description:
    "the purity gate fires on the deliberately impure build, and the apps/web gates arm on subject state rather than on a reminder",

  async run(context: CheckContext): Promise<CheckResult> {
    const failures: CheckFailure[] = [];
    const record = (expected: string, actual: string, fixture: string): void => {
      failures.push({ expected, actual, fixture });
    };

    // 0. The ceiling comparison itself, at the boundary.
    //
    // First because it is the cheapest way for every number in this directory to be
    // right and every verdict to be wrong. An inverted inequality reports pass on the
    // day the bundle doubles, and nothing else in the report would look unusual.
    const ceilingCases: readonly (readonly [number, number, boolean, string])[] = [
      [CHEM_CORE_CEILING_KB * KB - 1, CHEM_CORE_CEILING_KB, true, "one byte under the ceiling"],
      [CHEM_CORE_CEILING_KB * KB, CHEM_CORE_CEILING_KB, true, "exactly on the ceiling"],
      [CHEM_CORE_CEILING_KB * KB + 1, CHEM_CORE_CEILING_KB, false, "one byte over the ceiling"],
      [GAME_ROUTE_CEILING_KB * KB + 1, GAME_ROUTE_CEILING_KB, false, "one byte over the 400 KB ceiling"],
      [0, GAME_ROUTE_CEILING_KB, true, "an empty payload"],
    ];
    for (const [bytes, ceilingKb, expected, label] of ceilingCases) {
      if (isWithinCeiling(bytes, ceilingKb) !== expected) {
        record(
          `${label} is ${expected ? "within" : "over"} a ${ceilingKb} KB budget`,
          `isWithinCeiling(${bytes}, ${ceilingKb}) returned ${!expected}`,
          "packages/validators/src/measure/gzip.ts",
        );
      }
    }

    // 1 and 2. The deliberately impure chem-core build.
    const impureFixture = "packages/validators/src/checks/budgets/impure-build-fixture/";
    const impure = await analysePurity({
      entryPointAbsolute: IMPURE_FIXTURE_ENTRY,
      external: CHEM_CORE_EXTERNALS,
      rules: CHEM_CORE_BANNED,
      expectedModules: [],
    });

    if (impure.kind !== "analysed") {
      record(
        "the impure build fixture is analysable, so the purity gate can be shown to fire",
        impure.kind === "bundler-absent"
          ? `bundler absent: ${impure.detail}`
          : `build failed: ${impure.messages.join("; ")}`,
        impureFixture,
      );
    } else {
      const findings = impure.findings;

      if (isPure(findings)) {
        record(
          "the purity gate reports the impure build as impure",
          "it reported the impure build as clean. The gate is blind and every passing " +
            "purity result in this repository is now unproven.",
          impureFixture,
        );
      }

      const react = findings.importViolations.find((violation) =>
        violation.specifier.startsWith("react"),
      );
      if (react === undefined) {
        record(
          "the walk finds react reachable from the impure entry",
          `it found ${findings.importViolations.length} violation(s), none of them react: ` +
            findings.importViolations.map((violation) => violation.specifier).join(", "),
          impureFixture,
        );
      } else {
        if (react.chain.length < 4) {
          record(
            "the react chain is at least 4 nodes, entry to geometry to arrow-overlay to react, " +
              "so a walk that only inspected the entry file would be caught",
            `chain was ${formatChain(react.chain)}`,
            impureFixture,
          );
        }
        if (react.chain[react.chain.length - 1] !== react.specifier) {
          record(
            "the chain ends at the banned specifier",
            `chain ended at ${String(react.chain[react.chain.length - 1])}`,
            impureFixture,
          );
        }
      }

      if (!findings.importViolations.some((violation) => violation.specifier === "three")) {
        record(
          "two distinct banned packages are reported, not just the first one met",
          `three was not among: ${findings.importViolations.map((violation) => violation.specifier).join(", ") || "nothing"}`,
          impureFixture,
        );
      }

      if (!findings.domGlobals.some((hit) => hit.identifier === "document")) {
        record(
          "the DOM half of the gate finds document.createElement in the impure build",
          `DOM globals found: ${findings.domGlobals.map((hit) => hit.identifier).join(", ") || "none"}`,
          `${impureFixture}arrow-overlay.js`,
        );
      }

      // The orphan proves the coverage finding. Reachability is asked of the real walk
      // by handing it the orphan as an expected module.
      const orphan = "packages/validators/src/checks/budgets/impure-build-fixture/orphan-renderer.js";
      const withOrphan = await analysePurity({
        entryPointAbsolute: IMPURE_FIXTURE_ENTRY,
        external: CHEM_CORE_EXTERNALS,
        rules: CHEM_CORE_BANNED,
        expectedModules: [orphan],
      });
      if (withOrphan.kind !== "analysed") {
        record(
          "the coverage assertion is exercisable",
          `analysis returned ${withOrphan.kind}`,
          orphan,
        );
      } else if (!withOrphan.findings.uninspected.includes(orphan)) {
        record(
          "a built module the walk never reached is reported as uninspected, so the gate " +
            "declares its blind spot instead of reporting clean",
          `uninspected was [${withOrphan.findings.uninspected.join(", ")}]`,
          orphan,
        );
      }
    }

    // 3 and 4. Synthetic web app subjects.
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "blueberry-budget-gate-"));
    try {
      const absentRoot = path.join(scratch, "absent");
      await fs.mkdir(absentRoot, { recursive: true });
      const absent = await classifyWebAppSubject(absentRoot);
      if (absent.state !== "absent") {
        record(
          "an app directory with no package.json classifies as absent",
          `classified as ${absent.state}`,
          "n/a, synthetic directory",
        );
      }

      const unbuiltRoot = path.join(scratch, "unbuilt");
      await writeFiles(unbuiltRoot, { "package.json": "{}" });
      const unbuilt = await classifyWebAppSubject(unbuiltRoot);
      if (unbuilt.state !== "unbuilt") {
        record(
          "an app with a package.json and no build output classifies as unbuilt, which is " +
            "the state that turns these gates from notes into hard failures",
          `classified as ${unbuilt.state}`,
          "n/a, synthetic directory",
        );
      }
      const unbuiltOutcome = await measureGameRoute(unbuiltRoot);
      if (unbuiltOutcome.kind !== "subject-unbuilt") {
        record(
          "measureGameRoute reports subject-unbuilt for an app that exists and is not built",
          `it returned ${unbuiltOutcome.kind}`,
          "n/a, synthetic directory",
        );
      }

      const lazyRoot = path.join(scratch, "lazy");
      await writeFiles(lazyRoot, syntheticApp(false));
      const lazy = await measureGameRoute(lazyRoot);
      if (lazy.kind !== "measured") {
        record(
          "a built synthetic app with a manifest is measured",
          `it returned ${lazy.kind}`,
          "n/a, synthetic directory",
        );
      } else {
        if (lazy.bannedReach.length !== 0) {
          record(
            "ketcher behind a dynamic import is not a violation. CLAUDE.md requires the " +
              "Ketcher route to be lazy, so laziness is the correct architecture",
            `reported ${lazy.bannedReach.length} violation(s): ` +
              lazy.bannedReach.map((reach) => formatChain(reach.chain)).join(" | "),
            "n/a, synthetic directory",
          );
        }
        const files = lazy.initialChunks.map((chunk) => chunk.file).sort();
        if (files.join(",") !== "assets/game.js,assets/shared.js") {
          record(
            "the initial set is the statically reachable chunks only, [assets/game.js, assets/shared.js]",
            `it was [${files.join(", ")}]`,
            "n/a, synthetic directory",
          );
        }
        // The reported total must be the sum of the real files' real gzip sizes,
        // recomputed here from disk rather than trusted from the measurement.
        let expectedTotal = 0;
        for (const name of ["assets/game.js", "assets/shared.js"]) {
          const bytes = await fs.readFile(path.join(lazyRoot, "dist", ...name.split("/")));
          expectedTotal += gzippedByteLength(bytes);
        }
        if (lazy.totalGzipBytes !== expectedTotal) {
          record(
            `the payload total is the sum of the on disk chunks gzipped, ${expectedTotal} bytes`,
            `it reported ${lazy.totalGzipBytes} bytes`,
            "n/a, synthetic directory",
          );
        }
      }

      const eagerRoot = path.join(scratch, "eager");
      await writeFiles(eagerRoot, syntheticApp(true));
      const eager = await measureGameRoute(eagerRoot);
      if (eager.kind !== "measured") {
        record(
          "a built synthetic app with an eager ketcher import is measured",
          `it returned ${eager.kind}`,
          "n/a, synthetic directory",
        );
      } else if (!eager.bannedReach.some((reach) => reach.specifier.startsWith("ketcher"))) {
        record(
          "ketcher reached over a static import from the game route entry is a violation, " +
            "because that is 15.5 MB in front of every student",
          `reported ${eager.bannedReach.length} violation(s)`,
          "n/a, synthetic directory",
        );
      }

      const noManifestRoot = path.join(scratch, "no-manifest");
      const withoutManifest = syntheticApp(false);
      delete withoutManifest["dist/budget-subjects.json"];
      await writeFiles(noManifestRoot, withoutManifest);
      const noManifest = await measureGameRoute(noManifestRoot);
      if (noManifest.kind !== "manifest-missing") {
        record(
          "a built app that publishes no budget-subjects.json is reported as manifest-missing, " +
            "never measured off a guessed entry chunk",
          `it returned ${noManifest.kind}`,
          "n/a, synthetic directory",
        );
      }
    } finally {
      await fs.rm(scratch, { recursive: true, force: true });
    }

    // 5. The absent subject contract, asserted against the live check rather than
    //    described in a comment. While apps/web does not exist the payload check must
    //    pass, must emit no BudgetResult at all, and must say NOT MEASURED out loud.
    //    Once apps/web exists it must do the opposite. Both directions are asserted, so
    //    this assertion does not need editing on the day the app arrives.
    const liveSubject = await measureGameRoute();
    const liveResult = await gameRoutePayload.run(context);
    const liveBudgets = liveResult.budgets ?? [];
    const liveNotMeasurable = liveResult.notMeasurable ?? [];

    if (liveSubject.kind === "subject-absent") {
      if (liveBudgets.length !== 0) {
        record(
          "no BudgetResult is emitted for a budget nothing was weighed against",
          `budget-game-route-payload emitted ${liveBudgets.length} budget row(s) with no ` +
            `subject to measure: ${liveBudgets.map((budget) => `${budget.name}=${budget.measured}`).join(", ")}`,
          "packages/validators/src/checks/budgets/game-route-payload.ts",
        );
      }
      if (!liveNotMeasurable.some((entry) => entry.reason.includes("NOT MEASURED"))) {
        record(
          "the unmeasured payload budget is named out loud under NOT MEASURABLE HERE",
          `notMeasurable entries: ${liveNotMeasurable.map((entry) => entry.property).join("; ") || "none"}`,
          "packages/validators/src/checks/budgets/game-route-payload.ts",
        );
      }
      if (liveResult.status !== "pass") {
        record(
          "an absent subject at Phase 0 does not fail the suite, so the suite does not sit " +
            "red for three phases and train everyone to ignore it",
          `status was ${liveResult.status}`,
          "packages/validators/src/checks/budgets/game-route-payload.ts",
        );
      }
    } else if (liveResult.status === "pass" && liveBudgets.length === 0) {
      record(
        "once apps/web exists, the payload gate either reports a measured number or fails",
        `subject state is ${liveSubject.kind} and the check passed with no budget row, ` +
          `which is the vacuous pass this self test exists to prevent`,
        "packages/validators/src/checks/budgets/game-route-payload.ts",
      );
    }

    if (failures.length > 0) return failed(failures);

    return passed({
      notMeasurable: [
        {
          property: "whether the impure fixture resembles a real accident",
          reason:
            "it proves the gate fires on an import of react three levels down, on a DOM " +
            "global, and on an unreachable module. It cannot prove there is no fourth way " +
            "to smuggle React into chem-core that this gate would miss. Adversary work.",
        },
      ],
    });
  },
};
