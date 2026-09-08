/**
 * Predict the product: comparing a submitted structure against an authored one.
 *
 * READ THIS BEFORE USING IT, because what it does not do matters more than what
 * it does.
 *
 * WHAT IT COMPARES. Constitution, over a multiset of species. Which atoms are
 * present, including implicit hydrogens and isotope labels, what charge and how
 * many lone pairs and unpaired electrons each carries, and which atoms are bonded
 * to which at what order. Atom ids and species ids are NOT compared: a student
 * who drew the same molecule with different ids drew the same molecule. Roles are
 * not compared either, because labelling a species "byproduct" rather than
 * "product" is not a chemistry error.
 *
 * SPECTATORS ARE ASYMMETRIC, and this is a correctness rule, not a convenience.
 * The AUTHORED answer's spectator declarations are honoured: they were written
 * and reviewed by a person, which is what CLAUDE.md's system boundary requires
 * of a declaration. The SUBMITTED state's spectator declarations are IGNORED:
 * every species the student drew participates in grading. An adversary pass
 * proved the alternative marks wrong chemistry correct, exactly the attack
 * CLAUDE.md names: a student who draws a wrong extra species and declares it a
 * spectator inside their own submission would hide the mistake from the
 * checker. Nothing validates a student-side declaration, so nothing may trust
 * one. The contract with the shell is that the submission contains exactly what
 * the student drew as their answer, nothing pre-populated.
 *
 * WHAT IT CANNOT COMPARE, and what it does instead of guessing:
 *
 *   Stereochemistry. If either side carries an atom or bond stereo declaration,
 *   the comparison returns UNDECIDED and names
 *   `structure_comparison_needs_stereochemistry`. It does not fall back to
 *   comparing constitution and calling that a match, because a checker that
 *   silently ignores stereochemistry marks the enantiomer correct, and CLAUDE.md
 *   is explicit that SN2 inverting is a hard assertion. problem.ts refuses to
 *   BUILD a structure problem whose authored answer carries stereo, so an author
 *   finds this out at import time rather than a student finding it out mid
 *   attempt.
 *
 *   Canonical SMILES, and everything downstream of it: tautomers, resonance
 *   forms, aromatic perception. CLAUDE.md D3 gives canonical structure
 *   equivalence to Indigo, which is already loaded on the editor routes and must
 *   stay behind the lazy boundary, and gives aromaticity to RDKit in CI. A
 *   Kekule structure with the double bonds drawn the other way round is a
 *   different graph and this file will report it as an isomer. That is a real
 *   limitation and the corpus works around it by not authoring structure answers
 *   where it bites.
 *
 *   Conformation. Declared torsions are ignored. Two conformers of one molecule
 *   are one molecule here.
 *
 * WHY THERE IS A NODE BUDGET. Graph isomorphism has no known polynomial
 * algorithm and the search below is a backtracking one. CLAUDE.md's interaction
 * budget is under 100 ms from interaction to visual feedback, so the search
 * counts the nodes it visits and returns UNDECIDED rather than blocking a
 * student's phone. On the molecules this corpus contains it is not close to the
 * ceiling; the ceiling exists so that a pathological authored problem degrades
 * into a report rather than a hang.
 *
 * WHY THE MATCH DIRECTION IS VERIFIED. A "not isomorphic" answer follows from an
 * invariant that differs, which is sound on its own. An "isomorphic" answer
 * carries a bijection, and `verifyMapping` re-checks every atom and every atom
 * pair against it in linear time. So the expensive half of this file can be
 * wrong without the answer being wrong: a bug in the search makes it slow or
 * makes it report undecided, and cannot make it report a match that is not one.
 */

import {
  molecularFormula,
  nuclideCountsOfMany,
  participatingMembers,
  speciesCharge,
  type MechanismState,
  type Species,
} from "@blueberry/chem-core";
import type { CurriculumCauseId } from "../causes.js";

export interface StructureState {
  readonly kind: "structure";
  readonly state: MechanismState;
}

export interface StructureAnswerSpec {
  readonly kind: "structure";
  readonly state: MechanismState;
}

export type StructureVerdict =
  | { readonly outcome: "correct" }
  | { readonly outcome: "wrong"; readonly cause: CurriculumCauseId; readonly detail: string }
  | { readonly outcome: "undecided"; readonly cause: CurriculumCauseId; readonly detail: string };

/** Nodes the isomorphism search may visit before it gives up and says so. */
export const ISOMORPHISM_NODE_BUDGET = 200_000;

export function hasStereoDeclarations(state: MechanismState): boolean {
  return state.members.some(
    (member) =>
      member.species.atoms.some((atom) => atom.stereo !== undefined) ||
      member.species.bonds.some((bond) => bond.stereo !== undefined),
  );
}

export function createStructureAnswer(state: MechanismState): StructureAnswerSpec {
  if (state.members.length === 0) {
    throw new Error("a structure answer with no species says nothing");
  }
  if (participatingMembers(state).length === 0) {
    throw new Error("every species in this structure answer is declared a spectator");
  }
  if (hasStereoDeclarations(state)) {
    throw new Error(
      "this structure answer carries a stereo declaration, and packages/curriculum compares " +
        "constitution only. Comparing it here would mark the enantiomer correct. Author it as a " +
        "major product choice, or as a mechanism in chem-core, until canonical comparison through " +
        "Indigo is wired on the editor route.",
    );
  }
  return Object.freeze({ kind: "structure" as const, state });
}

function atomLabel(species: Species, index: number): string {
  const atom = species.atoms[index];
  if (atom === undefined) throw new Error(`atom index ${index} out of range`);
  const isotope = atom.isotope === undefined ? "" : `[${atom.isotope}]`;
  return `${atom.element}${isotope}|q${atom.formalCharge}|lp${atom.lonePairs}|e${atom.unpairedElectrons}|h${atom.implicitHydrogens}`;
}

interface SpeciesGraph {
  readonly size: number;
  readonly labels: readonly string[];
  /** order of the bond between i and j, 0 for none. Symmetric, square. */
  readonly adjacency: readonly (readonly number[])[];
  /** Bonds naming an atom this species does not contain. Part of the invariant. */
  readonly danglingCount: number;
}

function buildGraph(species: Species): SpeciesGraph {
  const indexOf = new Map<string, number>();
  species.atoms.forEach((atom, index) => indexOf.set(atom.id, index));
  const size = species.atoms.length;
  const adjacency: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  let danglingCount = 0;

  for (const bond of species.bonds) {
    const a = indexOf.get(bond.a);
    const b = indexOf.get(bond.b);
    if (a === undefined || b === undefined) {
      danglingCount += 1;
      continue;
    }
    const rowA = adjacency[a];
    const rowB = adjacency[b];
    if (rowA === undefined || rowB === undefined) continue;
    // A second bond between the same pair would overwrite rather than add. That
    // is a malformed species rather than a chemistry case, and chem-core's own
    // authoring checks own it, so this takes the last one and does not invent a
    // rule for it here.
    rowA[b] = bond.order;
    rowB[a] = bond.order;
  }

  return {
    size,
    labels: species.atoms.map((_, index) => atomLabel(species, index)),
    adjacency,
    danglingCount,
  };
}

/**
 * FNV-1a, 32 bit. A stable, graph independent hash of a colour string.
 *
 * Boring on purpose. A collision here can only merge two classes that should be
 * separate, which makes the search do more work and can never make it report a
 * match: every reported match is re-checked by `verifyMapping` against the real
 * adjacency.
 */
function hashColour(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

/**
 * Weisfeiler Lehman colour refinement.
 *
 * Boring and well known: each atom's colour becomes a hash of its own colour and
 * the sorted multiset of its neighbours' colours and the bond orders reaching
 * them, repeated until it stops changing. It is a strong invariant and it is NOT
 * a proof of isomorphism, which is why the search below still runs and still
 * verifies its mapping. Its job here is to make the search's branching factor
 * small enough that the node budget is never a real constraint.
 */
function refineColours(graph: SpeciesGraph): readonly string[] {
  let colours = [...graph.labels];
  for (let round = 0; round < graph.size; round += 1) {
    const next = colours.map((colour, index) => {
      const neighbours: string[] = [];
      const row = graph.adjacency[index];
      if (row !== undefined) {
        for (let other = 0; other < graph.size; other += 1) {
          const order = row[other];
          if (order !== undefined && order > 0) {
            neighbours.push(`${order}:${colours[other] ?? ""}`);
          }
        }
      }
      neighbours.sort();
      return `${colour}#${neighbours.join(",")}`;
    });
    // Compress to keep the strings from growing without bound across rounds.
    //
    // The compression has to be a function of the colour string ALONE. An
    // earlier version numbered the classes in the order they were encountered
    // in the array, which is a per graph counter, so the same structural class
    // came out as "c0" in one molecule and "c2" in the other and two identical
    // molecules never matched. That bug is why this is a hash and not a counter.
    const compressed = next.map(hashColour);
    if (compressed.join("|") === colours.join("|")) break;
    colours = compressed;
  }
  return colours;
}

function histogram(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function histogramsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, count] of a) {
    if (b.get(key) !== count) return false;
  }
  return true;
}

type IsomorphismOutcome =
  | { readonly decided: true; readonly isomorphic: true; readonly mapping: readonly number[] }
  | { readonly decided: true; readonly isomorphic: false }
  | { readonly decided: false; readonly reason: "budget_exhausted" };

/** Linear time re-check of a bijection the search proposed. See the file header. */
function verifyMapping(
  left: SpeciesGraph,
  right: SpeciesGraph,
  mapping: readonly number[],
  leftColours: readonly string[],
  rightColours: readonly string[],
): boolean {
  if (mapping.length !== left.size) return false;
  const used = new Set<number>();
  for (let i = 0; i < left.size; i += 1) {
    const image = mapping[i];
    if (image === undefined || image < 0 || image >= right.size) return false;
    if (used.has(image)) return false;
    used.add(image);
    if (left.labels[i] !== right.labels[image]) return false;
    if (leftColours[i] !== rightColours[image]) return false;
  }
  for (let i = 0; i < left.size; i += 1) {
    for (let j = i + 1; j < left.size; j += 1) {
      const imageI = mapping[i];
      const imageJ = mapping[j];
      if (imageI === undefined || imageJ === undefined) return false;
      if ((left.adjacency[i]?.[j] ?? 0) !== (right.adjacency[imageI]?.[imageJ] ?? 0)) return false;
    }
  }
  return true;
}

function findIsomorphism(left: SpeciesGraph, right: SpeciesGraph): IsomorphismOutcome {
  if (left.size !== right.size) return { decided: true, isomorphic: false };
  if (left.danglingCount !== right.danglingCount) return { decided: true, isomorphic: false };
  if (!histogramsEqual(histogram(left.labels), histogram(right.labels))) {
    return { decided: true, isomorphic: false };
  }

  const leftColours = refineColours(left);
  const rightColours = refineColours(right);
  if (!histogramsEqual(histogram(leftColours), histogram(rightColours))) {
    return { decided: true, isomorphic: false };
  }

  const candidates: number[][] = leftColours.map((colour, index) => {
    const options: number[] = [];
    for (let other = 0; other < right.size; other += 1) {
      if (rightColours[other] === colour && left.labels[index] === right.labels[other]) {
        options.push(other);
      }
    }
    return options;
  });

  // Most constrained atom first. This is the ordinary way to keep a backtracking
  // search shallow and it is the only optimisation in here.
  const order = candidates
    .map((options, index) => ({ index, count: options.length }))
    .sort((a, b) => a.count - b.count)
    .map((entry) => entry.index);

  const mapping = new Array<number>(left.size).fill(-1);
  const taken = new Set<number>();
  let nodes = 0;
  let exhausted = false;

  function consistent(leftIndex: number, rightIndex: number): boolean {
    for (let other = 0; other < left.size; other += 1) {
      const image = mapping[other];
      if (image === undefined || image < 0) continue;
      const here = left.adjacency[leftIndex]?.[other] ?? 0;
      const there = right.adjacency[rightIndex]?.[image] ?? 0;
      if (here !== there) return false;
    }
    return true;
  }

  function search(position: number): boolean {
    if (exhausted) return false;
    if (position === order.length) return true;
    const leftIndex = order[position];
    if (leftIndex === undefined) return false;
    for (const rightIndex of candidates[leftIndex] ?? []) {
      nodes += 1;
      if (nodes > ISOMORPHISM_NODE_BUDGET) {
        exhausted = true;
        return false;
      }
      if (taken.has(rightIndex)) continue;
      if (!consistent(leftIndex, rightIndex)) continue;
      mapping[leftIndex] = rightIndex;
      taken.add(rightIndex);
      if (search(position + 1)) return true;
      taken.delete(rightIndex);
      mapping[leftIndex] = -1;
    }
    return false;
  }

  const found = search(0);
  if (exhausted) return { decided: false, reason: "budget_exhausted" };
  if (!found) return { decided: true, isomorphic: false };
  if (!verifyMapping(left, right, mapping, leftColours, rightColours)) {
    // The search proposed a mapping the verifier rejects. That is a bug in this
    // file, not a student's answer, and the honest report is undecided.
    return { decided: false, reason: "budget_exhausted" };
  }
  return { decided: true, isomorphic: true, mapping: [...mapping] };
}

/** Whether two species are the same molecule, ignoring ids and stereochemistry. */
export function speciesAreEquivalent(left: Species, right: Species): IsomorphismOutcome {
  return findIsomorphism(buildGraph(left), buildGraph(right));
}

/** The authored side: spectator declarations were reviewed, so they are honoured. */
function participatingSpecies(state: MechanismState): readonly Species[] {
  return participatingMembers(state).map((member) => member.species);
}

/**
 * The submitted side: spectator declarations are ignored, per the file header.
 * Everything the student drew is graded.
 */
function submittedSpecies(state: MechanismState): readonly Species[] {
  return state.members.map((member) => member.species);
}

function totalCharge(species: readonly Species[]): number {
  return species.reduce((sum, one) => sum + speciesCharge(one), 0);
}

function formulaKey(species: readonly Species[]): string {
  return Object.entries(nuclideCountsOfMany(species))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key}${count}`)
    .join("");
}

/**
 * Match two multisets of species, each against each: two copies of the same
 * molecule in one state must not both match one copy in the other.
 *
 * This is BIPARTITE MATCHING, not general search, and that distinction is the
 * whole fix here. An earlier version backtracked over assignments and re-ran
 * the species comparison inside the search, which an adversary pass measured at
 * ~23 seconds for ten near-identical species, two orders of magnitude over the
 * 100 ms interaction budget. Maximum bipartite matching is polynomial: compare
 * every pair ONCE (each comparison individually guarded by
 * ISOMORPHISM_NODE_BUDGET), then find a perfect matching over the resulting
 * boolean edges with Kuhn's augmenting paths, O(n^3) in the species count. No
 * separate budget is needed because nothing here is exponential any more.
 *
 * Undecided pair comparisons contribute no edge. If a perfect matching exists
 * without them, the multisets are equivalent, soundly: every edge used was a
 * verified isomorphism. If no perfect matching exists and at least one pair was
 * undecided, the honest answer is undecided, because the missing edge might
 * have completed the matching.
 */
function multisetsAreEquivalent(
  expected: readonly Species[],
  submitted: readonly Species[],
): { readonly decided: boolean; readonly equivalent: boolean } {
  if (expected.length !== submitted.length) return { decided: true, equivalent: false };
  const size = expected.length;
  let undecided = false;

  const edges: boolean[][] = expected.map((one) =>
    submitted.map((other) => {
      const outcome = speciesAreEquivalent(one, other);
      if (!outcome.decided) {
        undecided = true;
        return false;
      }
      return outcome.isomorphic;
    }),
  );

  // Kuhn's algorithm: for each expected species, walk an augmenting path.
  const matchedExpectedFor = new Array<number>(size).fill(-1);

  function augment(expectedIndex: number, visited: boolean[]): boolean {
    const row = edges[expectedIndex];
    if (row === undefined) return false;
    for (let submittedIndex = 0; submittedIndex < size; submittedIndex += 1) {
      if (row[submittedIndex] !== true || visited[submittedIndex] === true) continue;
      visited[submittedIndex] = true;
      const holder = matchedExpectedFor[submittedIndex];
      if (holder === undefined || holder === -1 || augment(holder, visited)) {
        matchedExpectedFor[submittedIndex] = expectedIndex;
        return true;
      }
    }
    return false;
  }

  let matched = 0;
  for (let expectedIndex = 0; expectedIndex < size; expectedIndex += 1) {
    if (augment(expectedIndex, new Array<boolean>(size).fill(false))) matched += 1;
  }

  if (matched === size) return { decided: true, equivalent: true };
  if (undecided) return { decided: false, equivalent: false };
  return { decided: true, equivalent: false };
}

export function checkStructure(spec: StructureAnswerSpec, state: StructureState): StructureVerdict {
  if (hasStereoDeclarations(state.state)) {
    return {
      outcome: "undecided",
      cause: "structure_comparison_needs_stereochemistry",
      detail: "the submitted structure declares stereochemistry, which is compared by Indigo",
    };
  }

  const expected = participatingSpecies(spec.state);
  const submitted = submittedSpecies(state.state);

  if (formulaKey(expected) !== formulaKey(submitted)) {
    return {
      outcome: "wrong",
      cause: "structure_molecular_formula_differs",
      detail: `submitted ${submitted.map(molecularFormula).join(" + ")}, answer ${expected
        .map(molecularFormula)
        .join(" + ")}`,
    };
  }
  if (totalCharge(expected) !== totalCharge(submitted)) {
    return {
      outcome: "wrong",
      cause: "structure_charge_differs",
      detail: `submitted total charge ${totalCharge(submitted)}, answer ${totalCharge(expected)}`,
    };
  }
  if (expected.length !== submitted.length) {
    return {
      outcome: "wrong",
      cause: "structure_species_count_differs",
      detail: `submitted ${submitted.length} species, answer has ${expected.length}`,
    };
  }

  const comparison = multisetsAreEquivalent(expected, submitted);
  if (!comparison.decided) {
    return {
      outcome: "undecided",
      cause: "structure_comparison_budget_exhausted",
      detail: `the isomorphism search passed its ${ISOMORPHISM_NODE_BUDGET} node ceiling`,
    };
  }
  if (comparison.equivalent) return { outcome: "correct" };

  return {
    outcome: "wrong",
    cause: "structure_is_an_isomer_of_the_answer",
    detail: `same atoms and charge as ${expected.map(molecularFormula).join(" + ")}, connected differently`,
  };
}

/**
 * Distractor matching for structures: the same comparison, run against the
 * predicted wrong structure.
 *
 * Returns false when the comparison is undecided, so an undecided attempt falls
 * through to the tail and is logged rather than being attributed to a distractor
 * the checker could not actually confirm.
 */
export function structureStateMatches(
  target: StructureState,
  submitted: StructureState,
): boolean {
  if (hasStereoDeclarations(target.state) || hasStereoDeclarations(submitted.state)) return false;
  // The target is an AUTHORED distractor state, so its declarations are
  // honoured like the answer's; the submission's are ignored, same as above.
  const expected = participatingSpecies(target.state);
  const given = submittedSpecies(submitted.state);
  if (formulaKey(expected) !== formulaKey(given)) return false;
  if (totalCharge(expected) !== totalCharge(given)) return false;
  const comparison = multisetsAreEquivalent(expected, given);
  return comparison.decided && comparison.equivalent;
}
