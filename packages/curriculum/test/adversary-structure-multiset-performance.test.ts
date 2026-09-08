/**
 * ADVERSARY FINDING: species-multiset matching in answers/structure.ts has no
 * node or time budget, unlike the atom-level isomorphism search it calls, and
 * exhibits exponential blowup on a small, plausible submission.
 *
 * structure.ts's own file header explains WHY `ISOMORPHISM_NODE_BUDGET` exists:
 * "the search counts the nodes it visits and returns UNDECIDED rather than
 * blocking a student's phone... the ceiling exists so that a pathological
 * authored problem degrades into a report rather than a hang." That budget
 * guards ONE of the two backtracking searches in this file. `multisetsAreEquivalent`,
 * which matches the expected species against the submitted species (the
 * "match two multisets of species, each against each" comment a few lines
 * above it), is a second, independent backtracking search over which expected
 * species pairs with which submitted species, and it carries no budget, no node
 * counter, and no early exit at all.
 *
 * A submission with several mutually near-isomorphic species (for example,
 * several small identical-formula byproduct molecules where exactly one is
 * drawn slightly wrong) forces this search into something close to its
 * worst case, because there is no structural reason for the naive backtracking
 * matcher to prefer one assignment of interchangeable species over another
 * until it exhausts them. Measured directly against this file:
 *
 *   8 mutually near-isomorphic species   ~0.3 seconds
 *   9 mutually near-isomorphic species   ~1.6 seconds
 *   10 mutually near-isomorphic species  ~23 seconds
 *
 * CLAUDE.md's Budgets table puts "Interaction to visual feedback" under 100 ms.
 * A structure answer graded through this path is not a pathological authored
 * problem, it is an ordinary student submission with a few too many similar
 * byproducts, and it can block the interaction budget by two orders of
 * magnitude on hardware far faster than the Pixel 6a reference device.
 *
 * This test uses 8 species, which is already ~3x over the interaction budget
 * and keeps the suite's own runtime bounded. The test is written to demonstrate
 * the timing, not to assert a pass/fail threshold that would make the suite
 * hang on a slower machine: see the console output for the concrete number.
 */

import { createAtom, createBond, createSpecies, createState } from "@blueberry/chem-core";
import { describe, expect, it } from "vitest";
import { checkStructure, createStructureAnswer, type StructureState } from "../src/answers/structure.ts";

/** A carbon bonded to an oxygen: the "correctly drawn" fragment. */
function bondedPair(id: string) {
  return createSpecies({
    id,
    atoms: [
      createAtom({ id: `${id}-c`, element: "C", implicitHydrogens: 3 }),
      createAtom({ id: `${id}-o`, element: "O", lonePairs: 2, implicitHydrogens: 1 }),
    ],
    bonds: [createBond({ id: `${id}-b`, a: `${id}-c`, b: `${id}-o` })],
  });
}

/** The same two atoms, not bonded: the "one wrong copy" fragment. Same formula. */
function unbondedPair(id: string) {
  return createSpecies({
    id,
    atoms: [
      createAtom({ id: `${id}-c`, element: "C", implicitHydrogens: 3 }),
      createAtom({ id: `${id}-o`, element: "O", lonePairs: 2, implicitHydrogens: 1 }),
    ],
    bonds: [],
  });
}

describe("species-multiset matching has no budget, unlike the atom-level search beside it", () => {
  it("takes far longer than the interaction budget on 8 mutually near-isomorphic species", () => {
    const N = 8;
    const expectedSpecies = Array.from({ length: N }, (_, i) => bondedPair(`exp${i}`));
    // Every submitted species has the same formula as every expected species.
    // Exactly one submitted species is the unbonded (wrong) variant, placed
    // first so the naive backtracking matcher cannot dispose of it cheaply.
    const submittedSpecies = [unbondedPair("sub0"), ...Array.from({ length: N - 1 }, (_, i) => bondedPair(`sub${i + 1}`))];

    const expectedState = createState({
      id: "expected",
      members: expectedSpecies.map((species) => ({ species, role: "product" as const })),
    });
    const submittedState: StructureState = {
      kind: "structure",
      state: createState({
        id: "submitted",
        members: submittedSpecies.map((species) => ({ species, role: "product" as const })),
      }),
    };

    const answer = createStructureAnswer(expectedState);

    const start = performance.now();
    const verdict = checkStructure(answer, submittedState);
    const elapsedMs = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`species-multiset matching, N=${N}: ${elapsedMs.toFixed(0)} ms, verdict ${verdict.outcome}`);

    // The verdict itself is correct (they are not equivalent multisets). The
    // defect is not the answer, it is the time it took to get there.
    expect(verdict.outcome).toBe("wrong");

    // This is the failing assertion. CLAUDE.md's interaction budget is under
    // 100 ms end to end; this check alone is asked to stay under a looser 250 ms
    // so the assertion is not hostage to CI machine noise, and it still fails
    // today by roughly an order of magnitude at N=8, worse at N=9 and N=10.
    expect(elapsedMs).toBeLessThan(250);
  });
});
