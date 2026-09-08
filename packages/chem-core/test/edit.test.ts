import { describe, expect, it } from "vitest";

import { createAtom, type TetrahedralStereo } from "../src/atom.ts";
import { createBond, type DoubleBondStereo } from "../src/bond.ts";
import { createState, type SpectatorDeclaration } from "../src/state.ts";
import {
  copyStateAs,
  declareSpectator,
  withAddedAtom,
  withAddedBond,
  withAtomPatch,
  withBondOrder,
  withBondStereo,
  withMember,
  withReplacedSpecies,
  withdrawSpectator,
  withoutAtom,
  withoutBond,
  withoutMember,
} from "../src/edit.ts";
import { atom, bond, chloromethane, hydroxide, member, species, state } from "./helpers.ts";

const stereo: TetrahedralStereo = {
  kind: "tetrahedral",
  neighbors: ["cl1", "h1", "h2", "h3"],
  parity: "clockwise",
};

const labelled = () => species(
  "sp-labelled",
  [
    createAtom({
      id: "c1",
      element: "C",
      implicitHydrogens: 3,
      isotope: 13,
      stereo,
      geometry: { x: 0, y: 0, z: 0 },
    }),
    atom("cl1", "Cl", { lonePairs: 3 }),
  ],
  [bond("b1", "c1", "cl1")],
);

describe("withAtomPatch", () => {
  it("changes only the fields the patch names", () => {
    const patched = withAtomPatch(chloromethane(), "cl1", { lonePairs: 4, formalCharge: -1 });
    const chlorine = patched.atoms.find((a) => a.id === "cl1");
    expect(chlorine?.lonePairs).toBe(4);
    expect(chlorine?.formalCharge).toBe(-1);
    expect(chlorine?.implicitHydrogens).toBe(0);
    expect(chlorine?.element).toBe("Cl");
  });

  it("leaves the other atoms alone", () => {
    const patched = withAtomPatch(chloromethane(), "cl1", { lonePairs: 4 });
    expect(patched.atoms.find((a) => a.id === "c1")?.implicitHydrogens).toBe(3);
  });

  it("leaves the input species untouched", () => {
    // The rule the whole file exists for: if a step mutated its input, the before
    // picture would be gone by the time anything wanted to compare against it.
    const original = chloromethane();
    withAtomPatch(original, "cl1", { lonePairs: 4 });
    expect(original.atoms.find((a) => a.id === "cl1")?.lonePairs).toBe(3);
  });

  it("keeps an unpatched optional field rather than dropping it", () => {
    const patched = withAtomPatch(labelled(), "c1", { formalCharge: 1 });
    const carbon = patched.atoms.find((a) => a.id === "c1");
    expect(carbon?.isotope).toBe(13);
    expect(carbon?.stereo).toEqual(stereo);
    expect(carbon?.geometry).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("clears a field named in the clear list", () => {
    // An SN1 ionisation destroys the stereocenter. There is no way to say "set this to
    // absent" with a patch whose absent field already means "leave alone".
    const cleared = withAtomPatch(labelled(), "c1", {}, ["stereo"]);
    const carbon = cleared.atoms.find((a) => a.id === "c1");
    expect("stereo" in (carbon ?? {})).toBe(false);
    expect(carbon?.isotope).toBe(13);
  });

  it("clears every field named, and only those", () => {
    const cleared = withAtomPatch(labelled(), "c1", {}, ["isotope", "geometry"]);
    const carbon = cleared.atoms.find((a) => a.id === "c1");
    expect("isotope" in (carbon ?? {})).toBe(false);
    expect("geometry" in (carbon ?? {})).toBe(false);
    expect(carbon?.stereo).toEqual(stereo);
  });

  it("lets a clear win over a patch that sets the same field", () => {
    const cleared = withAtomPatch(labelled(), "c1", { isotope: 14 }, ["isotope"]);
    expect("isotope" in (cleared.atoms.find((a) => a.id === "c1") ?? {})).toBe(false);
  });

  it("keeps the species label and declared torsions", () => {
    const withLabel = species("sp", [atom("c1", "C")]);
    const named = { ...withLabel, label: "methane" };
    expect(withAtomPatch(named, "c1", { formalCharge: 1 }).label).toBe("methane");
  });

  it("throws for an atom the species does not have", () => {
    expect(() => withAtomPatch(chloromethane(), "n1", {})).toThrow(/n1/);
  });

  it("freezes the atom it produced", () => {
    const patched = withAtomPatch(chloromethane(), "cl1", { lonePairs: 4 });
    expect(Object.isFrozen(patched.atoms.find((a) => a.id === "cl1"))).toBe(true);
    expect(Object.isFrozen(patched)).toBe(true);
  });
});

describe("withAddedAtom and withoutAtom", () => {
  it("appends the atom", () => {
    const grown = withAddedAtom(chloromethane(), atom("na1", "Na", { formalCharge: 1 }));
    expect(grown.atoms.map((a) => a.id)).toEqual(["c1", "cl1", "na1"]);
  });

  it("refuses an id the species already carries", () => {
    expect(() => withAddedAtom(chloromethane(), atom("c1", "C"))).toThrow(/c1/);
  });

  it("removes the atom and every bond touching it", () => {
    // A dangling bond makes every downstream count wrong in a way that reads as a
    // chemistry error rather than a data error.
    const shrunk = withoutAtom(chloromethane(), "cl1");
    expect(shrunk.atoms.map((a) => a.id)).toEqual(["c1"]);
    expect(shrunk.bonds).toEqual([]);
  });

  it("removes a bond whichever end names the departing atom", () => {
    const reversed = species(
      "sp",
      [atom("c1", "C"), atom("cl1", "Cl")],
      [bond("b1", "cl1", "c1")],
    );
    expect(withoutAtom(reversed, "cl1").bonds).toEqual([]);
  });

  it("keeps bonds that do not touch the departing atom", () => {
    const chain = species(
      "sp",
      [atom("c1", "C"), atom("c2", "C"), atom("cl1", "Cl")],
      [bond("b1", "c1", "c2"), bond("b2", "c2", "cl1")],
    );
    expect(withoutAtom(chain, "cl1").bonds.map((b) => b.id)).toEqual(["b1"]);
  });

  it("is a no op for an atom that is not there", () => {
    const same = withoutAtom(chloromethane(), "n1");
    expect(same.atoms).toHaveLength(2);
    expect(same.bonds).toHaveLength(1);
  });
});

describe("withAddedBond and withoutBond", () => {
  it("appends the bond", () => {
    const grown = withAddedBond(
      species("sp", [atom("c1", "C"), atom("o1", "O")]),
      bond("b1", "c1", "o1"),
    );
    expect(grown.bonds.map((b) => b.id)).toEqual(["b1"]);
  });

  it("refuses a bond id the species already carries", () => {
    expect(() => withAddedBond(chloromethane(), bond("b1", "c1", "cl1"))).toThrow(/b1/);
  });

  it("removes the named bond and leaves the atoms alone", () => {
    const cut = withoutBond(chloromethane(), "b1");
    expect(cut.bonds).toEqual([]);
    expect(cut.atoms).toHaveLength(2);
  });

  it("is a no op for a bond that is not there", () => {
    expect(withoutBond(chloromethane(), "b9").bonds).toHaveLength(1);
  });
});

describe("withBondOrder", () => {
  it("changes the order and keeps the ends", () => {
    const raised = withBondOrder(chloromethane(), "b1", 2);
    const target = raised.bonds[0];
    expect(target?.order).toBe(2);
    expect(target?.a).toBe("c1");
    expect(target?.b).toBe("cl1");
    expect(target?.id).toBe("b1");
  });

  it("will happily give carbon five bonds, because deciding legality is not its job", () => {
    // Deliberate. An adversary has to be able to build a broken fixture, and a
    // constructor that refused would mean the valence check could never be shown to
    // fail on input that deserves it.
    const overloaded = withBondOrder(chloromethane(), "b1", 3);
    expect(overloaded.bonds[0]?.order).toBe(3);
  });

  it("keeps bond stereo through an order change", () => {
    const doubleStereo: DoubleBondStereo = {
      kind: "doubleBond",
      reference: ["c1", "c4"],
      arrangement: "trans",
    };
    const alkene = () => species(
      "sp",
      [atom("c2", "C"), atom("c3", "C")],
      [createBond({ id: "b1", a: "c2", b: "c3", order: 2, stereo: doubleStereo })],
    );
    expect(withBondOrder(alkene(), "b1", 1).bonds[0]?.stereo).toEqual(doubleStereo);
  });

  it("leaves the other bonds alone", () => {
    const chain = species(
      "sp",
      [atom("c1", "C"), atom("c2", "C"), atom("o1", "O")],
      [bond("b1", "c1", "c2"), bond("b2", "c2", "o1")],
    );
    expect(withBondOrder(chain, "b2", 2).bonds.map((b) => b.order)).toEqual([1, 2]);
  });

  it("throws for a bond the species does not have", () => {
    expect(() => withBondOrder(chloromethane(), "b9", 2)).toThrow(/b9/);
  });
});

describe("withBondStereo", () => {
  const doubleStereo: DoubleBondStereo = {
    kind: "doubleBond",
    reference: ["c1", "c4"],
    arrangement: "cis",
  };
  const alkene = () => species(
    "sp",
    [atom("c2", "C"), atom("c3", "C")],
    [bond("b1", "c2", "c3", 2)],
  );

  it("sets stereo on the named bond and keeps the order", () => {
    const stereoed = withBondStereo(alkene(), "b1", doubleStereo);
    expect(stereoed.bonds[0]?.stereo).toEqual(doubleStereo);
    expect(stereoed.bonds[0]?.order).toBe(2);
  });

  it("clears stereo when given undefined, rather than storing undefined", () => {
    const stereoed = withBondStereo(alkene(), "b1", doubleStereo);
    const cleared = withBondStereo(stereoed, "b1", undefined);
    expect("stereo" in (cleared.bonds[0] ?? {})).toBe(false);
  });

  it("throws for a bond the species does not have", () => {
    expect(() => withBondStereo(alkene(), "b9", doubleStereo)).toThrow(/b9/);
  });
});

describe("state edits", () => {
  const base = () => state("st", [member(chloromethane(), "substrate")]);

  it("adds a member and keeps its role", () => {
    const grown = withMember(base(), member(hydroxide(), "nucleophile"));
    expect(grown.members.map((m) => m.species.id)).toEqual(["sp-chloromethane", "sp-hydroxide"]);
    expect(grown.members[1]?.role).toBe("nucleophile");
  });

  it("refuses a species id the state already carries", () => {
    // Multiplicity is repetition with distinct ids, never one id written twice.
    expect(() => withMember(base(), member(chloromethane(), "reagent"))).toThrow(/sp-chloromethane/);
  });

  it("removes a member and any spectator declaration naming it", () => {
    const declaration: SpectatorDeclaration = {
      speciesId: "sp-hydroxide",
      reason: "bulk_medium",
      justification: "not touched by any arrow here",
      declaredBy: "test",
    };
    const both = createState({
      id: "st",
      members: [member(chloromethane()), member(hydroxide())],
      spectators: [declaration],
    });
    const shrunk = withoutMember(both, "sp-hydroxide");
    expect(shrunk.members.map((m) => m.species.id)).toEqual(["sp-chloromethane"]);
    expect(shrunk.spectators).toEqual([]);
  });

  it("is a no op removing a member that is not there", () => {
    expect(withoutMember(base(), "sp-absent").members).toHaveLength(1);
  });

  it("replaces a species in place and keeps its role", () => {
    const replaced = withReplacedSpecies(
      base(),
      species("sp-chloromethane", [atom("c1", "C", { formalCharge: 1, implicitHydrogens: 3 })]),
    );
    expect(replaced.members[0]?.role).toBe("substrate");
    expect(replaced.members[0]?.species.bonds).toEqual([]);
  });

  it("refuses to replace a species that is not present", () => {
    expect(() => withReplacedSpecies(base(), hydroxide())).toThrow(/sp-hydroxide/);
  });

  it("leaves untouched members alone when replacing one", () => {
    const both = state("st", [member(chloromethane()), member(hydroxide(), "nucleophile")]);
    const replaced = withReplacedSpecies(both, species("sp-chloromethane", [atom("c1", "C")]));
    expect(replaced.members[1]?.species.atoms).toHaveLength(1);
    expect(replaced.members[1]?.role).toBe("nucleophile");
  });
});

describe("spectator declarations", () => {
  const declaration: SpectatorDeclaration = {
    speciesId: "sp-chloromethane",
    reason: "authored_simplification",
    justification: "outside the scope of this question",
    declaredBy: "test",
  };
  const base = () => state("st", [member(chloromethane())]);

  it("records the declaration", () => {
    const declared = declareSpectator(base(), declaration);
    expect(declared.spectators).toHaveLength(1);
    expect(declared.spectators[0]?.reason).toBe("authored_simplification");
    expect(Object.isFrozen(declared.spectators[0])).toBe(true);
  });

  it("refuses to declare a species that is not in the state", () => {
    // The record cannot quietly refer to nothing.
    expect(() =>
      declareSpectator(base(), { ...declaration, speciesId: "sp-absent" }),
    ).toThrow(/sp-absent/);
  });

  it("refuses a second declaration for the same species", () => {
    const declared = declareSpectator(base(), declaration);
    expect(() => declareSpectator(declared, declaration)).toThrow(/already/);
  });

  it("withdraws a declaration and leaves the member in place", () => {
    const declared = declareSpectator(base(), declaration);
    const withdrawn = withdrawSpectator(declared, "sp-chloromethane");
    expect(withdrawn.spectators).toEqual([]);
    expect(withdrawn.members).toHaveLength(1);
  });

  it("withdraws only the named species", () => {
    const both = state("st", [member(chloromethane()), member(hydroxide())]);
    const declared = declareSpectator(
      declareSpectator(both, declaration),
      { ...declaration, speciesId: "sp-hydroxide" },
    );
    expect(withdrawSpectator(declared, "sp-hydroxide").spectators.map((d) => d.speciesId)).toEqual([
      "sp-chloromethane",
    ]);
  });

  it("is a no op withdrawing a species that was never declared", () => {
    expect(withdrawSpectator(base(), "sp-chloromethane").spectators).toEqual([]);
  });

  it("leaves the input state untouched", () => {
    declareSpectator(base(), declaration);
    expect(base().spectators).toEqual([]);
  });
});

describe("copyStateAs", () => {
  const declaration: SpectatorDeclaration = {
    speciesId: "sp-chloromethane",
    reason: "inert_solvent",
    justification: "carried through unchanged",
    declaredBy: "test",
  };
  const base = () => declareSpectator(state("st-0", [member(chloromethane())]), declaration);

  it("changes the id and nothing else", () => {
    const original = base();
    const copy = copyStateAs(original, "st-1");
    expect(copy.id).toBe("st-1");
    expect(copy.members).toBe(original.members);
    expect(copy.spectators).toBe(original.spectators);
  });

  it("leaves the original id alone", () => {
    const original = base();
    copyStateAs(original, "st-1");
    expect(original.id).toBe("st-0");
  });

  it("freezes the copy", () => {
    expect(Object.isFrozen(copyStateAs(base(), "st-1"))).toBe(true);
  });
});
