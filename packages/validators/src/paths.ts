import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Roots are derived from this module's own location, never from process.cwd().
 *
 * Why: the validator is run by an orchestrator, by npm from the repo root, and by a
 * human from inside the package. Those three have three different working directories.
 * A lock file whose contents depend on where you happened to stand is not a lock file.
 */

/** Absolute path to packages/validators. */
export const PACKAGE_ROOT: string = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
);

/** Absolute path to the repository root. */
export const REPO_ROOT: string = path.resolve(PACKAGE_ROOT, "..", "..");

/** Absolute path to the committed lock file. */
export const LOCK_PATH: string = path.join(PACKAGE_ROOT, "validators.lock.json");

/** Absolute path to the fixture corpus. */
export const FIXTURES_DIR: string = path.join(PACKAGE_ROOT, "fixtures");

/**
 * Absolute path to machine written run output. Gitignored, and excluded from the
 * integrity lock, because it changes on every run by design.
 */
export const RESULTS_DIR: string = path.join(PACKAGE_ROOT, "results");

/** Where the previous run's fixture count is recorded. */
export const LAST_RUN_PATH: string = path.join(RESULTS_DIR, "last-run.json");

/** Convert an absolute path to a package relative path with forward slashes. */
export function toPackageRelative(absolutePath: string): string {
  return path.relative(PACKAGE_ROOT, absolutePath).split(path.sep).join("/");
}

/**
 * Convert an absolute path to a repository relative path with forward slashes.
 *
 * Used by the integrity lock for the declared external data set, which by definition
 * lives outside PACKAGE_ROOT, so a package relative path for it would be a string of
 * "../.." segments that nobody can read in a lock diff.
 */
export function toRepoRelative(absolutePath: string): string {
  return path.relative(REPO_ROOT, absolutePath).split(path.sep).join("/");
}

/** Resolve a repository relative path, forward slashes, to an absolute path. */
export function fromRepoRelative(repoRelativePath: string): string {
  return path.join(REPO_ROOT, ...repoRelativePath.split("/"));
}
