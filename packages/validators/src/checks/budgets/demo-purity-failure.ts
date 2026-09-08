import path from "node:path";
import { fileURLToPath } from "node:url";

import { CHEM_CORE_BANNED } from "../../measure/banned.ts";
import {
  CHEM_CORE_EXTERNALS,
  listChemCoreDistModules,
  resolveChemCoreEntry,
} from "../../measure/chem-core.ts";
import { analysePurity, formatChain, type PurityFindings } from "../../measure/purity.ts";

/**
 * Run the purity gate against both subjects and print what it saw.
 *
 * This exists so the gate can be watched failing by a human, on demand, without reading
 * a report format. The same analysis runs inside budget-gate-self-test.ts on every
 * `npm run validate`, so this script is a window onto it and not a second implementation.
 *
 *   node --experimental-strip-types packages/validators/src/checks/budgets/demo-purity-failure.ts
 *
 * Exits 0 when the real chem-core is pure and the impure fixture is impure, which is the
 * only combination that means the gate works. It exits nonzero if either the engine is
 * dirty or the fixture is reported clean, because a gate that cannot fail is not
 * evidence about the one that passed.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));

function printFindings(label: string, findings: PurityFindings): void {
  console.log(`  entry:              ${findings.entryInput}`);
  console.log(`  modules inspected:  ${findings.modulesInspected}`);
  console.log(`  bundle:             ${findings.bundleBytes} bytes, ${findings.gzipBytes} gzipped`);
  console.log(`  import violations:  ${findings.importViolations.length}`);
  for (const violation of findings.importViolations) {
    console.log(`    ${violation.rule.name}`);
    console.log(`      chain: ${formatChain(violation.chain)}`);
    console.log(`      rule:  ${violation.rule.source}`);
  }
  console.log(`  DOM globals:        ${findings.domGlobals.length}`);
  for (const hit of findings.domGlobals) {
    console.log(`    ${hit.identifier}, ${hit.occurrences} occurrence(s)`);
    console.log(`      near: ${hit.excerpt}`);
  }
  console.log(`  uninspected:        ${findings.uninspected.length}`);
  for (const module of findings.uninspected) console.log(`    ${module}`);
  console.log(`  ${label}`);
}

async function main(): Promise<number> {
  let exitCode = 0;

  console.log("PURITY GATE, real chem-core");
  const entry = await resolveChemCoreEntry();
  if (entry.kind !== "ok") {
    console.log(`  cannot measure: ${entry.detail}`);
    return 1;
  }
  const real = await analysePurity({
    entryPointAbsolute: entry.absolute,
    external: CHEM_CORE_EXTERNALS,
    rules: CHEM_CORE_BANNED,
    expectedModules: await listChemCoreDistModules(),
  });
  if (real.kind !== "analysed") {
    console.log(`  cannot measure: ${real.kind}`);
    return 1;
  }
  const realClean =
    real.findings.importViolations.length === 0 &&
    real.findings.domGlobals.length === 0 &&
    real.findings.uninspected.length === 0;
  printFindings(realClean ? "VERDICT: pure" : "VERDICT: IMPURE", real.findings);
  if (!realClean) exitCode = 1;

  console.log("");
  console.log("PURITY GATE, deliberately impure build fixture");
  const impure = await analysePurity({
    entryPointAbsolute: path.join(HERE, "impure-build-fixture", "index.js"),
    external: CHEM_CORE_EXTERNALS,
    rules: CHEM_CORE_BANNED,
    expectedModules: [
      "packages/validators/src/checks/budgets/impure-build-fixture/orphan-renderer.js",
    ],
  });
  if (impure.kind !== "analysed") {
    console.log(`  cannot measure: ${impure.kind}`);
    return 1;
  }
  const fixtureFired =
    impure.findings.importViolations.length > 0 ||
    impure.findings.domGlobals.length > 0 ||
    impure.findings.uninspected.length > 0;
  printFindings(
    fixtureFired ? "VERDICT: IMPURE, the gate fired as required" : "VERDICT: pure, THE GATE IS BLIND",
    impure.findings,
  );
  if (!fixtureFired) exitCode = 1;

  return exitCode;
}

process.exitCode = await main();
