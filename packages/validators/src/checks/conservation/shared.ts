import type { MechanismPathway, MechanismState, MechanismStep, NuclideCounts } from "@blueberry/chem-core";

/**
 * Small shared helpers. No chemistry decisions live here, only walking and formatting.
 *
 * STATES ARE NOT DEDUPLICATED BY ID.
 *
 * In a multi step pathway, `steps[n].to` and `steps[n + 1].from` describe the same system
 * and normally carry the same StateId, but step.ts stores them as separate objects so a
 * fixture can deliberately break the chain. Skipping the second one because its id was
 * already seen would mean a fixture whose two copies disagree gets checked only on the
 * copy that happens to come first. Duplicate lines in a failure report are noise. An
 * unchecked state is a hole.
 */

export interface LabelledState {
  /** For example "step-1.from". Appears verbatim in a failure line. */
  readonly label: string;
  readonly state: MechanismState;
}

export function labelledStates(pathway: MechanismPathway): readonly LabelledState[] {
  const out: LabelledState[] = [];
  for (const step of pathway.steps) {
    out.push({ label: `${step.id}.from`, state: step.from });
    out.push({ label: `${step.id}.to`, state: step.to });
  }
  return out;
}

export function steps(pathway: MechanismPathway): readonly MechanismStep[] {
  return pathway.steps;
}

/**
 * A nuclide multiset as a stable, comparable string.
 *
 * Sorted by key so two multisets that are equal always print identically. Carbon and
 * hydrogen are not floated to the front the way a molecular formula would put them,
 * because this string is for comparing two totals side by side, not for reading as a
 * formula.
 */
export function formatNuclides(counts: NuclideCounts): string {
  const keys = Object.keys(counts).sort();
  const parts = keys
    .filter((key) => (counts[key] ?? 0) !== 0)
    .map((key) => `${key}${counts[key] ?? 0}`);
  return parts.length === 0 ? "(empty)" : parts.join(" ");
}

/** A signed difference multiset, for saying "H +1" rather than "not equal". */
export function formatSignedNuclides(difference: NuclideCounts): string {
  const keys = Object.keys(difference).sort();
  const parts = keys
    .filter((key) => (difference[key] ?? 0) !== 0)
    .map((key) => {
      const value = difference[key] ?? 0;
      return `${key} ${value > 0 ? "+" : ""}${value}`;
    });
  return parts.length === 0 ? "(no difference)" : parts.join(", ");
}

/** The species id an atom belongs to in this state, or undefined if it is not here. */
export function speciesIdOfAtom(state: MechanismState, atomId: string): string | undefined {
  for (const member of state.members) {
    for (const atom of member.species.atoms) {
      if (atom.id === atomId) return member.species.id;
    }
  }
  return undefined;
}
