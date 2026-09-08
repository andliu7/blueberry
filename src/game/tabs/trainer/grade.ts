/**
 * Grading a drawn step in the shell, and the honest limits of doing so.
 *
 * chem-core defines AttemptResolution, the four result types, and the cause
 * registry, and arrowLegalityFindings is its runtime judge of whether arrows
 * are legal on a state. What it does NOT have is a function that takes a
 * drawn MechanismStep and produces an AttemptResolution: the validators
 * compute resolutions from authored fixtures, never from live input. That is
 * a real gap, recorded in STATUS.md, and the right home for it is chem-core,
 * not this file.
 *
 * So this grader does the part that is sound today and names the part that
 * is not:
 *
 *   invalid   any arrow fails legality. The finding's cause is the named cause
 *             and packages/feedback has authored copy for it. This is the
 *             real Tier 1 path and it is fully honest.
 *   correct   the drawn arrow set equals the authored step's arrow set, as
 *             sets, ignoring ids. Copy: matches_requested_route.
 *   not_requested  legal arrows that are not the authored set. chem-core
 *             cannot yet say which transformation they describe, so the copy
 *             says that plainly instead of pretending to a named route. It
 *             is NOT valid_transformation_not_requested from the registry,
 *             because that cause promises the name of what was built and
 *             this shell cannot supply one.
 *   incomplete  fewer arrows than the step needs, all legal. Not a result
 *             type; a prompt to keep going.
 */

import {
  arrowLegalityFindings,
  type ArrowLegalityFinding,
  type CauseId,
  type ElectronFlowArrow,
  type ElectronSink,
  type ElectronSource,
  type MechanismStep,
} from "@blueberry/chem-core";
import { canonicalArrowKey } from "./equivalence";

export type DrawVerdict =
  | { readonly kind: "correct"; readonly cause: CauseId }
  | { readonly kind: "invalid"; readonly cause: CauseId; readonly finding: ArrowLegalityFinding }
  | { readonly kind: "not_requested"; readonly missing: number; readonly extra: number }
  | { readonly kind: "incomplete"; readonly drawn: number; readonly needed: number };

function sourceKey(source: ElectronSource): string {
  switch (source.kind) {
    case "lonePair":
      return `lp:${source.atomId}`;
    case "bond":
      return `bond:${source.bondId}`;
    case "singleElectron":
      return `se:${source.atomId}`;
    default: {
      const unreachable: never = source;
      return String(unreachable);
    }
  }
}

function sinkKey(sink: ElectronSink): string {
  if (sink.kind === "atom") return `atom:${sink.atomId}`;
  const [a, b] = sink.atomIds;
  return `between:${[a, b].sort().join("+")}`;
}

export function arrowKey(arrow: ElectronFlowArrow): string {
  return `${arrow.electrons}e ${sourceKey(arrow.source)} -> ${sinkKey(arrow.sink)}`;
}

export function gradeDrawing(step: MechanismStep, drawn: readonly ElectronFlowArrow[]): DrawVerdict {
  const findings = arrowLegalityFindings(drawn, step.from);
  const first = findings[0];
  if (first !== undefined) return { kind: "invalid", cause: first.cause, finding: first };

  // Canonical keys, so a student who pushes the OTHER of two chemically
  // identical N=O pairs is graded right. See equivalence.ts for what counts as
  // identical and why the rule is deliberately narrow.
  //
  // Counted as multisets rather than sets, which matters exactly here: two
  // equivalent arrows collapse to one key, so a set would score someone who
  // drew BOTH of them as perfectly correct instead of one arrow over.
  const tally = (keys: readonly string[]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  };
  const wanted = tally(step.arrows.map((arrow) => canonicalArrowKey(step.from, arrow)));
  const have = tally(drawn.map((arrow) => canonicalArrowKey(step.from, arrow)));

  let missing = 0;
  for (const [key, n] of wanted) missing += Math.max(0, n - (have.get(key) ?? 0));
  let extra = 0;
  for (const [key, n] of have) extra += Math.max(0, n - (wanted.get(key) ?? 0));

  if (missing === 0 && extra === 0) return { kind: "correct", cause: "matches_requested_route" };
  if (extra === 0 && drawn.length < step.arrows.length) {
    return { kind: "incomplete", drawn: drawn.length, needed: step.arrows.length };
  }
  return { kind: "not_requested", missing, extra };
}

/** The authored arrows this drawing is still missing. Used to pick what wobbles. */
export function missingArrows(step: MechanismStep, drawn: readonly ElectronFlowArrow[]): readonly ElectronFlowArrow[] {
  const have = new Set(drawn.map(arrowKey));
  return step.arrows.filter((arrow) => !have.has(arrowKey(arrow)));
}
