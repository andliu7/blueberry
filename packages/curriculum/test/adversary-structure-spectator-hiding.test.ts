/**
 * ADVERSARY FINDING (highest severity of this pass): a student can turn a wrong
 * structure submission into a "correct" grade by declaring the unwanted extra
 * species a spectator inside their OWN submitted state. This marks wrong
 * chemistry correct, which CLAUDE.md's chemistry correctness section calls a
 * bug that "teaches students wrong chemistry" outright.
 *
 * `answers/structure.ts`'s own file header states the rule plainly: "Declared
 * spectators are excluded, which is chem-core's own system boundary rule
 * applied unchanged." `checkStructure` computes `participatingSpecies(...)` on
 * BOTH sides by calling `participatingMembers` from chem-core, which filters
 * out any species named in that SAME state's own `spectators` list.
 *
 * The correct answer's spectator list is authored and reviewed. The submitted
 * state's spectator list is not: `StructureState.state` is a raw
 * `MechanismState`, and `chem-core`'s own `SpectatorDeclaration` requires only a
 * `speciesId`, one of four `SpectatorReason` values (one of which is literally
 * "authored_simplification"), a free-text `justification`, and a free-text
 * `declaredBy`. Nothing in chem-core or in this package checks that a
 * spectator declaration on the STUDENT'S side is honest, and nothing prevents a
 * student's own submission from declaring their own mistake a spectator.
 *
 * CLAUDE.md is explicit that this exact move is the one to defend against:
 * "Spectator declarations may be declared and excluded, but declaring a
 * spectator is an explicit, recorded act that a validator can see and an
 * adversary can attack." This file is that attack. `checkStructure` does not
 * see it: it trusts the submitted state's own spectator list the same way it
 * trusts the authored answer's.
 */

import { createAtom, createBond, createSpecies, createState } from "@blueberry/chem-core";
import { describe, expect, it } from "vitest";
import { checkStructure, createStructureAnswer, type StructureState } from "../src/answers/structure.ts";

const ethanol = createSpecies({
  id: "sp-ethanol",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2, implicitHydrogens: 1 }),
  ],
  bonds: [createBond({ id: "b1", a: "c1", b: "c2" }), createBond({ id: "b2", a: "c2", b: "o1" })],
});

/** An extra species that has no business in the answer: a bromide ion. */
const strayBromide = createSpecies({
  id: "sp-stray-bromide",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

describe("a student's own spectator declaration hides a real participant from grading", () => {
  const answer = createStructureAnswer(
    createState({ id: "expected", members: [{ species: ethanol, role: "product" }] }),
  );

  it("marks a genuinely wrong submission WRONG when nothing is hidden", () => {
    const honest: StructureState = {
      kind: "structure",
      state: createState({
        id: "submitted-honest",
        members: [
          { species: ethanol, role: "product" },
          { species: strayBromide, role: "byproduct" },
        ],
      }),
    };
    expect(checkStructure(answer, honest)).toMatchObject({ outcome: "wrong" });
  });

  it("marks the identical wrong submission CORRECT once the student declares the extra species a spectator", () => {
    const dishonest: StructureState = {
      kind: "structure",
      state: createState({
        id: "submitted-dishonest",
        members: [
          { species: ethanol, role: "product" },
          { species: strayBromide, role: "byproduct" },
        ],
        spectators: [
          {
            speciesId: "sp-stray-bromide",
            reason: "authored_simplification",
            justification: "not relevant to the product",
            declaredBy: "student",
          },
        ],
      }),
    };

    // This is the failing assertion: the same structural mistake as the honest
    // case above, hidden behind a self-declared, unreviewed spectator claim,
    // should still grade wrong. It does not.
    expect(checkStructure(answer, dishonest)).toMatchObject({ outcome: "wrong" });
  });
});
