/**
 * Two answers, one chemistry: the arrows a student may push instead of the
 * authored one and still be exactly right.
 *
 * THE BUG THIS EXISTS FOR. Owner report, 2026-08-28: in the EAS nitration step
 * the nitronium ion is O=N(+)=O, and the trainer only accepted the arrow that
 * pushed the LEFT N=O pair onto the left oxygen. Pushing the right one is the
 * same move on the mirror image of the same ion, and it was graded wrong. An
 * audit found the same fault in ten authored steps: SO3's three oxygens,
 * SOCl2's two chlorines, hydronium's three protons, water's two, and both nitro
 * groups. Every one of them failed a student who was right.
 *
 * That is the worst class of bug this trainer can have. CLAUDE.md's result
 * types exist precisely because "students reach right answers by legitimate
 * other paths, and grading that as not the requested transformation is unfair".
 *
 * WHAT COUNTS AS EQUIVALENT, and why the rule is deliberately narrow. Two atoms
 * are interchangeable when they carry the same element, charge, lone pair count
 * and implicit hydrogen count, AND bond to exactly the same neighbours with
 * exactly the same bond orders. Because the neighbour IDS are part of that
 * comparison, this is far stricter than it first looks:
 *
 *   nitronium o1 and o2   both bond only to n1, order 2. EQUIVALENT.
 *   water h4 and h5       both bond only to o3, order 1. EQUIVALENT.
 *   arenium c3 and c5     c3 touches c2 and c4; c5 touches c4 and c6. Different
 *                         neighbours, so NOT equivalent, which is correct: they
 *                         sit in different places relative to the substituent.
 *
 * The direction of that caution is chosen on purpose. Being too generous here
 * would accept a wrong answer and teach bad chemistry, which is worse than the
 * bug being fixed; being too strict merely leaves a rare right answer rejected,
 * which is where we already are. So the rule only ever merges atoms whose
 * entire local environment is identical.
 *
 * WHAT THIS IS NOT. It is not symmetry perception and it is not a graph
 * automorphism search. It cannot see that two ends of a long chain are the
 * same, and it is not meant to: chem-core owns chemistry, this file owns one
 * narrow fairness rule about grading, and a clever version of it would be a
 * thing nobody could debug at 1am.
 */

import type { ElectronFlowArrow, MechanismState, Species } from "@blueberry/chem-core";

/**
 * An atom's local environment, as a string.
 *
 * Neighbour ids are included, which is what keeps ring positions distinct.
 */
function atomSignature(species: Species, atomId: string): string | null {
  const atom = species.atoms.find((a) => a.id === atomId);
  if (atom === undefined) return null;
  const bonds = species.bonds
    .filter((b) => b.a === atomId || b.b === atomId)
    .map((b) => `${b.a === atomId ? b.b : b.a}:${b.order ?? 1}`)
    .sort()
    .join(",");
  return `${atom.element}|${atom.formalCharge ?? 0}|${atom.lonePairs ?? 0}|${atom.implicitHydrogens ?? 0}|${bonds}`;
}

function speciesHolding(state: MechanismState, atomId: string): Species | null {
  for (const member of state.members) {
    if (member.species.atoms.some((a) => a.id === atomId)) return member.species;
  }
  return null;
}

/**
 * The id this atom is graded as: itself, or the first of its interchangeable
 * set in authored order.
 *
 * Authored order rather than alphabetical, so the representative is the one a
 * reader of the corpus would expect and a renamed atom does not silently move
 * every key.
 */
export function canonicalAtom(state: MechanismState, atomId: string): string {
  const species = speciesHolding(state, atomId);
  if (species === null) return atomId;
  const mine = atomSignature(species, atomId);
  if (mine === null) return atomId;
  for (const candidate of species.atoms) {
    if (atomSignature(species, candidate.id) === mine) return candidate.id;
  }
  return atomId;
}

/** The same idea for a bond: canonical when both of its ends are. */
export function canonicalBond(state: MechanismState, bondId: string): string {
  for (const member of state.members) {
    const bond = member.species.bonds.find((b) => b.id === bondId);
    if (bond === undefined) continue;
    const ends = [canonicalAtom(state, bond.a), canonicalAtom(state, bond.b)].sort();
    // A bond between canonical ends is named by those ends rather than by its
    // own id, because b-no1 and b-no2 are different ids for the same move.
    return `bond(${ends[0]}+${ends[1]}:${bond.order ?? 1})`;
  }
  return bondId;
}

/**
 * An arrow key with every id replaced by its canonical form.
 *
 * Same shape as arrowKey in grade.ts so the two read alike side by side.
 */
export function canonicalArrowKey(state: MechanismState, arrow: ElectronFlowArrow): string {
  const source = arrow.source;
  const sink = arrow.sink;

  // The electron count comes off the arrow itself rather than being inferred
  // from the source kind: a single electron arrow from a bond is real chemistry
  // (homolysis) and hardcoding 2e here would have quietly merged it with the
  // two electron move.
  const sourceKey =
    source.kind === "bond"
      ? canonicalBond(state, source.bondId)
      : source.kind === "lonePair"
        ? `lp:${canonicalAtom(state, source.atomId)}`
        : `se:${canonicalAtom(state, source.atomId)}`;

  const sinkKey =
    sink.kind === "atom"
      ? `atom:${canonicalAtom(state, sink.atomId)}`
      : `between:${sink.atomIds.map((id) => canonicalAtom(state, id)).sort().join("+")}`;

  return `${arrow.electrons}e ${sourceKey} -> ${sinkKey}`;
}

/**
 * Whether this state contains any interchangeable atoms at all.
 *
 * Used by the tests, and by anything that wants to explain to a student that
 * either of two oxygens would have done.
 */
export function hasEquivalentAtoms(state: MechanismState): boolean {
  for (const member of state.members) {
    const seen = new Set<string>();
    for (const atom of member.species.atoms) {
      const sig = atomSignature(member.species, atom.id);
      if (sig === null) continue;
      if (seen.has(sig)) return true;
      seen.add(sig);
    }
  }
  return false;
}
