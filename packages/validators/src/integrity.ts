import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  LOCK_PATH,
  PACKAGE_ROOT,
  fromRepoRelative,
  toPackageRelative,
  toRepoRelative,
} from "./paths.ts";

/**
 * Suite integrity.
 *
 * CLAUDE.md, "Suite integrity": packages/validators carries a committed
 * validators.lock.json holding a hash of every file in the package. Every validator run
 * recomputes and compares first. On mismatch the validator reports MODIFIED with the
 * changed file list and refuses to report results.
 *
 * docs/VERIFICATION.md S7 records why this exists: the draft asked the validator to
 * confirm the suite was unmodified and gave it no way to know, so it would either skip
 * the step or invent a confirmation.
 *
 * Regenerating the lock is a deliberate, separate act. Nothing in this file writes the
 * lock except regenerateLock(), and nothing calls regenerateLock() except the explicit
 * `lock regen` subcommand.
 *
 * ---------------------------------------------------------------------------------
 * THE EXTERNAL DATA SET, WHICH IS THE SECOND HALF OF THIS FILE.
 *
 * Hashing every file in packages/validators states one thing: the suite is the suite
 * that was reviewed. It does not state that the suite's ANSWERS are the answers that
 * were reviewed, and the two came apart in adversary pass two, finding 4.
 *
 * `conservation-disfavoured-rate-comparison` rule 4 decides whether a fixture's named
 * competing pathway is believed by asking `competingRoutesFor()` in
 * @blueberry/feedback, whose data is one array literal in
 * packages/feedback/src/copy/sterics.ts. Nothing under packages/validators changes when
 * that array changes. So a fixture the suite rejects today can be made to pass by
 * editing an ordinary implementation package, with no fixture edit, no lock mismatch,
 * and nothing at all to see in a validator run. The intent of the lock, that a suite
 * edited by the agent under test is not evidence, leaks the moment a validator
 * assertion depends on data outside the hashed set.
 *
 * WHAT IS FINGERPRINTED, AND WHY IT IS NOT THE WHOLE PACKAGE.
 *
 * Hashing all of packages/feedback would work and would be wrong in practice. That
 * package is authored student copy. The prose in it is meant to be rewritten, often,
 * by somebody who is not touching chemistry, and a lock that reports MODIFIED on every
 * wording edit gets regenerated without being read, which is how a lock stops being a
 * lock. So the fingerprint is narrower than the file and narrower than the package:
 *
 *   1. The DATA the validator grades against, extracted from the source text. For
 *      @blueberry/feedback that is the `competingRoutes` arrays in
 *      packages/feedback/src/copy/, and nothing else in those files. Rewriting
 *      whatYouDid, why, or lookAt changes no fingerprint. Changing which route beats a
 *      hindered SN2 changes it, and the lock diff shows the old and new route lists in
 *      plain text rather than a hash, because the point is that a human reviewing the
 *      diff can see what moved.
 *   2. The CODE that turns that data into the answer the validator reads, byte for
 *      byte: registry.ts and index.ts. Those are plumbing, not prose, and they are what
 *      you would have to edit to make `competingRoutesFor` return something the copy
 *      files do not say.
 *   3. The LIST of files the data was extracted from. A new file in copy/ changes the
 *      recorded list, so the extracted set cannot grow or shrink in silence.
 *
 * WHY THE DECLARATION IS A CENSUS AND NOT A LIST OF FAVOURITES.
 *
 * A declaration nobody is forced to update is a comment. So EXTERNAL_DATA below is
 * checked for completeness against the actual import graph of this package on every
 * run: every module specifier this package imports for its VALUES has to appear, and
 * for a package that plays more than one role, every imported binding has to be
 * classified. An import nobody declared is a hard stop with its own status, not a
 * warning, and `lock regen` refuses to write a lock while one exists, so regeneration
 * cannot bless an undeclared dependency by accident. A declared entry that nothing
 * imports any more is also a stop, because a census that only grows stops describing
 * anything.
 *
 * This mirrors CLAUDE.md's system boundary rule for spectators: a thing may be excluded
 * from the accounting, but declaring it is an explicit, recorded act that a validator
 * can see and an adversary can attack.
 *
 * WHERE THE LINE IS DRAWN AT packages/chem-core, WHICH IS THE OTHER HALF OF THE
 * QUESTION.
 *
 * chem-core is declared, and it is deliberately not fingerprinted. The suite exists to
 * grade chem-core. A gate that reported the suite as MODIFIED on every engine edit
 * would be telling a builder that improving the thing under test has invalidated the
 * evidence, which is backwards: the correct reaction to an engine edit is to RE-RUN the
 * checks, not to refuse to run them. chem-core is also not unguarded. It already has a
 * gate built for exactly this shape, `chemCoreSourceFingerprint()` in
 * measure/mutation-record.ts, which hashes src, test, and both config files and reports
 * the mutation score STALE the moment any byte moves. STALE forces a fresh measurement.
 * MODIFIED refuses to report. Those are the right verbs for the two cases, and this
 * file borrows that file's vocabulary rather than inventing a second one: a fingerprint
 * over a declared set of paths, CRLF normalised, with the path in the hash alongside the
 * content so a rename is a change.
 *
 * The residual risk, stated rather than hidden: a check that grades a fixture against
 * chem-core data, `allMechanismRoutes()` for instance, is trusting the subject under
 * test as a vocabulary. That is a narrower exposure than the feedback one was, because
 * MechanismRoute is a closed union in the type system, so editing it breaks compilation
 * across every fixture and check that names a route, and because any such edit makes
 * the mutation record STALE. It is not zero. If a later phase adds a check that reads
 * chem-core as an answer key rather than as a vocabulary, the honest fix is to add a
 * projection for that specific datum, exactly as was done here for competingRoutes, not
 * to fingerprint the whole engine.
 */

/**
 * Bump when the on disk shape changes. A reader that sees an unknown version stops.
 *
 * v2 added the externalData section. A v1 lock is refused rather than compared, because
 * a v1 lock cannot say anything about the external data set and a comparison that
 * silently skips half the claim reads as clean.
 */
export const LOCK_SCHEMA_VERSION = 2;

/** Hash algorithm recorded in the lock so a future change is detectable, not silent. */
export const HASH_ALGORITHM = "sha256";

/** Hex, lowercase. Recorded in the lock for the same reason. */
export const HASH_ENCODING = "hex";

/**
 * Directory names never hashed, at any depth.
 *
 * node_modules and dist are dependencies and build output. results is machine written
 * run output that changes on every run, so hashing it would make every run after the
 * first report MODIFIED. Nothing under any of these is ever imported by a check, and
 * the list is recorded inside the lock so an auditor can see exactly what was skipped.
 */
export const EXCLUDED_DIRECTORY_NAMES: readonly string[] = [
  ".git",
  ".turbo",
  ".vite",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "results",
];

/**
 * Files never hashed.
 *
 * The lock excludes itself. Including it would make regeneration a fixed point problem
 * that never converges, since writing the lock changes the lock.
 */
export const EXCLUDED_FILE_NAMES: readonly string[] = ["validators.lock.json"];

/* ------------------------------------------------------------------------------------
 * The external data declaration.
 * ---------------------------------------------------------------------------------- */

/**
 * What an external import is to this suite.
 *
 * `oracle-data`      Its value is part of the answer key a fixture is graded against.
 *                    Must be covered by a projection, so the answer key is in the lock.
 * `subject-under-test`
 *                    The suite grades this. Deliberately not fingerprinted: the right
 *                    reaction to it changing is to re-run the checks, not to refuse.
 * `no-data`          Carries no data the suite grades against. Pure functions of
 *                    arguments the caller supplies, or test harness entry points.
 */
export type ExternalBindingRole = "oracle-data" | "subject-under-test" | "no-data";

/** A projection is a named, reproducible reading of data out of an external package. */
export interface DeclaredProjection {
  /** Recorded in the lock. Appears in every diff line the projection produces. */
  readonly name: string;
  /** Which declared bindings this projection is the fingerprint for. */
  readonly covers: readonly string[];
  /** Repo relative directory whose .ts files carry the data. Read as text, never run. */
  readonly extractFromDir: string;
  /** Repo relative files hashed byte for byte: the code that serves the data. */
  readonly hashFiles: readonly string[];
}

export interface DeclaredBinding {
  readonly role: ExternalBindingRole;
  readonly reason: string;
}

export interface DeclaredExternalPackage {
  readonly specifier: string;
  /**
   * `mixed` means the package plays more than one role and every value binding this
   * suite imports from it has to be classified one at a time. The other two roles are
   * whole package judgements and need no binding census, which keeps a new import of an
   * uncontroversial helper from being a lock event.
   */
  readonly role: ExternalBindingRole | "mixed";
  readonly reason: string;
  readonly bindings?: Readonly<Record<string, DeclaredBinding>>;
  readonly projections?: readonly DeclaredProjection[];
}

/**
 * Every module specifier this package imports for its values.
 *
 * Checked for completeness on every run. Adding an import that is not here is a hard
 * stop, and so is leaving an entry here that nothing imports.
 */
export const EXTERNAL_DATA: readonly DeclaredExternalPackage[] = [
  {
    specifier: "@blueberry/interaction",
    role: "subject-under-test",
    reason:
      "Adversary tests for the interaction layer live in this package's tests/ directory, " +
      "because CLAUDE.md's git discipline confines an adversary's diff to fixtures/ and tests/ " +
      "here. Those tests import the interaction package to grade it, which makes it a subject " +
      "under test by exactly the chem-core reasoning above: fingerprinting the thing the tests " +
      "exist to attack would report the evidence inadmissible every time it is edited. Nothing " +
      "in this package reads interaction as an answer key. Orchestrator ruling, Phase 2 " +
      "verification pass, after the census correctly refused to let the import in undeclared.",
  },
  {
    specifier: "@blueberry/chem-core",
    role: "subject-under-test",
    reason:
      "The suite exists to grade chem-core. Fingerprinting it would report the evidence " +
      "inadmissible every time the engine is edited, when the correct reaction to an engine " +
      "edit is to re-run the checks. chem-core is separately fingerprinted by " +
      "chemCoreSourceFingerprint() in measure/mutation-record.ts, which reports the mutation " +
      "score STALE on any byte change and forces a fresh measurement.",
  },
  {
    specifier: "@blueberry/curriculum",
    role: "subject-under-test",
    reason:
      "curriculum-corpus grades the authored problem corpus and the reaction table, so this is a " +
      "subject by the same chem-core reasoning above: fingerprinting it would report the evidence " +
      "inadmissible every time a problem is authored, when the correct reaction to a new problem " +
      "is to re-run the checks. Authoring is the expected daily activity in this package, so a " +
      "MODIFIED verdict on it would fire more often than any other and be ignored fastest. " +
      "Nothing in this suite reads curriculum as an answer key. The check does call the package's " +
      "own checkAnswer over the package's own distractors, which is the subject grading itself, " +
      "and that is stated in the check's header rather than hidden here: what it establishes is " +
      "that the corpus and its checker are consistent plus a set of counts, never that the " +
      "chemistry is right. The chemistry is a human review gate per CLAUDE.md, and the RDKit " +
      "oracle, the one thing here that grades against an outside implementation, does not reach " +
      "this package. Orchestrator ruling, Phase 3 wave two, after the census correctly refused to " +
      "let the import in undeclared.",
  },
  {
    specifier: "@blueberry/feedback",
    role: "mixed",
    reason:
      "This package is both graded and consulted. feedback-copy-coverage grades its copy, so " +
      "there it is the subject. conservation-disfavoured-rate-comparison rule 4 asks it which " +
      "route beats a strongly hindered SN2 and rejects a fixture that disagrees, so there it is " +
      "the answer key. Only the answer key half is fingerprinted.",
    bindings: {
      competingRoutesFor: {
        role: "oracle-data",
        reason:
          "rate-comparison.ts rule 4 rejects a fixture whose named competing pathway is not in " +
          "this list. That makes the list an answer key and it belongs in the lock.",
      },
      causeCopy: {
        role: "subject-under-test",
        reason:
          "copy-coverage reads the three prose fields and grades them for presence. The prose is " +
          "meant to be rewritten and is not fingerprinted. The competingRoutes field reachable " +
          "through this same object IS fingerprinted, because the projection below extracts it " +
          "from the copy source rather than from any one binding.",
      },
      copyCount: {
        role: "subject-under-test",
        reason: "A count of authored entries, reported as a measured number by copy-coverage.",
      },
      copyCoverage: {
        role: "subject-under-test",
        reason:
          "The missing and extra sets copy-coverage grades. A change here is meant to change the " +
          "reported coverage number, which is the check doing its job.",
      },
      copyIsComplete: {
        role: "subject-under-test",
        reason: "The boolean form of copyCoverage, same reasoning.",
      },
    },
    projections: [
      {
        name: "cause-copy-competing-routes",
        covers: ["competingRoutesFor"],
        extractFromDir: "packages/feedback/src/copy",
        hashFiles: ["packages/feedback/src/registry.ts", "packages/feedback/src/index.ts"],
      },
    ],
  },
  {
    specifier: "vitest",
    role: "no-data",
    reason:
      "The test runner. describe, it, expect, and vi are harness entry points and carry no " +
      "chemistry the suite grades anything against.",
  },
  {
    specifier: "esbuild",
    role: "no-data",
    reason:
      "The bundler measure/bundle.ts loads to weigh chem-core against the CLAUDE.md size " +
      "ceilings and to walk the built import graph for the purity gate. It is no-data because " +
      "it supplies no part of any answer key: every byte it reports comes from the entry point " +
      "it is handed, and the metafile it returns is a description of that input, not a fact " +
      "about chemistry. Nothing in the suite grades a fixture against anything esbuild knows. " +
      "It was undeclared until the fourth pass adversary showed why: loadEsbuild() reached it " +
      "through a variable specifier, which scanImports could not read, so the census never saw " +
      "it. That call site is now a string literal and this entry is the other half of the fix. " +
      "The residual, stated rather than hidden: a different esbuild version can move the " +
      "measured byte count, which is a question about reproducing a MEASUREMENT and not about " +
      "an answer key, and the current margin is 12 KB against a 150 KB ceiling. It is also " +
      "still absent from packages/validators/package.json and resolves transitively through " +
      "vitest from the root node_modules; that is a packaging gap reported to the orchestrator, " +
      "not something this declaration pretends to fix.",
  },
];

/* ------------------------------------------------------------------------------------
 * Lock shape.
 * ---------------------------------------------------------------------------------- */

export interface ExternalDataSection {
  /** Declared specifiers, sorted. Informational, and it makes the diff obvious. */
  readonly declaredPackages: readonly string[];
  readonly entryCount: number;
  /** One value identifying the whole external data set. */
  readonly externalHash: string;
  /**
   * Flat, sorted, and deliberately legible rather than a single opaque digest.
   *
   * Keys read like "@blueberry/feedback projection cause-copy-competing-routes
   * sn2_center_strongly_hindered" and values like "carbocation_rearrangement", so a lock
   * diff shows which route moved and to what, in the review, without anybody rerunning
   * a tool to find out.
   */
  readonly entries: Readonly<Record<string, string>>;
}

export interface LockFile {
  readonly schemaVersion: number;
  readonly algorithm: string;
  readonly hashEncoding: string;
  /** Package relative, forward slashes, informational. */
  readonly root: string;
  readonly excludedDirectoryNames: readonly string[];
  readonly excludedFileNames: readonly string[];
  readonly fileCount: number;
  /** Hash of the sorted path and hash pairs, plus the external hash. One value. */
  readonly suiteHash: string;
  /** Path to hash, keys sorted by code point. */
  readonly files: Readonly<Record<string, string>>;
  /** The declared external data set. See the header. */
  readonly externalData: ExternalDataSection;
}

export type IntegrityStatus =
  | "unmodified"
  | "modified"
  | "external-data-undeclared"
  | "lock-missing"
  | "lock-unreadable"
  | "schema-mismatch";

export type DeclarationFindingKind =
  | "undeclared-package"
  | "undeclared-binding"
  | "declared-but-unused"
  | "unfingerprinted-oracle"
  | "declaration-inconsistent"
  | "projection-unreadable"
  | "unreadable-import";

export interface DeclarationFinding {
  readonly kind: DeclarationFindingKind;
  readonly detail: string;
}

export interface IntegrityReport {
  readonly status: IntegrityStatus;
  /** In the lock and on disk, different hash. */
  readonly changed: readonly string[];
  /** On disk, absent from the lock. */
  readonly added: readonly string[];
  /** In the lock, absent from disk. */
  readonly removed: readonly string[];
  /** The same three, for the external data set. Values are shown, not just keys. */
  readonly externalChanged: readonly string[];
  readonly externalAdded: readonly string[];
  readonly externalRemoved: readonly string[];
  /** Non empty only for status external-data-undeclared. */
  readonly declarationFindings: readonly DeclarationFinding[];
  readonly fileCountOnDisk: number;
  readonly fileCountInLock: number;
  readonly externalEntryCountOnDisk: number;
  readonly suiteHashOnDisk: string;
  readonly suiteHashInLock: string | null;
  /** Populated for lock-unreadable and schema-mismatch. */
  readonly detail: string | null;
}

/* ------------------------------------------------------------------------------------
 * Hashing the package itself.
 * ---------------------------------------------------------------------------------- */

function isExcludedDirectory(name: string): boolean {
  return EXCLUDED_DIRECTORY_NAMES.includes(name);
}

function isExcludedFile(relativePath: string): boolean {
  const base = relativePath.slice(relativePath.lastIndexOf("/") + 1);
  return EXCLUDED_FILE_NAMES.includes(base);
}

function hashOf(value: string | Buffer): string {
  return createHash(HASH_ALGORITHM).update(value).digest(HASH_ENCODING as "hex");
}

async function hashFileBytes(absolutePath: string): Promise<string> {
  return hashOf(await fs.readFile(absolutePath));
}

/**
 * Walk the package and hash every eligible file.
 *
 * Symlinks are recorded by their target string and never followed. Following one would
 * let content outside the package decide whether the suite reads as unmodified.
 */
async function walk(
  absoluteDir: string,
  collected: Map<string, string>,
): Promise<void> {
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  // Sort here as well as at the end. Cheap, and it makes the walk order itself
  // reproducible, which matters when debugging a mismatch by hand.
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  for (const entry of entries) {
    const absolute = path.join(absoluteDir, entry.name);
    const relative = toPackageRelative(absolute);

    if (entry.isSymbolicLink()) {
      const target = await fs.readlink(absolute);
      collected.set(relative, `symlink:${hashOf(target.split(path.sep).join("/"))}`);
      continue;
    }

    if (entry.isDirectory()) {
      if (isExcludedDirectory(entry.name)) continue;
      await walk(absolute, collected);
      continue;
    }

    if (!entry.isFile()) continue;
    if (isExcludedFile(relative)) continue;

    collected.set(relative, await hashFileBytes(absolute));
  }
}

function sortedRecord(entries: Map<string, string>): Record<string, string> {
  const keys = [...entries.keys()].sort();
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = entries.get(key);
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function hashRecord(record: Readonly<Record<string, string>>): string {
  const hash = createHash(HASH_ALGORITHM);
  for (const key of Object.keys(record)) {
    hash.update(key);
    hash.update("\0");
    hash.update(record[key] ?? "");
    hash.update("\n");
  }
  return hash.digest(HASH_ENCODING as "hex");
}

/* ------------------------------------------------------------------------------------
 * Reading TypeScript source as text.
 *
 * Both the import census and the data extraction below read source as text and never
 * import it. Importing packages/feedback to ask it what it contains would mean the thing
 * being fingerprinted gets to answer the question, and it would also read the built
 * dist/ rather than the committed src/, which is the half a human reviews.
 * ---------------------------------------------------------------------------------- */

/**
 * Blank comments, and optionally the insides of string and template literals, keeping
 * every byte position and line break so that line based matching still works.
 *
 * Comments are blanked because both scanners below look for identifiers, and this
 * repository's source carries long doc comments that discuss imports and field names by
 * name. A census that counted a sentence about an import as an import would be noise,
 * and noise is how a gate gets ignored.
 */
function blankOut(source: string, options: { readonly strings: boolean }): string {
  const out = source.split("");
  let i = 0;
  const n = source.length;

  const blank = (from: number, to: number): void => {
    for (let k = from; k < to; k += 1) {
      if (out[k] !== "\n") out[k] = " ";
    }
  };

  while (i < n) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      let end = source.indexOf("\n", i);
      if (end === -1) end = n;
      blank(i, end);
      i = end;
      continue;
    }
    if (two === "/*") {
      let end = source.indexOf("*/", i + 2);
      end = end === -1 ? n : end + 2;
      blank(i, end);
      i = end;
      continue;
    }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let k = i + 1;
      while (k < n) {
        if (source[k] === "\\") {
          k += 2;
          continue;
        }
        if (source[k] === quote) break;
        // An unterminated single or double quoted string cannot cross a line break in
        // valid TypeScript. Stopping at the newline keeps a malformed file from blanking
        // the rest of the module and hiding an import inside it.
        if (quote !== "`" && source[k] === "\n") break;
        k += 1;
      }
      const end = Math.min(k + 1, n);
      if (options.strings) blank(i + 1, Math.min(k, n));
      i = end;
      continue;
    }
    i += 1;
  }

  return out.join("");
}

export interface ImportSite {
  /** Module specifier as written. */
  readonly specifier: string;
  /** Exported names imported for their VALUES. "*" for a namespace import. */
  readonly valueBindings: readonly string[];
}

/**
 * Every static import, re-export, dynamic import, and require in one file.
 *
 * Type only imports contribute the specifier and no bindings. A type is erased at
 * runtime and cannot carry a value the suite could grade anything against, so requiring
 * a classification for one would be friction with nothing on the other side of it.
 *
 * `require("pkg")` CONTRIBUTES THE WILDCARD BINDING, WHICH IS THE FOURTH PASS ADVERSARY'S
 * FIRST ATTACK.
 *
 * Every regex here used to be anchored on the keywords `import` or `export`. `require` is
 * neither: it is an ordinary identifier applied to an ordinary call, and
 * `node:module`'s `createRequire` makes one available inside an ES module in one line. So
 * `const rdkit = require("@rdkit/rdkit")` produced no site at all, populating neither
 * `seenPackages` nor `byPackage`. That is a strictly worse blind spot than the barrel
 * export gap the pass before it closed, because that one at least recorded the specifier.
 *
 * It is recorded as the wildcard binding `"*"`, the same binding `import * as ns` and
 * `export * from` already use, and for the same reason: a require expression evaluates to
 * the module's whole namespace object, so every export of the other module is reachable
 * through it as a value. Recording it with no bindings would have re-created the exact
 * hole the barrel fix closed, since `censusOverHashedFiles` skips a site whose binding
 * list is empty.
 *
 * WHAT THIS FUNCTION DELIBERATELY STILL DOES NOT DO. It does not read a specifier that is
 * not a string literal, and it does not pretend to. Those sites are not silently dropped
 * either: `scanUnreadableImports` below finds them and every one of them is a hard finding.
 */
export function scanImports(source: string): readonly ImportSite[] {
  const text = blankOut(source, { strings: false });
  const sites: ImportSite[] = [];

  // import ... from "x" / export ... from "x". The clause cannot contain a quote or a
  // semicolon, which is what stops the lazy match from running across statements.
  const withClause = /\b(?:import|export)\s+([^;"'`]*?)from\s*["']([^"'`]+)["']/g;
  for (const match of text.matchAll(withClause)) {
    sites.push({
      specifier: match[2] as string,
      valueBindings: valueBindingsOf(match[1] as string),
    });
  }

  // import "x", the side effect form. This one really does bind nothing: it evaluates the
  // module for its effects and hands back no value at all.
  for (const match of text.matchAll(/\bimport\s*["']([^"'`]+)["']/g)) {
    sites.push({ specifier: match[1] as string, valueBindings: [] });
  }

  // Dynamic import("x"). It evaluates to the module's whole namespace object, so it is a
  // value pull and carries the wildcard binding, exactly as require() below does. It used
  // to be recorded with no bindings, which put it back in the hole the barrel export fix
  // closed: `censusOverHashedFiles` skips a site whose binding list is empty, so a
  // wholly undeclared package pulled in this way produced no undeclared-package finding.
  for (const match of text.matchAll(/\bimport\s*\(\s*["']([^"'`]+)["']/g)) {
    sites.push({ specifier: match[1] as string, valueBindings: ["*"] });
  }

  // require("x"), CommonJS interop. The leading class excludes `requireKeys(` and a
  // property access such as `harness.require(`, neither of which is the global function.
  for (const match of text.matchAll(/(^|[^\w$.])require\s*\(\s*["']([^"'`]+)["']/g)) {
    sites.push({ specifier: match[2] as string, valueBindings: ["*"] });
  }

  return sites;
}

/** One place a module was pulled in whose specifier this scanner could not read. */
export interface UnreadableImportSite {
  /** 1 based line number in the original source. */
  readonly line: number;
  /** The call as it appears, trimmed. Strings are blanked, so no content leaks. */
  readonly text: string;
  /** One line saying why it cannot be read. Rendered into the finding. */
  readonly why: string;
}

/**
 * Calls that pull in a module whose specifier is not a string literal.
 *
 * WHY THIS EXISTS RATHER THAN A WIDER REGEX, WHICH IS THE SECOND HALF OF THE FOURTH PASS
 * ADVERSARY'S FINDING.
 *
 * `import(someVariable)` and `require(someVariable)` cannot be read by any amount of
 * pattern matching, because the specifier is not in the text: it is whatever the variable
 * holds at run time, and the honest general answer needs an evaluator. The previous
 * behaviour was to match nothing and move on, which reads in a green run exactly like
 * "there is no import here".
 *
 * The precedent for the other choice is already in this file. `extractCompetingRoutes`
 * refuses a `competingRoutes` property it cannot parse instead of skipping it, and says
 * why: "the difference between 'there is no competing route data here' and 'I could not
 * read the competing route data here' is the difference between a gate and a decoration."
 * The same sentence applies here word for word. So an unreadable specifier is a hard
 * finding, and the remedy is in the finding: write the specifier as a literal.
 *
 * `createRequire` IS INCLUDED, AND IT IS THE ONE JUDGEMENT CALL HERE.
 *
 * The adversary's third specimen obtains a require through
 * `const req = createRequire(import.meta.url)` and then calls `req("pkg")`. No regex can
 * follow that, because the function is bound to an arbitrary local name. What CAN be seen
 * is the manufacture: `createRequire` is the only standard way to conjure a working
 * `require` inside an ES module, and this package has no legitimate use for one. So its
 * appearance is reported. That is deliberately a rule about a name rather than about a
 * shape, and it is stated here rather than hidden: it can be defeated by aliasing the
 * import, and closing that needs a real parser rather than a bigger regex.
 *
 * Read from source with STRINGS BLANKED as well as comments, unlike `scanImports`. A
 * specimen of this shape written inside a template literal, which is exactly how the
 * adversary's own test files are written so they do not count as real imports of
 * themselves, must not be reported as a real one.
 */
export function scanUnreadableImports(source: string): readonly UnreadableImportSite[] {
  const skeleton = blankOut(source, { strings: true });
  const found: UnreadableImportSite[] = [];

  // Whole text, not line by line. `\s` spans newlines, and a literal specifier is
  // routinely wrapped onto the following line by the formatter:
  //   const { x } = await import(
  //     "../src/thing.ts"
  //   );
  // A line based test declares that one unreadable, which is a false report on a literal
  // sitting in plain sight one line down.
  const lineOf = (offset: number): number =>
    skeleton.slice(0, offset).split("\n").length;
  const lineTextAt = (offset: number): string =>
    (skeleton.split("\n")[lineOf(offset) - 1] ?? "").trim();

  for (const match of skeleton.matchAll(/(^|[^\w$.])(import|require)\s*\(\s*/g)) {
    const end = (match.index ?? 0) + match[0].length;
    // A blanked string literal keeps its quotes, so "next character is a quote" is a
    // reliable test for a literal specifier even though its contents are gone.
    const next = skeleton[end];
    if (next === '"' || next === "'") continue;
    found.push({
      line: lineOf(match.index ?? 0),
      text: lineTextAt(match.index ?? 0),
      why:
        `${match[2] as string}() is called with something that is not a string literal, so ` +
        `the package it pulls in is not in the text and cannot be censused. Write the ` +
        `specifier as a literal`,
    });
  }

  // The identifier is assembled rather than written, for the same reason the adversary's
  // own test files assemble their keywords: this file is inside the scanned set, and a
  // literal occurrence here, even inside a regex, would report this scanner as the thing
  // it is looking for. Regex literals are not blanked by blankOut, only comments and
  // strings, so the assembly happens in a template literal where it is.
  const createRequirePattern = new RegExp(`(^|[^\\w$.])${"create"}${"Require"}\\b`, "g");
  for (const match of skeleton.matchAll(createRequirePattern)) {
    found.push({
      line: lineOf(match.index ?? 0),
      text: lineTextAt(match.index ?? 0),
      why:
        "createRequire manufactures a require bound to an arbitrary local name, and no " +
        "scan can follow the calls made through it. This package has no use for one",
    });
  }

  found.sort((left, right) => left.line - right.line);
  return found;
}

/**
 * Parse an import clause into the exported names it pulls in for their values.
 *
 * THE WILDCARD CASES, WHICH IS WHERE THE THIRD PASS ADVERSARY FOUND A HOLE.
 *
 * Three shapes carry a wildcard, and all three make every named export of the other module
 * reachable from this one as a value:
 *
 *     import * as ns from "pkg"     a namespace object bound locally
 *     export * as ns from "pkg"     the same object, re-exported
 *     export * from "pkg"           every named export re-exported one at a time
 *
 * The first two were recorded as the binding "*". The third was recorded as NOTHING,
 * because the only wildcard branch here required the literal keyword `as`, so the lone "*"
 * fell through to the plain identifier test and matched neither. The caller then skipped
 * the site entirely on `valueBindings.length === 0`, so a wholly undeclared external
 * package introduced by one bare `export *` produced no census finding at all: not
 * undeclared-package, not undeclared-binding, nothing.
 *
 * The fix is here rather than in `censusFindings`, and the reason is that this was a
 * SCANNER defect and not a census defect. `censusFindings` was asked the wrong question:
 * it was told the barrel imported no values, and it answered correctly for what it was
 * told. The adversary's own suggestion, walking `seenPackages` as well as `byPackage`,
 * would have made the census right about this one case by making it wrong about two
 * others. `seenPackages` deliberately holds every specifier seen AT ALL, type only and
 * side effect imports included, and the census's stated contract is about VALUES: a type
 * is erased at runtime and cannot carry data the suite grades against, which is why a type
 * only import contributes no bindings on purpose. Reporting `undeclared-package` off
 * `seenPackages` would turn `import type { Foo } from "pkg"` into a hard stop, and the
 * finding's own wording, "is imported for its values (...)", would be false with an empty
 * binding list inside the parentheses. `seenPackages` also already has a second job, as
 * the fallback that keeps a declared but type only package from reading as
 * declared-but-unused, and one set cannot mean "seen" in one rule and "imported for its
 * values" in another.
 *
 * So a bare `export *` is recorded as the wildcard binding "*", exactly as `import * as`
 * already was. The two forms then behave identically everywhere downstream, including the
 * per binding classification a `mixed` package requires, and nothing else in this file
 * changes. `export type * from "pkg"` stays type only and stays empty, because the clause
 * begins with `type` and is refused at the top of this function.
 */
function valueBindingsOf(rawClause: string): readonly string[] {
  const clause = rawClause.trim();
  if (/^type\b/.test(clause)) return [];

  const found: string[] = [];

  const braceStart = clause.indexOf("{");
  const braceEnd = clause.lastIndexOf("}");
  const head = braceStart === -1 ? clause : clause.slice(0, braceStart);
  const named = braceStart === -1 || braceEnd === -1 ? "" : clause.slice(braceStart + 1, braceEnd);

  // Default and namespace imports live before the brace.
  for (const piece of head.split(",")) {
    const item = piece.trim().replace(/,$/, "").trim();
    if (item === "") continue;
    // `* as ns`, and the bare `*` of a wildcard re-export. Both make every named export of
    // the other module reachable through this one, so both are the same wildcard binding.
    if (item === "*" || /^\*\s+as\s+/.test(item)) {
      found.push("*");
      continue;
    }
    const identifier = /^[A-Za-z_$][\w$]*$/.exec(item);
    if (identifier !== null) found.push("default");
  }

  for (const piece of named.split(",")) {
    const item = piece.trim();
    if (item === "") continue;
    if (/^type\b/.test(item)) continue;
    const name = /^([A-Za-z_$][\w$]*)/.exec(item);
    if (name !== null) found.push(name[1] as string);
  }

  return found;
}

function isExternalSpecifier(specifier: string): boolean {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return false;
  if (specifier.startsWith("node:")) return false;
  return true;
}

/** Package name for a specifier, so "vitest/config" and "vitest" are one entry. */
function packageOf(specifier: string): string {
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) return parts.slice(0, 2).join("/");
  return parts[0] as string;
}

export interface ImportCensus {
  /** package -> binding -> the package relative files that import it. */
  readonly byPackage: Map<string, Map<string, Set<string>>>;
  /** Packages seen at all, including type only and side effect imports. */
  readonly seenPackages: Set<string>;
  /**
   * Module pulls whose specifier the scanner could not read, as "file:line why".
   *
   * Never empty in silence: every entry is a hard finding in `censusFindings`. Optional
   * only so that a caller constructing a census by hand, which the tests do, does not have
   * to say "and there were none" to mean the ordinary case.
   */
  readonly unreadable?: readonly string[];
}

/**
 * The import census over exactly the files the lock hashes.
 *
 * Deriving the scanned set from the hashed set rather than walking again is the point:
 * every file that can introduce an import is a file whose bytes are already in the lock,
 * so there is no third place an import could hide.
 */
async function censusOverHashedFiles(
  files: Readonly<Record<string, string>>,
): Promise<ImportCensus> {
  const byPackage = new Map<string, Map<string, Set<string>>>();
  const seenPackages = new Set<string>();
  const unreadable: string[] = [];

  for (const relative of Object.keys(files)) {
    if (!relative.endsWith(".ts") && !relative.endsWith(".tsx")) continue;
    const value = files[relative] ?? "";
    if (value.startsWith("symlink:")) continue;
    const source = await fs.readFile(path.join(PACKAGE_ROOT, ...relative.split("/")), "utf8");

    for (const site of scanUnreadableImports(source)) {
      unreadable.push(`${relative}:${site.line} ${site.why}. Line reads: ${site.text}`);
    }

    for (const site of scanImports(source)) {
      if (!isExternalSpecifier(site.specifier)) continue;
      const pkg = packageOf(site.specifier);
      seenPackages.add(pkg);
      if (site.valueBindings.length === 0) continue;
      const bindings = byPackage.get(pkg) ?? new Map<string, Set<string>>();
      byPackage.set(pkg, bindings);
      for (const binding of site.valueBindings) {
        const where = bindings.get(binding) ?? new Set<string>();
        bindings.set(binding, where);
        where.add(relative);
      }
    }
  }

  return { byPackage, seenPackages, unreadable: unreadable.sort() };
}

/* ------------------------------------------------------------------------------------
 * Projection: cause copy competing routes.
 * ---------------------------------------------------------------------------------- */

export interface ProjectionResult {
  /** cause id -> comma joined route ids, sorted by cause id. */
  readonly entries: Readonly<Record<string, string>>;
  /** Repo relative paths the data was read from, sorted. */
  readonly sourceFiles: readonly string[];
  readonly findings: readonly DeclarationFinding[];
}

async function listTypeScriptFiles(absoluteDir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const found: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) found.push(...(await listTypeScriptFiles(absolute)));
    else if (entry.isFile() && entry.name.endsWith(".ts")) found.push(absolute);
  }
  return found.sort();
}

/**
 * Read `competingRoutes` out of the copy source as text.
 *
 * The shape it accepts is the shape the repository writes:
 *
 *     someCauseId: {
 *       ...
 *       competingRoutes: ["carbocation_rearrangement"],
 *     },
 *
 * Anything else is a finding, never a silent skip. That direction matters. If somebody
 * restructures the property into a getter, a spread, a computed key, or a multi line
 * array, this extractor stops recognising it, and the difference between "there is no
 * competing route data here" and "I could not read the competing route data here" is the
 * difference between a gate and a decoration. So a second pass counts every occurrence
 * of the identifier with string contents blanked, and every occurrence that the first
 * pass did not turn into an entry is reported.
 */
async function extractCompetingRoutes(
  projection: DeclaredProjection,
): Promise<ProjectionResult> {
  const findings: DeclarationFinding[] = [];
  const entries: Record<string, string> = {};
  const dir = fromRepoRelative(projection.extractFromDir);
  const absolutes = await listTypeScriptFiles(dir);

  if (absolutes.length === 0) {
    findings.push({
      kind: "projection-unreadable",
      detail:
        `projection ${projection.name}: ${projection.extractFromDir} holds no .ts files. ` +
        `An empty extraction must not read as "no oracle data".`,
    });
  }

  const owner = new Map<string, string>();

  for (const absolute of absolutes) {
    const repoRelative = toRepoRelative(absolute);
    const raw = (await fs.readFile(absolute, "utf8")).replace(/\r\n/g, "\n");
    const code = blankOut(raw, { strings: false });
    const skeleton = blankOut(raw, { strings: true });

    const codeLines = code.split("\n");
    const skeletonLines = skeleton.split("\n");

    let currentKey: string | null = null;
    let parsedOnLine = new Set<number>();

    for (const [index, line] of codeLines.entries()) {
      const opener = /^\s*([A-Za-z_$][\w$]*)\s*:\s*\{\s*$/.exec(line);
      if (opener !== null) {
        currentKey = opener[1] as string;
        continue;
      }
      const routes = /^\s*competingRoutes\s*:\s*\[([^\]]*)\]\s*,?\s*$/.exec(line);
      if (routes === null) continue;
      if (currentKey === null) {
        findings.push({
          kind: "projection-unreadable",
          detail:
            `projection ${projection.name}: ${repoRelative}:${index + 1} carries competingRoutes ` +
            `with no enclosing cause key that this extractor could identify`,
        });
        continue;
      }
      const list = [...(routes[1] as string).matchAll(/["']([^"']+)["']/g)].map(
        (match) => match[1] as string,
      );
      const previousOwner = owner.get(currentKey);
      if (previousOwner !== undefined) {
        findings.push({
          kind: "projection-unreadable",
          detail:
            `projection ${projection.name}: cause "${currentKey}" carries competingRoutes in both ` +
            `${previousOwner} and ${repoRelative}. Which one the registry keeps depends on spread ` +
            `order, so the extracted answer key would be a guess`,
        });
        continue;
      }
      owner.set(currentKey, repoRelative);
      entries[currentKey] = list.join(",");
      parsedOnLine.add(index);
    }

    // The census pass. String contents are blanked here, so a mention of the identifier
    // inside authored prose cannot trigger it and an unquoted property always does.
    for (const [index, line] of skeletonLines.entries()) {
      if (!/(^|[^\w$.])competingRoutes\s*:/.test(line)) continue;
      if (parsedOnLine.has(index)) continue;
      findings.push({
        kind: "projection-unreadable",
        detail:
          `projection ${projection.name}: ${repoRelative}:${index + 1} carries a competingRoutes ` +
          `property this extractor cannot read. It is not skipped and it is not guessed at`,
      });
    }
    parsedOnLine = new Set<number>();
  }

  const sorted: Record<string, string> = {};
  for (const key of Object.keys(entries).sort()) sorted[key] = entries[key] as string;

  return {
    entries: sorted,
    sourceFiles: absolutes.map((absolute) => toRepoRelative(absolute)),
    findings,
  };
}

/* ------------------------------------------------------------------------------------
 * Building and checking the external data section.
 * ---------------------------------------------------------------------------------- */

export interface ExternalSnapshot {
  readonly section: ExternalDataSection;
  readonly findings: readonly DeclarationFinding[];
}

/**
 * Completeness of the declaration against the real import graph.
 *
 * Every finding here is a hard stop. None of them is a warning, because every one of
 * them means the same thing: this suite reads something from outside itself that nobody
 * wrote down, or wrote down and then stopped reading.
 */
export function censusFindings(
  census: ImportCensus,
  declaration: readonly DeclaredExternalPackage[] = EXTERNAL_DATA,
): DeclarationFinding[] {
  const findings: DeclarationFinding[] = [];
  const declaredBySpecifier = new Map(declaration.map((entry) => [entry.specifier, entry]));

  // A module pull the scanner could not read is reported before anything else is decided.
  // It is not a missing declaration, it is a census that does not know whether one is
  // missing, and those are different sentences. Same reasoning as projection-unreadable.
  for (const site of census.unreadable ?? []) {
    findings.push({
      kind: "unreadable-import",
      detail:
        `${site}. The census cannot say whether this package is declared, because it cannot ` +
        `say which package it is`,
    });
  }

  for (const [pkg, bindings] of census.byPackage) {
    const declared = declaredBySpecifier.get(pkg);
    if (declared === undefined) {
      const names = [...bindings.keys()].sort().join(", ");
      const where = [...new Set([...bindings.values()].flatMap((set) => [...set]))].sort();
      findings.push({
        kind: "undeclared-package",
        detail:
          `"${pkg}" is imported for its values (${names}) by ${where.join(", ")} and is not in ` +
          `EXTERNAL_DATA. Classify it before the suite reports anything it may have decided`,
      });
      continue;
    }
    if (declared.role !== "mixed") continue;

    for (const [binding, where] of bindings) {
      if (declared.bindings?.[binding] !== undefined) continue;
      findings.push({
        kind: "undeclared-binding",
        detail:
          `"${binding}" is imported from ${pkg} by ${[...where].sort().join(", ")} and is not ` +
          `classified in EXTERNAL_DATA. ${pkg} plays more than one role here, so every binding ` +
          `has to say which one it is`,
      });
    }
  }

  for (const declared of declaration) {
    const imported = census.byPackage.get(declared.specifier);
    if (imported === undefined && !census.seenPackages.has(declared.specifier)) {
      findings.push({
        kind: "declared-but-unused",
        detail:
          `EXTERNAL_DATA declares "${declared.specifier}" and nothing in this package imports it. ` +
          `A census that only ever grows stops describing anything`,
      });
      continue;
    }

    if (declared.role !== "mixed") {
      if (declared.bindings !== undefined || declared.projections !== undefined) {
        findings.push({
          kind: "declaration-inconsistent",
          detail:
            `"${declared.specifier}" is declared ${declared.role} at package level and also ` +
            `carries bindings or projections. One or the other`,
        });
      }
      continue;
    }

    if (declared.bindings === undefined) {
      findings.push({
        kind: "declaration-inconsistent",
        detail: `"${declared.specifier}" is declared mixed and classifies no bindings`,
      });
      continue;
    }

    const covered = new Set(
      (declared.projections ?? []).flatMap((projection) => projection.covers),
    );
    for (const [binding, entry] of Object.entries(declared.bindings)) {
      if (imported?.has(binding) !== true) {
        findings.push({
          kind: "declared-but-unused",
          detail:
            `EXTERNAL_DATA classifies "${binding}" from ${declared.specifier} and nothing in this ` +
            `package imports it`,
        });
      }
      if (entry.role === "oracle-data" && !covered.has(binding)) {
        findings.push({
          kind: "unfingerprinted-oracle",
          detail:
            `"${binding}" from ${declared.specifier} is declared oracle-data and no projection ` +
            `covers it, so the answer key it serves would not be in the lock`,
        });
      }
    }

    for (const projection of declared.projections ?? []) {
      for (const binding of projection.covers) {
        if (declared.bindings[binding] === undefined) {
          findings.push({
            kind: "declaration-inconsistent",
            detail:
              `projection ${projection.name} claims to cover "${binding}", which ` +
              `${declared.specifier} does not classify`,
          });
        }
      }
    }
  }

  findings.sort((left, right) => left.detail.localeCompare(right.detail));
  return findings;
}

/**
 * Snapshot the declared external data set.
 *
 * Everything here is read from the committed source text on disk. Nothing is imported
 * and nothing is executed, so a package cannot be the witness to its own contents.
 */
async function computeExternalSnapshot(
  files: Readonly<Record<string, string>>,
): Promise<ExternalSnapshot> {
  const census = await censusOverHashedFiles(files);
  const findings: DeclarationFinding[] = censusFindings(census);
  const entries = new Map<string, string>();

  for (const declared of EXTERNAL_DATA) {
    entries.set(`${declared.specifier} package role`, declared.role);

    for (const [binding, entry] of Object.entries(declared.bindings ?? {})) {
      entries.set(`${declared.specifier} binding ${binding}`, entry.role);
    }

    for (const projection of declared.projections ?? []) {
      for (const repoRelative of projection.hashFiles) {
        let hash: string;
        try {
          const text = (await fs.readFile(fromRepoRelative(repoRelative), "utf8")).replace(
            /\r\n/g,
            "\n",
          );
          hash = hashOf(`${repoRelative}\0${text}`);
        } catch (error) {
          hash = "absent";
          findings.push({
            kind: "projection-unreadable",
            detail:
              `projection ${projection.name}: declared file ${repoRelative} could not be read ` +
              `(${String((error as Error).message)}). The code that serves the answer key is part ` +
              `of the claim`,
          });
        }
        entries.set(`${declared.specifier} code ${repoRelative}`, hash);
      }

      const result = await extractCompetingRoutes(projection);
      findings.push(...result.findings);
      for (const source of result.sourceFiles) {
        entries.set(`${declared.specifier} source ${source}`, "read");
      }
      for (const [cause, routes] of Object.entries(result.entries)) {
        entries.set(`${declared.specifier} projection ${projection.name} ${cause}`, routes);
      }
    }
  }

  const sorted: Record<string, string> = {};
  for (const key of [...entries.keys()].sort()) sorted[key] = entries.get(key) as string;

  return {
    section: {
      declaredPackages: EXTERNAL_DATA.map((entry) => entry.specifier).sort(),
      entryCount: Object.keys(sorted).length,
      externalHash: hashRecord(sorted),
      entries: sorted,
    },
    findings,
  };
}

/* ------------------------------------------------------------------------------------
 * Public surface.
 * ---------------------------------------------------------------------------------- */

export interface CurrentState {
  readonly lock: LockFile;
  /** Non empty means the declaration does not describe the code. A hard stop. */
  readonly findings: readonly DeclarationFinding[];
}

/** Hash the package and its declared external data as they currently sit. Never writes. */
export async function computeCurrentLock(): Promise<CurrentState> {
  const collected = new Map<string, string>();
  await walk(PACKAGE_ROOT, collected);
  const files = sortedRecord(collected);
  const external = await computeExternalSnapshot(files);

  const suiteHash = hashOf(
    `${hashRecord(files)}\0${external.section.externalHash}\0v${LOCK_SCHEMA_VERSION}`,
  );

  return {
    lock: {
      schemaVersion: LOCK_SCHEMA_VERSION,
      algorithm: HASH_ALGORITHM,
      hashEncoding: HASH_ENCODING,
      root: "packages/validators",
      excludedDirectoryNames: [...EXCLUDED_DIRECTORY_NAMES],
      excludedFileNames: [...EXCLUDED_FILE_NAMES],
      fileCount: Object.keys(files).length,
      suiteHash,
      files,
      externalData: external.section,
    },
    findings: external.findings,
  };
}

type ReadLockResult =
  | { readonly kind: "ok"; readonly lock: LockFile }
  | { readonly kind: "missing" }
  | { readonly kind: "unreadable"; readonly detail: string }
  | { readonly kind: "schema-mismatch"; readonly detail: string };

async function readLock(): Promise<ReadLockResult> {
  let raw: string;
  try {
    raw = await fs.readFile(LOCK_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { kind: "missing" };
    return { kind: "unreadable", detail: String(error) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { kind: "unreadable", detail: `not valid JSON: ${String(error)}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { kind: "unreadable", detail: "lock is not a JSON object" };
  }

  const candidate = parsed as Partial<LockFile>;

  if (candidate.schemaVersion !== LOCK_SCHEMA_VERSION) {
    return {
      kind: "schema-mismatch",
      detail:
        `lock schemaVersion is ${String(candidate.schemaVersion)}, ` +
        `this build understands ${LOCK_SCHEMA_VERSION}`,
    };
  }
  if (candidate.algorithm !== HASH_ALGORITHM || candidate.hashEncoding !== HASH_ENCODING) {
    return {
      kind: "schema-mismatch",
      detail:
        `lock records ${String(candidate.algorithm)}/${String(candidate.hashEncoding)}, ` +
        `this build computes ${HASH_ALGORITHM}/${HASH_ENCODING}`,
    };
  }
  if (typeof candidate.files !== "object" || candidate.files === null) {
    return { kind: "unreadable", detail: "lock has no files map" };
  }
  const external = candidate.externalData;
  if (
    typeof external !== "object" ||
    external === null ||
    typeof external.entries !== "object" ||
    external.entries === null
  ) {
    return {
      kind: "unreadable",
      detail:
        "lock has no externalData.entries map. A lock that says nothing about the external " +
        "data set cannot be compared against one",
    };
  }

  return { kind: "ok", lock: candidate as LockFile };
}

function diffRecords(
  current: Readonly<Record<string, string>>,
  stored: Readonly<Record<string, string>>,
  render: (key: string, currentValue: string, storedValue: string) => string,
  renderAdded: (key: string, value: string) => string,
  renderRemoved: (key: string, value: string) => string,
): { changed: string[]; added: string[]; removed: string[] } {
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [key, value] of Object.entries(current)) {
    const expected = stored[key];
    if (expected === undefined) added.push(renderAdded(key, value));
    else if (expected !== value) changed.push(render(key, value, expected));
  }
  for (const [key, value] of Object.entries(stored)) {
    if (current[key] === undefined) removed.push(renderRemoved(key, value));
  }

  changed.sort();
  added.sort();
  removed.sort();
  return { changed, added, removed };
}

/**
 * Compare disk against the committed lock. Read only. Never regenerates, never repairs.
 *
 * The declaration census runs FIRST and short circuits everything else. An undeclared
 * external data dependency is not a mismatch to report alongside a file list, it is a
 * statement that the lock cannot describe what this suite reads, and a comparison that
 * came out clean under those conditions would be the exact false confirmation the lock
 * exists to prevent.
 */
export async function checkIntegrity(): Promise<IntegrityReport> {
  const current = await computeCurrentLock();
  const stored = await readLock();

  const base = {
    changed: [] as readonly string[],
    added: [] as readonly string[],
    removed: [] as readonly string[],
    externalChanged: [] as readonly string[],
    externalAdded: [] as readonly string[],
    externalRemoved: [] as readonly string[],
    declarationFindings: [] as readonly DeclarationFinding[],
    fileCountOnDisk: current.lock.fileCount,
    fileCountInLock: 0,
    externalEntryCountOnDisk: current.lock.externalData.entryCount,
    suiteHashOnDisk: current.lock.suiteHash,
    suiteHashInLock: null,
  };

  if (current.findings.length > 0) {
    return {
      ...base,
      status: "external-data-undeclared",
      declarationFindings: current.findings,
      detail: null,
    };
  }

  if (stored.kind === "missing") {
    return { ...base, status: "lock-missing", detail: null };
  }
  if (stored.kind === "unreadable") {
    return { ...base, status: "lock-unreadable", detail: stored.detail };
  }
  if (stored.kind === "schema-mismatch") {
    return { ...base, status: "schema-mismatch", detail: stored.detail };
  }

  const fileDiff = diffRecords(
    current.lock.files,
    stored.lock.files,
    (key) => key,
    (key) => key,
    (key) => key,
  );

  const externalDiff = diffRecords(
    current.lock.externalData.entries,
    stored.lock.externalData.entries ?? {},
    (key, now, before) => `${key}: locked "${before}", on disk "${now}"`,
    (key, now) => `${key}: "${now}"`,
    (key, before) => `${key}: was "${before}"`,
  );

  const clean =
    fileDiff.changed.length === 0 &&
    fileDiff.added.length === 0 &&
    fileDiff.removed.length === 0 &&
    externalDiff.changed.length === 0 &&
    externalDiff.added.length === 0 &&
    externalDiff.removed.length === 0;

  return {
    status: clean ? "unmodified" : "modified",
    changed: fileDiff.changed,
    added: fileDiff.added,
    removed: fileDiff.removed,
    externalChanged: externalDiff.changed,
    externalAdded: externalDiff.added,
    externalRemoved: externalDiff.removed,
    declarationFindings: [],
    fileCountOnDisk: current.lock.fileCount,
    fileCountInLock: Object.keys(stored.lock.files).length,
    externalEntryCountOnDisk: current.lock.externalData.entryCount,
    suiteHashOnDisk: current.lock.suiteHash,
    suiteHashInLock: stored.lock.suiteHash ?? null,
    detail: null,
  };
}

export type RegenerateResult =
  | { readonly kind: "written"; readonly lock: LockFile }
  | { readonly kind: "refused"; readonly findings: readonly DeclarationFinding[] };

/**
 * Write a fresh lock. The only writer in this package.
 *
 * Called from exactly one place: the `lock regen` subcommand. Not from `lock check`,
 * not from the validator CLI, not as a repair step on mismatch. CLAUDE.md requires the
 * regeneration to be a deliberate act, committed on its own.
 *
 * It refuses when the external data declaration does not describe the code. Otherwise
 * regen would be the one command that turns "this suite reads something nobody declared"
 * into a committed, blessed fact, which would make the census optional in practice while
 * looking mandatory in source.
 */
export async function regenerateLock(): Promise<RegenerateResult> {
  const current = await computeCurrentLock();
  if (current.findings.length > 0) {
    return { kind: "refused", findings: current.findings };
  }
  await fs.writeFile(LOCK_PATH, `${JSON.stringify(current.lock, null, 2)}\n`, "utf8");
  return { kind: "written", lock: current.lock };
}

/** Human readable lines for a modified report. Used by both CLIs so wording matches. */
export function formatIntegrityFailure(report: IntegrityReport): string[] {
  const lines: string[] = [];

  switch (report.status) {
    case "lock-missing":
      lines.push("SUITE INTEGRITY: MODIFIED");
      lines.push("  validators.lock.json is missing.");
      lines.push(
        "  Nothing can be verified against an absent lock, so no results are reported.",
      );
      break;
    case "lock-unreadable":
      lines.push("SUITE INTEGRITY: MODIFIED");
      lines.push(`  validators.lock.json could not be read: ${report.detail ?? "unknown"}`);
      break;
    case "schema-mismatch":
      lines.push("SUITE INTEGRITY: MODIFIED");
      lines.push(`  lock format mismatch: ${report.detail ?? "unknown"}`);
      lines.push("  Refusing to compare. A mis-compare reads as clean and is worse than a stop.");
      break;
    case "external-data-undeclared":
      lines.push("SUITE INTEGRITY: EXTERNAL DATA NOT DECLARED");
      for (const finding of report.declarationFindings) {
        lines.push(`  ${finding.kind}  ${finding.detail}`);
      }
      lines.push("");
      lines.push(
        "  A check that grades a fixture against data from outside packages/validators is",
      );
      lines.push(
        "  making a joint claim over a fixture and that data. Only the fixture half is under",
      );
      lines.push(
        "  the file hash, so the other half is declared in EXTERNAL_DATA in src/integrity.ts,",
      );
      lines.push(
        "  where an oracle carries a projection and everything else carries a written reason.",
      );
      break;
    case "modified":
      lines.push("SUITE INTEGRITY: MODIFIED");
      for (const file of report.changed) lines.push(`  changed  ${file}`);
      for (const file of report.added) lines.push(`  added    ${file}`);
      for (const file of report.removed) lines.push(`  removed  ${file}`);
      lines.push(
        `  ${report.changed.length} changed, ${report.added.length} added, ` +
          `${report.removed.length} removed`,
      );
      if (
        report.externalChanged.length > 0 ||
        report.externalAdded.length > 0 ||
        report.externalRemoved.length > 0
      ) {
        lines.push("");
        lines.push("  EXTERNAL DATA, the answer key this suite grades against:");
        for (const entry of report.externalChanged) lines.push(`  changed  ${entry}`);
        for (const entry of report.externalAdded) lines.push(`  added    ${entry}`);
        for (const entry of report.externalRemoved) lines.push(`  removed  ${entry}`);
        lines.push(
          `  ${report.externalChanged.length} changed, ${report.externalAdded.length} added, ` +
            `${report.externalRemoved.length} removed`,
        );
        lines.push(
          "  These live outside packages/validators. A fixture the suite rejects today can be",
        );
        lines.push(
          "  made to pass by editing one of them, which is why they are in the lock.",
        );
      }
      break;
    case "unmodified":
      return [];
  }

  lines.push("");
  lines.push("Checks were not run and no results are reported.");
  lines.push("A suite edited by the agent under test is not evidence.");
  lines.push("");
  if (report.status === "external-data-undeclared") {
    lines.push("Declare it in EXTERNAL_DATA, then accept the declaration deliberately:");
  } else {
    lines.push("To accept these changes deliberately:");
  }
  lines.push("  npm run lock:regen -w packages/validators");
  lines.push("Commit the regenerated lock on its own, never in the same commit as a fix");
  lines.push("to something the suite was failing.");
  return lines;
}
