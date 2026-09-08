import fs from "node:fs/promises";
import path from "node:path";

/**
 * What to do when the thing a gate measures does not exist yet.
 *
 * apps/web is a Phase 3 and Phase 4 deliverable. Two of the four budget gates in this
 * directory measure it, and they are being written in Phase 0. That is not an accident
 * of ordering to be worked around; BUILD-PROMPT.md puts the budget gates in Phase 0 on
 * purpose, so the ceiling exists before the thing that could exceed it.
 *
 * There are three possible behaviours and only one of them is defensible.
 *
 *   Report pass.        Forbidden, and it is the single most dangerous option in this
 *                       repository. A green gate whose subject is missing is
 *                       indistinguishable in the report from a green gate that measured
 *                       something, and the day apps/web appears it keeps saying pass. If
 *                       it ever prints "400 KB ceiling: pass" while nothing was weighed,
 *                       every later reading of that line is a lie.
 *
 *   Report hard fail.   Superficially the strict answer, and wrong, for a reason worth
 *                       stating. Phase 0's exit condition is a suite that exits zero on
 *                       known good fixtures. A gate that cannot pass until Phase 3 makes
 *                       Phase 0 unreachable, and the suite then sits red for three
 *                       phases. A permanently red suite is a smoke alarm that has been
 *                       beeping for a month: people stop reading it, and the first real
 *                       failure is invisible inside the noise. Worse, it creates exactly
 *                       the pressure CLAUDE.md's first non-negotiable forbids, because
 *                       the cheapest way to make Phase 0 green becomes deleting or
 *                       skipping this check.
 *
 *   Report notMeasurable, and arm automatically. What this module does.
 *
 * The Check interface already has the channel for it, and check.ts says what it is for:
 * "A property this harness cannot measure, named rather than estimated". A NotMeasurable
 * entry prints on every run, including passing ones, under NOT MEASURABLE HERE. It is
 * not silent and it is not green. No BudgetResult row is emitted for an unmeasured
 * budget, because a BudgetResult carries a pass boolean and there is no honest value to
 * put in it.
 *
 * The part that makes this safe rather than merely comfortable is that the state is
 * derived from the file system on every run, not from a flag someone has to remember to
 * flip:
 *
 *   absent   apps/web/package.json does not exist. The app has not been created.
 *            notMeasurable. This is the expected Phase 0 state.
 *   unbuilt  apps/web/package.json exists, build output does not. HARD FAIL. Once the
 *            subject exists the excuse expires, and "I could not measure it" becomes a
 *            broken harness or an unbuilt app rather than a phase artifact. This is the
 *            transition that closes the vacuous pass: it arms itself the moment the app
 *            is scaffolded, with no human step.
 *   built    Measure for real.
 *
 * The self test in checks/budgets/budget-gate-self-test.ts drives all three states
 * against synthetic directories, so the arming behaviour is verified on every run rather
 * than asserted in this comment.
 */

export type SubjectState = "absent" | "unbuilt" | "built";

export interface SubjectClassification {
  readonly state: SubjectState;
  /** Absolute path to the app root that was looked for. */
  readonly appRoot: string;
  /** Absolute path to the build output directory, whether or not it exists. */
  readonly distDir: string;
  /** Present only when state is "built". Absolute path to the built HTML entry. */
  readonly htmlEntry: string | null;
  /** One line naming exactly what was and was not found on disk. */
  readonly evidence: string;
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Classify a web app subject.
 *
 * The manifest is the arming signal rather than the directory, because an empty apps/web
 * directory is what a stray mkdir or an editor leaves behind, and that must not arm the
 * gate. A package.json means somebody created an application.
 */
export async function classifyWebAppSubject(appRoot: string): Promise<SubjectClassification> {
  const manifest = path.join(appRoot, "package.json");
  const distDir = path.join(appRoot, "dist");
  const htmlEntry = path.join(distDir, "index.html");

  if (!(await exists(manifest))) {
    return {
      state: "absent",
      appRoot,
      distDir,
      htmlEntry: null,
      evidence: `${manifest} does not exist, so no application has been created here`,
    };
  }

  if (!(await exists(htmlEntry))) {
    return {
      state: "unbuilt",
      appRoot,
      distDir,
      htmlEntry: null,
      evidence:
        `${manifest} exists but ${htmlEntry} does not. The application exists and its ` +
        `build output does not.`,
    };
  }

  return {
    state: "built",
    appRoot,
    distDir,
    htmlEntry,
    evidence: `${htmlEntry} exists`,
  };
}

/**
 * The contract apps/web must publish for the payload and Ketcher isolation gates.
 *
 * Written down here in Phase 0 rather than guessed at in Phase 4. Neither of those two
 * gates can be measured from a dist/ directory alone, because "the game route's initial
 * payload" is a statement about which emitted chunks the game route loads before any
 * dynamic import resolves, and only the application knows which chunk that is. Guessing
 * by filename would produce a number, and a number produced by guessing is exactly what
 * CLAUDE.md forbids.
 *
 * So: apps/web writes this file as part of its build, and the gates read it. If the file
 * is missing once apps/web is built, the gates fail and name this contract. They do not
 * fall back to a heuristic.
 *
 * Shape, at apps/web/dist/budget-subjects.json:
 *
 *   {
 *     "gameRouteEntry": "assets/game-a1b2c3.js",
 *     "lazyChunks": ["assets/ketcher-d4e5f6.js"],
 *     "additionalInitialAssets": ["assets/game-a1b2c3.css"]
 *   }
 *
 * gameRouteEntry is the entry chunk the game route loads synchronously, relative to
 * dist/. lazyChunks are chunks reachable only through a dynamic import, listed so the
 * report can say which heavy things were correctly kept out rather than only which were
 * not. additionalInitialAssets is optional and covers everything that loads with the
 * route but is not reachable through a JavaScript import: stylesheets, preloaded fonts.
 * Vite emits CSS as a <link> tag, so no import graph walk can find it, and a payload
 * number that silently omitted the stylesheet would understate the download. When the
 * field is absent the gates say so under NOT MEASURABLE rather than assuming zero.
 */
export const BUDGET_SUBJECTS_MANIFEST = "dist/budget-subjects.json";

export interface BudgetSubjectsManifest {
  readonly gameRouteEntry: string;
  readonly lazyChunks: readonly string[];
  readonly additionalInitialAssets?: readonly string[];
}

export type ManifestRead =
  | { readonly kind: "ok"; readonly manifest: BudgetSubjectsManifest }
  | { readonly kind: "missing" }
  | { readonly kind: "malformed"; readonly detail: string };

export async function readBudgetSubjectsManifest(appRoot: string): Promise<ManifestRead> {
  const target = path.join(appRoot, ...BUDGET_SUBJECTS_MANIFEST.split("/"));
  let raw: string;
  try {
    raw = await fs.readFile(target, "utf8");
  } catch {
    return { kind: "missing" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { kind: "malformed", detail: `not valid JSON: ${String(error)}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { kind: "malformed", detail: "not a JSON object" };
  }
  const candidate = parsed as Partial<BudgetSubjectsManifest>;
  if (typeof candidate.gameRouteEntry !== "string" || candidate.gameRouteEntry === "") {
    return { kind: "malformed", detail: "gameRouteEntry is missing or not a non-empty string" };
  }
  if (!Array.isArray(candidate.lazyChunks)) {
    return { kind: "malformed", detail: "lazyChunks is missing or not an array" };
  }

  const assets = candidate.additionalInitialAssets;
  const base: BudgetSubjectsManifest = {
    gameRouteEntry: candidate.gameRouteEntry,
    lazyChunks: candidate.lazyChunks.filter((entry): entry is string => typeof entry === "string"),
  };

  return {
    kind: "ok",
    manifest: Array.isArray(assets)
      ? {
          ...base,
          additionalInitialAssets: assets.filter(
            (entry): entry is string => typeof entry === "string",
          ),
        }
      : base,
  };
}
