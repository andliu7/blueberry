import { describe, expect, it } from "vitest";

import {
  createArrow,
  fromBond,
  fromLonePair,
  fromSingleElectron,
  toAtom,
  toBondBetween,
} from "../src/arrows.ts";
import { atomPairKey, parseAtomPairKey } from "../src/bond.ts";
import { withAtomPatch, withoutMember } from "../src/edit.ts";
import { arrowLegalityFindings } from "../src/legality.ts";
import { connectedComponentCount } from "../src/species.ts";
import { createState, type SpectatorDeclaration } from "../src/state.ts";
import { atom, bond, chloromethane, hydroxide, member, species, state } from "./helpers.ts";

/**
 * Behaviour that nothing else in the suite asserted.
 *
 * Every case here was found by a surviving mutant, and each is written as the smallest
 * input that tells the two behaviours apart. They are grouped in one file because what
 * they have in common is how they were found, not what they are about.
 */

describe("a capacity finding names only the arrows that drew from THAT kind of source", () => {
  // An atom can carry a lone pair and an unpaired electron at once. A filter that only
  // matched on the atom id would fold a fishhook into a lone pair overdraw and send the
  // reader to an arrow that took nothing from the pair.
  const mixed = () =>
    state("st", [
      member(
        species("sp", [
          atom("o1", "O", { lonePairs: 1, unpairedElectrons: 1 }),
          atom("c1", "C"),
          atom("c2", "C"),
          atom("c3", "C"),
        ]),
      ),
    ]);

  it("keeps a fishhook out of a lone pair overdraw at the same atom", () => {
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
        createArrow({ id: "a2", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
        createArrow({
          id: "a3",
          source: fromSingleElectron("o1"),
          sink: toBondBetween("o1", "c3"),
          electrons: 1,
        }),
      ],
      mixed(),
    );
    expect(findings.find((f) => f.rule === "lone_pairs_overdrawn")?.arrowId).toBe("a1 + a2");
  });

  it("keeps a lone pair arrow out of an unpaired electron overdraw at the same atom", () => {
    const findings = arrowLegalityFindings(
      [
        createArrow({
          id: "a1",
          source: fromSingleElectron("o1"),
          sink: toBondBetween("o1", "c1"),
          electrons: 1,
        }),
        createArrow({
          id: "a2",
          source: fromSingleElectron("o1"),
          sink: toBondBetween("o1", "c2"),
          electrons: 1,
        }),
        createArrow({ id: "a3", source: fromLonePair("o1"), sink: toBondBetween("o1", "c3") }),
      ],
      mixed(),
    );
    expect(findings.find((f) => f.rule === "unpaired_electrons_overdrawn")?.arrowId).toBe(
      "a1 + a2",
    );
  });
});

describe("an adjacency message lists both atoms of a bond source", () => {
  it("separates the two source atoms so the pivot that is missing is readable", () => {
    const branched = state("st", [
      member(
        species(
          "sp",
          [
            atom("c1", "C", { implicitHydrogens: 1 }),
            atom("c2", "C", { implicitHydrogens: 3 }),
            atom("c3", "C", { implicitHydrogens: 3 }),
          ],
          [bond("b1", "c1", "c2"), bond("b2", "c1", "c3")],
        ),
      ),
    ]);
    const finding = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromBond("b1"), sink: toAtom("c3") })],
      branched,
    )[0];
    expect(finding?.expected).toContain("the source site {c1, c2}");
    expect(finding?.expected).toContain("the sink site {c3}");
  });
});

describe("withoutMember withdraws only the departing species' own declaration", () => {
  it("keeps a spectator declaration about a species that is staying", () => {
    const declaration: SpectatorDeclaration = {
      speciesId: "sp-chloromethane",
      reason: "authored_simplification",
      justification: "outside the scope of this question",
      declaredBy: "test",
    };
    const both = createState({
      id: "st",
      members: [member(chloromethane(), "substrate"), member(hydroxide(), "nucleophile")],
      spectators: [declaration],
    });
    const shrunk = withoutMember(both, "sp-hydroxide");
    expect(shrunk.members.map((m) => m.species.id)).toEqual(["sp-chloromethane"]);
    expect(shrunk.spectators.map((d) => d.speciesId)).toEqual(["sp-chloromethane"]);
  });
});

describe("a patch that raises a count from zero still applies", () => {
  it("turns a closed shell atom into a radical", () => {
    // Homolysis writes an unpaired electron onto an atom that had none. `?? ` keeps the
    // patched 1; a truthiness test would read the atom's 0 and silently do nothing.
    const closedShell = species("sp", [atom("br1", "Br", { lonePairs: 3 })]);
    const radical = withAtomPatch(closedShell, "br1", { unpairedElectrons: 1 });
    expect(radical.atoms[0]?.unpairedElectrons).toBe(1);
  });

  it("adds a lone pair to an atom that had none", () => {
    const carbanion = withAtomPatch(chloromethane(), "c1", { lonePairs: 1, formalCharge: -1 });
    expect(carbanion.atoms.find((a) => a.id === "c1")?.lonePairs).toBe(1);
  });

  it("adds an implicit hydrogen to an atom that had none", () => {
    const protonated = withAtomPatch(chloromethane(), "cl1", { implicitHydrogens: 1 });
    expect(protonated.atoms.find((a) => a.id === "cl1")?.implicitHydrogens).toBe(1);
  });
});

describe("connectedComponentCount survives a dangling bond at either end", () => {
  it("ignores a bond whose first named atom is missing", () => {
    const broken = species("sp", [atom("c1", "C")], [bond("b1", "ghost", "c1")]);
    expect(connectedComponentCount(broken)).toBe(1);
  });

  it("ignores a bond whose second named atom is missing", () => {
    const broken = species("sp", [atom("c1", "C")], [bond("b1", "c1", "ghost")]);
    expect(connectedComponentCount(broken)).toBe(1);
  });

  it("ignores a bond with neither atom present", () => {
    const broken = species("sp", [atom("c1", "C")], [bond("b1", "gx", "gy")]);
    expect(connectedComponentCount(broken)).toBe(1);
  });
});

describe("atom pair keys round trip for any pair of ids", () => {
  it("round trips ids that sort either way", () => {
    for (const [a, b] of [
      ["c1", "cl1"],
      ["cl1", "c1"],
      ["a", "b"],
      ["b", "a"],
    ] as const) {
      expect(parseAtomPairKey(atomPairKey(a, b))).toEqual([a, b].sort());
    }
  });

  it("round trips a pair whose first id is empty", () => {
    // Not a chemistry case. It is the boundary of the separator search: an empty first id
    // puts the separator at index 0, and a guard written as `<= 0` would reject a key the
    // key builder itself produced.
    expect(parseAtomPairKey(atomPairKey("", "b"))).toEqual(["", "b"]);
  });
});
