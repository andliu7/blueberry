import fs from "node:fs/promises";
import path from "node:path";

import { FIXTURES_DIR, LAST_RUN_PATH, RESULTS_DIR, toPackageRelative } from "./paths.ts";

/**
 * Fixture counting.
 *
 * chem-validator.md: "A green run on an empty or reduced fixture set is a failure.
 * Report the fixture count every time. If it dropped since the last run, lead with that
 * before anything else."
 *
 * The count is read off the real directory. It is never a constant in this file. Right
 * now that number is 0, and 0 is what gets printed.
 */

export interface FixtureScan {
  readonly dir: string;
  readonly dirExists: boolean;
  /** Absolute paths, sorted. */
  readonly files: readonly string[];
  readonly count: number;
}

/** Dotfiles are tooling, not fixtures. .gitkeep must not inflate the corpus count. */
function isHidden(name: string): boolean {
  return name.startsWith(".");
}

/**
 * Documentation that lives beside the fixtures and is not one.
 *
 * This is the single source of truth for the exclusion. Every consumer imports it from
 * here rather than keeping its own copy, because counting fixtures in two places is how
 * the two counts end up disagreeing, and a corpus count that reads high is exactly how a
 * silent drop hides. This list was added after README.md inflated the reported count
 * from 12 to 13.
 */
export const NON_FIXTURE_FILES: readonly string[] = ["README.md"];

function isNonFixture(name: string): boolean {
  return NON_FIXTURE_FILES.includes(name);
}

async function walk(dir: string, collected: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (isHidden(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute, collected);
    } else if (entry.isFile()) {
      if (isNonFixture(entry.name)) continue;
      collected.push(absolute);
    }
  }
}

export async function scanFixtures(): Promise<FixtureScan> {
  let dirExists = true;
  const collected: string[] = [];

  try {
    await walk(FIXTURES_DIR, collected);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") dirExists = false;
    else throw error;
  }

  collected.sort();

  return {
    dir: toPackageRelative(FIXTURES_DIR),
    dirExists,
    files: collected,
    count: collected.length,
  };
}

/**
 * The previous run's fixture count.
 *
 * Stored under results/, which is gitignored and excluded from the integrity lock, so
 * this baseline is local to a machine and advisory. On a fresh clone there is no
 * previous run and the report says so rather than inventing a number.
 *
 * The baseline is only updated by a run that passed. A run that fails on a dropped
 * count therefore keeps failing until the fixtures come back, instead of laundering the
 * drop into the new normal on the next invocation. Deleting results/last-run.json
 * clears it, which is a visible act someone has to choose to take.
 */
export interface LastRun {
  readonly fixtureCount: number;
  readonly suiteHash: string;
  readonly recordedAt: string;
}

export async function readLastRun(): Promise<LastRun | null> {
  try {
    const raw = await fs.readFile(LAST_RUN_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Partial<LastRun>;
    if (typeof candidate.fixtureCount !== "number") return null;
    return {
      fixtureCount: candidate.fixtureCount,
      suiteHash: typeof candidate.suiteHash === "string" ? candidate.suiteHash : "",
      recordedAt: typeof candidate.recordedAt === "string" ? candidate.recordedAt : "",
    };
  } catch {
    return null;
  }
}

export async function writeLastRun(record: LastRun): Promise<void> {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  await fs.writeFile(LAST_RUN_PATH, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}
