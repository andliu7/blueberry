import { describe, expect, it } from "vitest";

import type { LoadedFixture } from "../src/checks/conservation/fixture-schema.ts";
import { isConservationFamilyCheck } from "../src/checks/conservation/family.ts";
import { conservationStepIdentity } from "../src/checks/conservation/step-identity.ts";

/**
 * ADVERSARY PASS TWO, PHASE 1. Item 3 in the brief: "Check the right cause fires for the
 * right condition. A cause that names the wrong thing is the bug that was just fixed once."
 *
 * The corpus fixtures under fixtures/ prove that conservation-step-identity fires SOME
 * violation on each of its four negative controls, because that is all family.ts's mustFail
 * mechanism can assert: a broken fixture must produce at least one violation from every
 * check it names, full stop. It cannot assert WHICH cause id that violation carries, and a
 * check that reports the right rule but the wrong cause would still satisfy every fixture in
 * the corpus, because nothing reads `violation.cause` at fixture-corpus grading time.
 *
 * These tests call `conservationStepIdentity.find` directly, the same technique the family
 * itself uses internally (family.ts: "checks/feedback/named-causes.ts calls the finder
 * directly and reads the cause off each violation"), against small synthetic steps built as
 * plain objects rather than through the JSON fixture schema, so each test isolates exactly
 * one of the four conditions and asserts its exact, single cause id. `find` only reads
 * `fixture.pathway.steps`, so a minimal object with that one field is a legitimate input,
 * the same narrowness `rate-comparison-competing-routes-not-locked.test.ts` in this same
 * directory relies on for the sibling check.
 */

function fixtureOf(...steps: unknown[]): LoadedFixture {
  return { pathway: { steps } } as unknown as LoadedFixture;
}

// Narrowed rather than asserted. `conservationStepIdentity` is typed `Check`, which has
// no `find`; only a `ConservationFamilyCheck` does. This used to compile because tests/
// was never type checked, so the call was reaching a member the type does not declare.
function causesOf(fixture: LoadedFixture): readonly string[] {
  if (!isConservationFamilyCheck(conservationStepIdentity)) {
    throw new Error("conservation-step-identity is no longer a conservation family check");
  }
  return conservationStepIdentity.find(fixture).map((violation) => violation.cause);
}

describe("conservation-step-identity, cause id precision per condition", () => {
  it("a hydride carried on its own bonding pair, mislabelled proton_transfer, reports step_kind_disagrees_with_arrows and nothing else", () => {
    const step = {
      id: "step-1",
      identity: { elementaryStep: "proton_transfer", reactionCenters: ["C1", "C2", "H1"] },
      arrows: [
        {
          id: "a1",
          electrons: 2,
          source: { kind: "bond", bondId: "b1" },
          sink: { kind: "betweenAtoms", atomIds: ["C2", "H1"] },
        },
      ],
      from: {
        id: "s0",
        members: [
          {
            role: "reagent",
            species: {
              id: "donor",
              atoms: [
                { id: "C1", element: "C", implicitHydrogens: 3 },
                { id: "H1", element: "H" },
              ],
              bonds: [{ id: "b1", a: "C1", b: "H1", order: 1 }],
            },
          },
          {
            role: "electrophile",
            species: {
              id: "acceptor",
              atoms: [{ id: "C2", element: "C", formalCharge: 1, implicitHydrogens: 3 }],
              bonds: [],
            },
          },
        ],
      },
      to: {
        id: "s1",
        members: [
          {
            role: "product",
            species: {
              id: "donor",
              atoms: [{ id: "C1", element: "C", formalCharge: 1, implicitHydrogens: 3 }],
              bonds: [],
            },
          },
          {
            role: "product",
            species: {
              id: "acceptor",
              atoms: [
                { id: "C2", element: "C", implicitHydrogens: 3 },
                { id: "H1", element: "H" },
              ],
              bonds: [{ id: "b2", a: "C2", b: "H1", order: 1 }],
            },
          },
        ],
      },
    };

    const causes = causesOf(fixtureOf(step));
    expect(causes).toEqual(["step_kind_disagrees_with_arrows"]);
  });

  it("a bare proton donated by the acceptor, mislabelled hydride_shift, reports step_kind_disagrees_with_arrows and nothing else", () => {
    // The mirror of the case above: the acceptor's own lone pair forms the new bond
    // (donated), which is a proton, but the step claims hydride_shift.
    const step = {
      id: "step-1",
      identity: { elementaryStep: "hydride_shift", reactionCenters: ["O2", "H1"] },
      arrows: [
        {
          id: "a1",
          electrons: 2,
          source: { kind: "lonePair", atomId: "O2" },
          sink: { kind: "betweenAtoms", atomIds: ["O2", "H1"] },
        },
      ],
      from: {
        id: "s0",
        members: [
          {
            role: "acid",
            species: {
              id: "donor",
              atoms: [
                { id: "O1", element: "O", lonePairs: 2 },
                { id: "H1", element: "H" },
              ],
              bonds: [{ id: "b1", a: "O1", b: "H1", order: 1 }],
            },
          },
          {
            role: "base",
            species: {
              id: "acceptor",
              atoms: [{ id: "O2", element: "O", formalCharge: -1, lonePairs: 3 }],
              bonds: [],
            },
          },
        ],
      },
      to: {
        id: "s1",
        members: [
          {
            role: "product",
            species: {
              id: "donor",
              atoms: [{ id: "O1", element: "O", formalCharge: -1, lonePairs: 3 }],
              bonds: [],
            },
          },
          {
            role: "product",
            species: {
              id: "acceptor",
              atoms: [
                { id: "O2", element: "O", lonePairs: 2 },
                { id: "H1", element: "H" },
              ],
              bonds: [{ id: "b2", a: "O2", b: "H1", order: 1 }],
            },
          },
        ],
      },
    };

    const causes = causesOf(fixtureOf(step));
    expect(causes).toEqual(["step_kind_disagrees_with_arrows"]);
  });

  it("a fishhook in a step declared proton_transfer reports radical_arrow_used_in_polar_step, never step_kind_disagrees_with_arrows", () => {
    const step = {
      id: "step-1",
      identity: { elementaryStep: "proton_transfer", reactionCenters: ["A1", "H1"] },
      arrows: [
        {
          id: "a1",
          electrons: 1,
          source: { kind: "singleElectron", atomId: "A1" },
          sink: { kind: "atom", atomId: "H1" },
        },
      ],
      from: {
        id: "s0",
        members: [
          {
            role: "reagent",
            species: {
              id: "radical",
              atoms: [{ id: "A1", element: "C", unpairedElectrons: 1, implicitHydrogens: 3 }],
              bonds: [],
            },
          },
          {
            role: "reagent",
            species: { id: "hbearer", atoms: [{ id: "H1", element: "H" }], bonds: [] },
          },
        ],
      },
      to: {
        id: "s1",
        members: [
          {
            role: "product",
            species: {
              id: "radical",
              atoms: [
                { id: "A1", element: "C", implicitHydrogens: 3 },
                { id: "H1", element: "H" },
              ],
              bonds: [{ id: "b1", a: "A1", b: "H1", order: 1 }],
            },
          },
        ],
      },
    };

    const causes = causesOf(fixtureOf(step));
    expect(causes).toEqual(["radical_arrow_used_in_polar_step"]);
  });

  it("bond_homolysis drawn with only paired arrows reports step_kind_disagrees_with_arrows, never radical_arrow_used_in_polar_step", () => {
    const step = {
      id: "step-1",
      identity: { elementaryStep: "bond_homolysis", reactionCenters: ["A1", "B1"] },
      arrows: [
        { id: "a1", electrons: 2, source: { kind: "bond", bondId: "b1" }, sink: { kind: "atom", atomId: "A1" } },
      ],
      from: {
        id: "s0",
        members: [
          {
            role: "reagent",
            species: {
              id: "diatomic",
              atoms: [
                { id: "A1", element: "Br", lonePairs: 3 },
                { id: "B1", element: "Br", lonePairs: 3 },
              ],
              bonds: [{ id: "b1", a: "A1", b: "B1", order: 1 }],
            },
          },
        ],
      },
      to: {
        id: "s1",
        members: [
          {
            role: "product",
            species: { id: "radical-a", atoms: [{ id: "A1", element: "Br", lonePairs: 4, formalCharge: -1 }], bonds: [] },
          },
          {
            role: "product",
            species: { id: "radical-b", atoms: [{ id: "B1", element: "Br", lonePairs: 3, unpairedElectrons: 1, formalCharge: 1 }], bonds: [] },
          },
        ],
      },
    };

    const causes = causesOf(fixtureOf(step));
    expect(causes).toEqual(["step_kind_disagrees_with_arrows"]);
  });

  it("a proton_transfer that also expels a heavy leaving group reports step_kind_disagrees_with_arrows, never reaction_center_not_touched_by_any_arrow", () => {
    const step = {
      id: "step-1",
      identity: { elementaryStep: "proton_transfer", reactionCenters: ["Cb", "Ca", "LG", "H1"] },
      arrows: [
        {
          id: "a1",
          electrons: 2,
          source: { kind: "lonePair", atomId: "Base" },
          sink: { kind: "betweenAtoms", atomIds: ["Base", "H1"] },
        },
        {
          id: "a2",
          electrons: 2,
          source: { kind: "bond", bondId: "bpi" },
          sink: { kind: "betweenAtoms", atomIds: ["Cb", "Ca"] },
        },
        {
          id: "a3",
          electrons: 2,
          source: { kind: "bond", bondId: "blg" },
          sink: { kind: "atom", atomId: "LG" },
        },
      ],
      from: {
        id: "s0",
        members: [
          {
            role: "substrate",
            species: {
              id: "substrate",
              atoms: [
                { id: "Cb", element: "C", implicitHydrogens: 2 },
                { id: "H1", element: "H" },
                { id: "Ca", element: "C", implicitHydrogens: 1 },
                { id: "LG", element: "Br", lonePairs: 3 },
              ],
              bonds: [
                { id: "bch", a: "Cb", b: "H1", order: 1 },
                { id: "bpi", a: "Cb", b: "Ca", order: 1 },
                { id: "blg", a: "Ca", b: "LG", order: 1 },
              ],
            },
          },
          {
            role: "base",
            species: { id: "base", atoms: [{ id: "Base", element: "O", formalCharge: -1, lonePairs: 3 }], bonds: [] },
          },
        ],
      },
      to: {
        id: "s1",
        members: [
          {
            role: "product",
            species: {
              id: "alkene",
              atoms: [
                { id: "Cb", element: "C", implicitHydrogens: 1 },
                { id: "Ca", element: "C", implicitHydrogens: 1 },
              ],
              bonds: [{ id: "bpi2", a: "Cb", b: "Ca", order: 2 }],
            },
          },
          {
            role: "leaving_group",
            species: { id: "bromide", atoms: [{ id: "LG", element: "Br", formalCharge: -1, lonePairs: 4 }], bonds: [] },
          },
          {
            role: "product",
            species: {
              id: "conjugate-acid",
              atoms: [
                { id: "Base", element: "O", lonePairs: 2 },
                { id: "H1", element: "H" },
              ],
              bonds: [{ id: "bnew", a: "Base", b: "H1", order: 1 }],
            },
          },
        ],
      },
    };

    const causes = causesOf(fixtureOf(step));
    expect(causes).toEqual(["step_kind_disagrees_with_arrows"]);
  });

  it("a declared reaction centre no arrow touches reports reaction_center_not_touched_by_any_arrow, and a correctly grounded step reports nothing", () => {
    const arrows = [
      {
        id: "a1",
        electrons: 2,
        source: { kind: "lonePair", atomId: "Nu" },
        sink: { kind: "betweenAtoms", atomIds: ["Nu", "C1"] },
      },
      { id: "a2", electrons: 2, source: { kind: "bond", bondId: "b1" }, sink: { kind: "atom", atomId: "LG" } },
    ];
    const from = {
      id: "s0",
      members: [
        {
          role: "substrate",
          species: {
            id: "substrate",
            atoms: [
              { id: "C1", element: "C", implicitHydrogens: 3 },
              { id: "LG", element: "Br", lonePairs: 3 },
              { id: "Bystander", element: "C", implicitHydrogens: 4 },
            ],
            bonds: [{ id: "b1", a: "C1", b: "LG", order: 1 }],
          },
        },
        {
          role: "nucleophile",
          species: { id: "nucleophile", atoms: [{ id: "Nu", element: "O", formalCharge: -1, lonePairs: 3 }], bonds: [] },
        },
      ],
    };
    const to = {
      id: "s1",
      members: [
        {
          role: "product",
          species: {
            id: "product",
            atoms: [
              { id: "C1", element: "C", implicitHydrogens: 3 },
              { id: "Nu", element: "O", lonePairs: 2 },
            ],
            bonds: [{ id: "b2", a: "C1", b: "Nu", order: 1 }],
          },
        },
        {
          role: "leaving_group",
          species: { id: "leaving-group", atoms: [{ id: "LG", element: "Br", formalCharge: -1, lonePairs: 4 }], bonds: [] },
        },
      ],
    };

    const ungroundedStep = {
      id: "step-1",
      identity: { elementaryStep: "concerted_substitution", reactionCenters: ["C1", "Bystander"] },
      arrows,
      from,
      to,
    };
    const ungroundedCauses = causesOf(fixtureOf(ungroundedStep));
    expect(ungroundedCauses).toEqual(["reaction_center_not_touched_by_any_arrow"]);

    const groundedStep = {
      id: "step-1",
      identity: { elementaryStep: "concerted_substitution", reactionCenters: ["C1", "LG"] },
      arrows,
      from,
      to,
    };
    expect(causesOf(fixtureOf(groundedStep))).toEqual([]);
  });

  it("a step whose arrow references do not resolve stands down entirely rather than reporting a grounding failure on a smaller-than-truth touched set", () => {
    const step = {
      id: "step-1",
      identity: { elementaryStep: "concerted_substitution", reactionCenters: ["C1", "Nu"] },
      arrows: [
        {
          id: "a1",
          electrons: 2,
          source: { kind: "lonePair", atomId: "Nu" },
          sink: { kind: "betweenAtoms", atomIds: ["Nu", "C1"] },
        },
        {
          // Names a bond that is not in the from state at all.
          id: "a2",
          electrons: 2,
          source: { kind: "bond", bondId: "does-not-exist" },
          sink: { kind: "atom", atomId: "LG" },
        },
      ],
      from: {
        id: "s0",
        members: [
          {
            role: "substrate",
            species: {
              id: "substrate",
              atoms: [
                { id: "C1", element: "C", implicitHydrogens: 3 },
                { id: "LG", element: "Br", lonePairs: 3 },
              ],
              bonds: [],
            },
          },
          {
            role: "nucleophile",
            species: { id: "nucleophile", atoms: [{ id: "Nu", element: "O", formalCharge: -1, lonePairs: 3 }], bonds: [] },
          },
        ],
      },
      to: {
        id: "s1",
        members: [
          {
            role: "product",
            species: {
              id: "product",
              atoms: [
                { id: "C1", element: "C", implicitHydrogens: 3 },
                { id: "Nu", element: "O", lonePairs: 2 },
              ],
              bonds: [{ id: "b2", a: "C1", b: "Nu", order: 1 }],
            },
          },
        ],
      },
    };

    // LG is a declared reaction centre that arrow a2 fails to resolve to, so a completeness
    // check reading only the resolved arrows would see LG as untouched and misreport a
    // grounding failure that is really a dangling reference. The documented behaviour is to
    // stand down entirely on this step: conservation-arrow-legality owns the dangling
    // reference and reports it with a better message.
    expect(causesOf(fixtureOf(step))).toEqual([]);
  });
});
