import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { REPO_ROOT } from "../paths.ts";

/**
 * The mutation score record, and the fingerprint that stops it going stale.
 *
 * WHY A RECORDED NUMBER RATHER THAN RUNNING STRYKER INSIDE A CHECK.
 *
 * A full mutation run over chem-core takes minutes. `npm run validate` is the command a
 * builder runs after every edit, and a suite that takes minutes is a suite that gets run
 * once a day and then argued with. So the slow measurement is its own command,
 * `npm run mutate`, and this file is the contract between the two.
 *
 * WHY THAT IS NOT THE USUAL "MEASURED ONCE, COASTED FOREVER" HOLE.
 *
 * The record carries `sourceFingerprint`, a hash over everything the score is a claim
 * about: the mutated sources, the tests that judged them, and the two config files that
 * decide what was mutated and how it was run. The check recomputes it from disk on every
 * validate. If a single byte of any of those has changed since the score was taken, the
 * recorded score is no longer a statement about what is there, and the check fails as
 * STALE rather than reporting the old number. Editing chem-core, or deleting a test,
 * therefore forces a fresh mutation run before the suite can go green again, which is the
 * same discipline the fixture count baseline and validators.lock.json already use.
 *
 * The record is committed. A checkout with no record has never been measured, and the
 * check says so and fails, because "no number" must not read as "fine".
 */

export const MUTATION_RECORD_SCHEMA_VERSION = 1;

/** Where the record lives. Outside packages/validators on purpose: the integrity lock
 * hashes every file in that package, so a results file written there would make every
 * mutation run report the suite as MODIFIED. */
export const MUTATION_RECORD_PATH = path.join(
  REPO_ROOT,
  "packages",
  "chem-core",
  "mutation",
  "last-run.json",
);

const CHEM_CORE_DIR = path.join(REPO_ROOT, "packages", "chem-core");

/**
 * Everything the score is a statement about.
 *
 * Not just src/. A mutation score is a claim about a pair: these sources, judged by these
 * tests, under this configuration. Fingerprinting only the mutated sources would let
 * somebody delete half the tests and keep a green gate, because the recorded number would
 * still describe sources that had not changed. So the tests and both config files are in
 * the hash as well, and weakening the suite makes the record STALE in exactly the way
 * editing the engine does.
 */
const FINGERPRINTED_DIRS: readonly string[] = [
  path.join(CHEM_CORE_DIR, "src"),
  path.join(CHEM_CORE_DIR, "test"),
];

const FINGERPRINTED_FILES: readonly string[] = [
  path.join(CHEM_CORE_DIR, "vitest.config.ts"),
  path.join(CHEM_CORE_DIR, "stryker.config.json"),
];

export interface MutationRecord {
  readonly schemaVersion: number;
  /** Percentage of mutants killed, as Stryker computes it. Not rounded here. */
  readonly mutationScore: number;
  readonly killed: number;
  readonly survived: number;
  readonly timeout: number;
  readonly noCoverage: number;
  readonly compileErrors: number;
  readonly runtimeErrors: number;
  /** killed + survived + timeout + noCoverage + errors. The denominator of the score. */
  readonly totalMutants: number;
  /** The threshold in force when the run happened, for the audit trail. */
  readonly thresholdBreak: number;
  readonly sourceFingerprint: string;
  readonly fileCount: number;
  readonly recordedAt: string;
  readonly strykerVersion: string;
}

async function listSourceFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    // A missing directory is a real state, not a crash: deleting packages/chem-core/test
    // must change the fingerprint rather than blow up the check that would have caught it.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await listSourceFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      found.push(full);
    }
  }
  return found;
}

export interface SourceFingerprint {
  readonly fingerprint: string;
  readonly fileCount: number;
  /** Package relative, forward slashes, sorted. Printed when a run goes stale. */
  readonly files: readonly string[];
}

/**
 * A hash over the chem-core sources, path and content, in sorted order.
 *
 * Content is hashed with CRLF normalised to LF. Windows checkouts and CI checkouts
 * otherwise disagree on every file, and a fingerprint that reports STALE because of line
 * endings would be treated as noise within a week, which is how a gate dies.
 */
export async function chemCoreSourceFingerprint(): Promise<SourceFingerprint> {
  const fromDirs: string[] = [];
  for (const dir of FINGERPRINTED_DIRS) {
    fromDirs.push(...(await listSourceFiles(dir)));
  }
  for (const file of FINGERPRINTED_FILES) {
    try {
      await fs.access(file);
      fromDirs.push(file);
    } catch {
      // Absent is a state the hash should reflect, so it simply contributes nothing.
    }
  }
  const absolute = fromDirs.sort();
  const hash = createHash("sha256");
  const files: string[] = [];
  for (const file of absolute) {
    const relative = path.relative(REPO_ROOT, file).split(path.sep).join("/");
    files.push(relative);
    const text = (await fs.readFile(file, "utf8")).replace(/\r\n/g, "\n");
    hash.update(relative);
    hash.update("\0");
    hash.update(text);
    hash.update("\0");
  }
  return { fingerprint: hash.digest("hex"), fileCount: files.length, files };
}

export type MutationRecordRead =
  | { readonly status: "ok"; readonly record: MutationRecord }
  | { readonly status: "absent" }
  | { readonly status: "unreadable"; readonly reason: string };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Read and validate the record. A malformed record is never treated as a missing one. */
export async function readMutationRecord(): Promise<MutationRecordRead> {
  let text: string;
  try {
    text = await fs.readFile(MUTATION_RECORD_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { status: "absent" };
    return { status: "unreadable", reason: `${(error as Error).message}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { status: "unreadable", reason: `not valid JSON: ${(error as Error).message}` };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: "unreadable", reason: "the record is not a JSON object" };
  }
  const raw = parsed as Record<string, unknown>;

  const numericKeys = [
    "schemaVersion",
    "mutationScore",
    "killed",
    "survived",
    "timeout",
    "noCoverage",
    "compileErrors",
    "runtimeErrors",
    "totalMutants",
    "thresholdBreak",
    "fileCount",
  ] as const;
  for (const key of numericKeys) {
    if (!isFiniteNumber(raw[key])) {
      return { status: "unreadable", reason: `field "${key}" is missing or not a finite number` };
    }
  }
  for (const key of ["sourceFingerprint", "recordedAt", "strykerVersion"] as const) {
    if (typeof raw[key] !== "string" || (raw[key] as string).trim() === "") {
      return { status: "unreadable", reason: `field "${key}" is missing or not a non empty string` };
    }
  }
  if (raw["schemaVersion"] !== MUTATION_RECORD_SCHEMA_VERSION) {
    return {
      status: "unreadable",
      reason:
        `record schema v${String(raw["schemaVersion"])}, this build understands ` +
        `v${MUTATION_RECORD_SCHEMA_VERSION}. Re-run npm run mutate.`,
    };
  }

  return { status: "ok", record: raw as unknown as MutationRecord };
}
