/**
 * Electron, mass, and charge bookkeeping.
 *
 * These are COUNTERS, not checks. Nothing in this file decides whether a
 * structure is right. It reports totals; `packages/validators` compares them and
 * decides. Keeping the counting here and the deciding there is what makes the
 * checks falsifiable: a validator that computed its own totals would be grading
 * its own arithmetic.
 *
 * Counting lives in chem-core because D3 gives chem-core exactly this job, in
 * the browser, inside the hundred millisecond budget.
 *
 * MASS IS COUNTED AS NUCLEI, NOT AS WEIGHT. Summing atomic weights and comparing
 * floats needs a tolerance, and a tolerance is a thing somebody widens at 2am to
 * make a fixture pass. A multiset of nuclide keys compares exactly.
 */

import type { Atom } from "./atom.js";
import { atomNuclideKey, nonbondingElectrons, nuclideKey } from "./atom.js";
import type { Species } from "./species.js";
import { bondsAt, requireAtom } from "./species.js";
import { elementProperties } from "./elements.js";
import type { AtomId } from "./ids.js";
import type { MechanismState } from "./state.js";
import { participatingMembers } from "./state.js";

/** A multiset of nuclei, keyed as in `nuclideKey`. */
export type NuclideCounts = Readonly<Record<string, number>>;

const HYDROGEN_KEY = nuclideKey("H");

function addTo(counts: Record<string, number>, key: string, amount: number): void {
  counts[key] = (counts[key] ?? 0) + amount;
}

/**
 * Every nucleus in a species, including implicit hydrogens.
 *
 * The implicit hydrogen term is the one that matters. VERIFICATION.md S5
 * describes the bug exactly: a proton transfer changes implicit hydrogen counts
 * on two atoms and touches nothing else, so a mass count that walks only the
 * explicit atom list reports conservation while a proton quietly appeared or
 * vanished.
 */
export function nuclideCounts(species: Species): NuclideCounts {
  const counts: Record<string, number> = {};
  for (const atom of species.atoms) {
    addTo(counts, atomNuclideKey(atom), 1);
    if (atom.implicitHydrogens !== 0) {
      addTo(counts, HYDROGEN_KEY, atom.implicitHydrogens);
    }
  }
  return counts;
}

/** Nuclei across a set of species. */
export function nuclideCountsOfMany(speciesList: readonly Species[]): NuclideCounts {
  const counts: Record<string, number> = {};
  for (const species of speciesList) {
    for (const [key, value] of Object.entries(nuclideCounts(species))) {
      addTo(counts, key, value);
    }
  }
  return counts;
}

/**
 * Standard atomic weight of a species, for display only.
 *
 * Never use this for conservation. It is here so a debug view can show a mass
 * and so a wildly wrong structure is obvious at a glance. Isotopes are counted
 * at their mass number, which is an approximation and is fine for a label.
 */
export function approximateMass(species: Species): number {
  let total = 0;
  for (const atom of species.atoms) {
    total +=
      atom.isotope === undefined ? elementProperties(atom.element).standardAtomicWeight : atom.isotope;
    total += atom.implicitHydrogens * elementProperties("H").standardAtomicWeight;
  }
  return total;
}

/**
 * A molecular formula in Hill order: carbon, then hydrogen, then everything else
 * alphabetically. Debug and display only. Isotopes are folded into their element
 * here, so it is not an identity.
 */
export function molecularFormula(species: Species): string {
  const counts: Record<string, number> = {};
  for (const atom of species.atoms) {
    addTo(counts, atom.element, 1);
    if (atom.implicitHydrogens !== 0) {
      addTo(counts, "H", atom.implicitHydrogens);
    }
  }

  const symbols = Object.keys(counts).sort();
  const ordered: string[] = [];
  if (counts["C"] !== undefined) ordered.push("C");
  if (counts["H"] !== undefined) ordered.push("H");
  for (const symbol of symbols) {
    if (symbol !== "C" && symbol !== "H") ordered.push(symbol);
  }

  return ordered
    .map((symbol) => {
      const count = counts[symbol] ?? 0;
      return count === 1 ? symbol : `${symbol}${count}`;
    })
    .join("");
}

/**
 * Sum of bond orders at an atom, counting implicit hydrogens as order one.
 *
 * Forgetting the implicit hydrogen term here makes every methyl group look like
 * a carbanion, so it is folded in rather than left to the caller.
 */
export function bondOrderSumAt(species: Species, atomId: AtomId): number {
  const atom = requireAtom(species, atomId);
  let total = atom.implicitHydrogens;
  for (const bond of bondsAt(species, atomId)) {
    total += bond.order;
  }
  return total;
}

/**
 * The formal charge the structure implies, as opposed to the one declared.
 *
 * formalCharge = valenceElectrons - nonbondingElectrons - bondOrderSum
 *
 * When this disagrees with `atom.formalCharge`, one of the two is wrong and
 * `formal_charge_disagrees_with_structure` is the named cause. This function
 * reports the number; it does not decide which is at fault.
 */
export function derivedFormalCharge(species: Species, atomId: AtomId): number {
  const atom = requireAtom(species, atomId);
  const properties = elementProperties(atom.element);
  return properties.valenceElectrons - nonbondingElectrons(atom) - bondOrderSumAt(species, atomId);
}

/**
 * Valence electrons around an atom, the number the octet rule is about.
 *
 * Bonding electrons are counted in full at both ends, which is the octet
 * convention rather than the formal charge convention. The two counts answer
 * different questions and mixing them up is a classic source of a check that
 * fires on correct structures.
 */
export function valenceElectronsAround(species: Species, atomId: AtomId): number {
  const atom = requireAtom(species, atomId);
  return nonbondingElectrons(atom) + bondOrderSumAt(species, atomId) * 2;
}

/** Declared charge on a species: the sum of its atoms' declared formal charges. */
export function speciesCharge(species: Species): number {
  return species.atoms.reduce((total, atom) => total + atom.formalCharge, 0);
}

/**
 * Total valence electrons in a species.
 *
 * Neutral atom contributions minus the charge. An implicit hydrogen brings one.
 * A positive charge means one electron fewer than the neutral atoms would have
 * had, which is why charge is subtracted.
 */
export function valenceElectronCount(species: Species): number {
  let total = 0;
  for (const atom of species.atoms) {
    total += elementProperties(atom.element).valenceElectrons;
    total += atom.implicitHydrogens * elementProperties("H").valenceElectrons;
  }
  return total - speciesCharge(species);
}

/**
 * The three quantities conservation is asserted over, totalled across the
 * multiset.
 *
 * This is the system boundary rule as a single function call. Spectators are
 * excluded by default, because that is what declaring a spectator means; pass
 * `includeSpectators` to get the totals over everything, which is what an
 * adversary attacking a spectator declaration wants.
 */
export interface ConservedTotals {
  readonly nuclides: NuclideCounts;
  readonly charge: number;
  readonly valenceElectrons: number;
  /** Which species were counted. Recorded so a failure can say what was in scope. */
  readonly countedSpeciesIds: readonly string[];
}

export interface ConservedTotalsOptions {
  readonly includeSpectators?: boolean;
}

export function conservedTotals(
  state: MechanismState,
  options: ConservedTotalsOptions = {},
): ConservedTotals {
  const members = options.includeSpectators === true ? state.members : participatingMembers(state);
  const speciesList = members.map((member) => member.species);

  let charge = 0;
  let electrons = 0;
  for (const species of speciesList) {
    charge += speciesCharge(species);
    electrons += valenceElectronCount(species);
  }

  return Object.freeze({
    nuclides: nuclideCountsOfMany(speciesList),
    charge,
    valenceElectrons: electrons,
    countedSpeciesIds: Object.freeze(speciesList.map((species) => species.id)),
  });
}

/**
 * Compare two nuclide multisets. Empty result means they match exactly.
 *
 * Returned as a difference rather than a boolean so a failure can say "one
 * hydrogen short" instead of "mass not conserved".
 */
export function nuclideDifference(before: NuclideCounts, after: NuclideCounts): NuclideCounts {
  const difference: Record<string, number> = {};
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const delta = (after[key] ?? 0) - (before[key] ?? 0);
    if (delta !== 0) {
      difference[key] = delta;
    }
  }
  return difference;
}

/** Convenience for reading an atom's nuclide key without a species lookup. */
export function atomKey(atom: Atom): string {
  return atomNuclideKey(atom);
}
