/**
 * The Tier 1 copy registry, assembled from the eight category files.
 *
 * Two independent guarantees that every named cause has copy, on purpose,
 * because they fail at different moments.
 *
 * The first is a compile error. `CAUSE_COPY` is annotated
 * `Readonly<Record<CauseId, CauseCopy>>` and built by spreading the eight
 * category objects, each of which is keyed by an explicit subset of `CauseId`.
 * TypeScript works out the key set of the spread, so a cause added to chem-core
 * and not authored here stops the build, and a key here that is not a `CauseId`
 * stops the build too. Nobody has to remember to run anything.
 *
 * The second is `copyCoverage()`, which compares the keys against
 * `allCauseIds()` at runtime. It exists because the feedback axis in CLAUDE.md
 * is measured by a reported number, and a number a validator prints is worth
 * more than a build that merely did not fail. It is also what catches the case
 * where somebody silences the compiler with a cast.
 *
 * There is no fallback entry and no default string. A missing cause has to be
 * loud, because copy that quietly degrades to "something went wrong" is exactly
 * the yellow triangle this package exists to replace.
 */

import type { CauseId, CauseCategory, CauseSeverity, MechanismRoute } from "@blueberry/chem-core";
import { allCauseIds, causeDefinition } from "@blueberry/chem-core";

import type { CauseCopy, CauseCopyEntry, CopyCoverage } from "./types.ts";
import { SUCCESS_COPY } from "./copy/success.ts";
import { VALENCE_COPY } from "./copy/valence.ts";
import { CONSERVATION_COPY } from "./copy/conservation.ts";
import { ELECTRON_FLOW_COPY } from "./copy/electronFlow.ts";
import { STEREOCHEMISTRY_COPY } from "./copy/stereochemistry.ts";
import { STERICS_COPY } from "./copy/sterics.ts";
import { REACTIVITY_COPY } from "./copy/reactivity.ts";
import { ROUTE_COPY } from "./copy/route.ts";

export const CAUSE_COPY: Readonly<Record<CauseId, CauseCopy>> = Object.freeze({
  ...SUCCESS_COPY,
  ...VALENCE_COPY,
  ...CONSERVATION_COPY,
  ...ELECTRON_FLOW_COPY,
  ...STEREOCHEMISTRY_COPY,
  ...STERICS_COPY,
  ...REACTIVITY_COPY,
  ...ROUTE_COPY,
});

/** The authored copy for one cause. Throws rather than returning a placeholder. */
export function causeCopy(id: CauseId): CauseCopy {
  const copy = CAUSE_COPY[id];
  if (copy === undefined) {
    throw new Error(`No Tier 1 copy authored for cause id: ${id}`);
  }
  return copy;
}

/** The copy for one cause with its id attached, for reports and renderers. */
export function causeCopyEntry(id: CauseId): CauseCopyEntry {
  return { id, ...causeCopy(id) };
}

/** Every cause that has authored copy, in registry order. */
export function copiedCauseIds(): readonly CauseId[] {
  return Object.freeze(Object.keys(CAUSE_COPY) as CauseId[]);
}

/** How many causes have authored copy. */
export function copyCount(): number {
  return copiedCauseIds().length;
}

/**
 * Coverage of the chem-core cause registry by authored copy.
 *
 * `defined` comes from chem-core, never from a list kept here, so this stays
 * honest when the engine grows. A validator fails when `missing` is non empty.
 */
export function copyCoverage(): CopyCoverage {
  const defined = allCauseIds();
  const covered = new Set<string>(copiedCauseIds());
  const missing = defined.filter((id) => !covered.has(id));
  const definedSet = new Set<string>(defined);
  const extra = copiedCauseIds().filter((id) => !definedSet.has(id));
  return Object.freeze({
    defined: defined.length,
    covered: defined.length - missing.length,
    missing: Object.freeze(missing),
    extra: Object.freeze(extra as string[]),
  });
}

/** Whether every cause chem-core defines has authored copy. */
export function copyIsComplete(): boolean {
  const coverage = copyCoverage();
  return coverage.missing.length === 0 && coverage.extra.length === 0;
}

/** Copy entries for one category, in registry order. Used by the review renderer. */
export function copyEntriesByCategory(category: CauseCategory): readonly CauseCopyEntry[] {
  return copiedCauseIds()
    .filter((id) => causeDefinition(id).category === category)
    .map((id) => causeCopyEntry(id));
}

/** Copy entries at one severity. Used to check advisory copy does not read as a refusal. */
export function copyEntriesBySeverity(severity: CauseSeverity): readonly CauseCopyEntry[] {
  return copiedCauseIds()
    .filter((id) => causeDefinition(id).severity === severity)
    .map((id) => causeCopyEntry(id));
}

/**
 * The competing pathways named by a cause's copy, if any.
 *
 * Empty for every blocking cause, because a route that loses to nothing is not
 * a competition. Non empty for the graded chemistry cases CLAUDE.md names,
 * where saying "disfavoured" without saying what wins instead is the half
 * answer it warns against.
 */
export function competingRoutesFor(id: CauseId): readonly MechanismRoute[] {
  return causeCopy(id).competingRoutes ?? [];
}
