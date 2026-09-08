import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { EXIT_CHECK_FAILED, EXIT_HARNESS_ERROR, EXIT_OK } from "../exit-codes.ts";
import {
  chemCoreSourceFingerprint,
  MUTATION_RECORD_PATH,
  MUTATION_RECORD_SCHEMA_VERSION,
  type MutationRecord,
} from "../measure/mutation-record.ts";
import { REPO_ROOT } from "../paths.ts";

/**
 * `npm run mutate`. The slow half of the mutation gate.
 *
 * It does three things and nothing else: run Stryker over packages/chem-core, distil its
 * report into the small committed record the validator suite reads, and exit nonzero if
 * the score is under the threshold.
 *
 * WHY A SCRIPT AND NOT JUST `stryker run`.
 *
 * Stryker's own JSON report is a large machine artifact listing every mutant. It is
 * useful while writing tests and useless as committed evidence, and committing it would
 * put a several megabyte file that changes on every run into git history. The record
 * written here is a dozen numbers plus a fingerprint of the sources they describe. See
 * measure/mutation-record.ts for why the fingerprint is the part that matters.
 *
 * WHY THE FINGERPRINT IS TAKEN BEFORE STRYKER RUNS.
 *
 * It has to describe the code that was measured. Taking it afterwards would let an edit
 * made while the run was in flight be recorded as measured when it was not.
 */

const CHEM_CORE_DIR = path.join(REPO_ROOT, "packages", "chem-core");
const STRYKER_REPORT_PATH = path.join(CHEM_CORE_DIR, "mutation", "stryker-report.json");

interface StrykerMutant {
  readonly status: string;
}

interface StrykerReport {
  readonly schemaVersion?: string;
  readonly files?: Record<string, { readonly mutants?: readonly StrykerMutant[] }>;
}

function runStryker(): Promise<number> {
  return new Promise((resolve, reject) => {
    // Spawned through the workspace binary rather than through npm so that the exit code
    // arriving here is Stryker's own and not npm's summary of it.
    const bin = path.join(
      REPO_ROOT,
      "node_modules",
      "@stryker-mutator",
      "core",
      "bin",
      "stryker.js",
    );
    const child = spawn(process.execPath, [bin, "run"], {
      cwd: CHEM_CORE_DIR,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? EXIT_HARNESS_ERROR));
  });
}

async function strykerVersion(): Promise<string> {
  const manifest = path.join(REPO_ROOT, "node_modules", "@stryker-mutator", "core", "package.json");
  const text = await fs.readFile(manifest, "utf8");
  const parsed = JSON.parse(text) as { version?: unknown };
  return typeof parsed.version === "string" ? parsed.version : "unknown";
}

async function thresholdBreak(): Promise<number> {
  const configPath = path.join(CHEM_CORE_DIR, "stryker.config.json");
  const parsed = JSON.parse(await fs.readFile(configPath, "utf8")) as {
    thresholds?: { break?: unknown };
  };
  const value = parsed.thresholds?.break;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `packages/chem-core/stryker.config.json has no numeric thresholds.break. ` +
        `The Phase 1 exit condition is 80 percent killed and it has to be written down ` +
        `somewhere a reader can find it.`,
    );
  }
  return value;
}

/** Count mutants by Stryker status. Status strings are the mutation-testing-elements schema. */
function tally(report: StrykerReport): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of Object.values(report.files ?? {})) {
    for (const mutant of file.mutants ?? []) {
      counts[mutant.status] = (counts[mutant.status] ?? 0) + 1;
    }
  }
  return counts;
}

async function main(): Promise<number> {
  const fingerprint = await chemCoreSourceFingerprint();
  console.log("");
  console.log("MUTATION RUN");
  console.log(`  subject:     packages/chem-core/src (${fingerprint.fileCount} files)`);
  console.log(`  fingerprint: ${fingerprint.fingerprint}`);
  console.log("");

  await fs.rm(STRYKER_REPORT_PATH, { force: true });
  const strykerExit = await runStryker();

  let report: StrykerReport;
  try {
    report = JSON.parse(await fs.readFile(STRYKER_REPORT_PATH, "utf8")) as StrykerReport;
  } catch (error) {
    console.log("");
    console.log("MUTATION RUN: no report written, so no score is recorded.");
    console.log(`  stryker exit code: ${strykerExit}`);
    console.log(`  reason: ${(error as Error).message}`);
    console.log("");
    console.log("The previous record is left alone. A failed run must not overwrite a");
    console.log("measurement with a guess.");
    return EXIT_HARNESS_ERROR;
  }

  const counts = tally(report);
  const killed = counts["Killed"] ?? 0;
  const survived = counts["Survived"] ?? 0;
  const timeout = counts["Timeout"] ?? 0;
  const noCoverage = counts["NoCoverage"] ?? 0;
  const compileErrors = counts["CompileError"] ?? 0;
  const runtimeErrors = counts["RuntimeError"] ?? 0;
  const ignored = counts["Ignored"] ?? 0;
  const totalMutants =
    killed + survived + timeout + noCoverage + compileErrors + runtimeErrors + ignored;

  // Stryker's own definition: detected over valid, where detected is killed plus timeout
  // and valid excludes compile errors, runtime errors, and ignored mutants. Recomputed
  // here from the raw statuses rather than read off a summary field, because the number
  // that gates a phase should be derivable from the counts printed beside it.
  const valid = killed + survived + timeout + noCoverage;
  const detected = killed + timeout;
  const mutationScore = valid === 0 ? 0 : (detected / valid) * 100;

  const record: MutationRecord = {
    schemaVersion: MUTATION_RECORD_SCHEMA_VERSION,
    mutationScore,
    killed,
    survived,
    timeout,
    noCoverage,
    compileErrors,
    runtimeErrors,
    totalMutants,
    thresholdBreak: await thresholdBreak(),
    sourceFingerprint: fingerprint.fingerprint,
    fileCount: fingerprint.fileCount,
    recordedAt: new Date().toISOString(),
    strykerVersion: await strykerVersion(),
  };

  await fs.mkdir(path.dirname(MUTATION_RECORD_PATH), { recursive: true });
  await fs.writeFile(MUTATION_RECORD_PATH, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  console.log("");
  console.log("MUTATION SCORE");
  console.log(`  score:     ${mutationScore.toFixed(2)} percent killed`);
  console.log(`  killed:    ${killed}`);
  console.log(`  survived:  ${survived}`);
  console.log(`  timeout:   ${timeout}   (counted as detected)`);
  console.log(`  no cover:  ${noCoverage}   (counted as undetected)`);
  console.log(`  errors:    ${compileErrors} compile, ${runtimeErrors} runtime  (excluded)`);
  console.log(`  total:     ${totalMutants} mutants generated`);
  console.log(`  threshold: ${record.thresholdBreak} percent`);
  console.log(`  recorded:  packages/chem-core/mutation/last-run.json`);
  console.log("");

  if (mutationScore < record.thresholdBreak) {
    console.log(
      `MUTATION SCORE BELOW THRESHOLD: ${mutationScore.toFixed(2)} < ${record.thresholdBreak}. ` +
        `The record is written anyway so the real number is on disk, and the validator ` +
        `suite will fail on it until tests kill the survivors.`,
    );
    return EXIT_CHECK_FAILED;
  }
  return EXIT_OK;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.log("MUTATION HARNESS ERROR");
  console.log(`  ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  process.exitCode = EXIT_HARNESS_ERROR;
}
