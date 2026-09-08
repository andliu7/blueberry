import { describe, expect, it } from "vitest";

import { createSpecies } from "../src/species.ts";
import {
  bondsAt,
  connectedComponentCount,
  danglingBondIds,
  findAtom,
  findBond,
  findBondBetween,
  neighborIds,
  requireAtom,
  requireBond,
} from "../src/species.ts";
import { atom, bond, chloromethane, species } from "./helpers.ts";

const ethanol = () => species(
  "sp-ethanol",
  [
    atom("c1", "C", { implicitHydrogens: 3 }),
    atom("c2", "C", { implicitHydrogens: 2 }),
    atom("o1", "O", { lonePairs: 2, implicitHydrogens: 1 }),
  ],
  [bond("b1", "c1", "c2"), bond("b2", "c2", "o1")],
);

describe("createSpecies", () => {
  it("defaults bonds to an empty list, because a lone ion has none", () => {
    const built = createSpecies({ id: "sp", atoms: [atom("na1", "Na", { formalCharge: 1 })] });
    expect(built.bonds).toEqual([]);
  });

  it("omits label and declaredTorsions rather than storing undefined", () => {
    const built = createSpecies({ id: "sp", atoms: [] });
    expect("label" in built).toBe(false);
    expect("declaredTorsions" in built).toBe(false);
  });

  it("keeps a label and declared torsions when given", () => {
    const built = createSpecies({
      id: "sp",
      label: "ethanol",
      atoms: ethanol().atoms,
      bonds: ethanol().bonds,
      declaredTorsions: [
        {
          atoms: ["c1", "c2", "o1", "c1"],
          degrees: 180,
          justification: "anti periplanar, from the authored conformer",
        },
      ],
    });
    expect(built.label).toBe("ethanol");
    expect(built.declaredTorsions).toHaveLength(1);
    expect(built.declaredTorsions?.[0]?.degrees).toBe(180);
  });

  it("copies the atom and bond lists rather than aliasing them", () => {
    const atoms = [atom("c1", "C")];
    const bonds: ReturnType<typeof bond>[] = [];
    const built = createSpecies({ id: "sp", atoms, bonds });
    atoms.length = 0;
    expect(built.atoms).toHaveLength(1);
    expect(Object.isFrozen(built.atoms)).toBe(true);
    expect(Object.isFrozen(built.bonds)).toBe(true);
  });

  it("does not enforce connectivity at construction", () => {
    // Deliberate, and the reason connectedComponentCount exists as a separate function:
    // a constructor that threw would make the broken fixture unbuildable, and a check
    // that can never be shown to fail is not evidence.
    const twoFragments = species("sp", [atom("c1", "C"), atom("c2", "C")]);
    expect(twoFragments.atoms).toHaveLength(2);
    expect(connectedComponentCount(twoFragments)).toBe(2);
  });
});

describe("finding atoms and bonds", () => {
  it("finds an atom by id and returns undefined when there is none", () => {
    expect(findAtom(ethanol(), "o1")?.element).toBe("O");
    expect(findAtom(ethanol(), "n1")).toBeUndefined();
  });

  it("throws from requireAtom, naming both the species and the atom", () => {
    expect(requireAtom(ethanol(), "c2").id).toBe("c2");
    expect(() => requireAtom(ethanol(), "n1")).toThrow(/sp-ethanol/);
    expect(() => requireAtom(ethanol(), "n1")).toThrow(/n1/);
  });

  it("finds a bond by id and returns undefined when there is none", () => {
    expect(findBond(ethanol(), "b2")?.order).toBe(1);
    expect(findBond(ethanol(), "b9")).toBeUndefined();
  });

  it("throws from requireBond, naming both the species and the bond", () => {
    expect(requireBond(ethanol(), "b1").id).toBe("b1");
    expect(() => requireBond(ethanol(), "b9")).toThrow(/sp-ethanol/);
    expect(() => requireBond(ethanol(), "b9")).toThrow(/b9/);
  });
});

describe("findBondBetween", () => {
  it("finds the bond whichever way round the two atoms are named", () => {
    expect(findBondBetween(ethanol(), "c2", "o1")?.id).toBe("b2");
    expect(findBondBetween(ethanol(), "o1", "c2")?.id).toBe("b2");
  });

  it("is undefined for two atoms that are not bonded", () => {
    expect(findBondBetween(ethanol(), "c1", "o1")).toBeUndefined();
  });

  it("is undefined for an atom that is not in the species", () => {
    expect(findBondBetween(ethanol(), "c1", "n1")).toBeUndefined();
  });
});

describe("bondsAt and neighborIds", () => {
  it("returns every bond touching an atom", () => {
    expect(bondsAt(ethanol(), "c2").map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(bondsAt(ethanol(), "c1").map((b) => b.id)).toEqual(["b1"]);
  });

  it("is empty for an atom with no bonds", () => {
    expect(bondsAt(species("sp", [atom("na1", "Na")]), "na1")).toEqual([]);
  });

  it("names the far end of every bond, never the atom itself", () => {
    expect(neighborIds(ethanol(), "c2")).toEqual(["c1", "o1"]);
    expect(neighborIds(ethanol(), "o1")).toEqual(["c2"]);
    expect(neighborIds(ethanol(), "c2")).not.toContain("c2");
  });

  it("does not include implicit hydrogens, which have no id", () => {
    expect(neighborIds(chloromethane(), "c1")).toEqual(["cl1"]);
  });
});

describe("danglingBondIds", () => {
  it("is empty for a well formed species", () => {
    expect(danglingBondIds(ethanol())).toEqual([]);
  });

  it("names a bond whose first end is missing", () => {
    const broken = species("sp", [atom("c1", "C")], [bond("b1", "ghost", "c1")]);
    expect(danglingBondIds(broken)).toEqual(["b1"]);
  });

  it("names a bond whose second end is missing", () => {
    const broken = species("sp", [atom("c1", "C")], [bond("b1", "c1", "ghost")]);
    expect(danglingBondIds(broken)).toEqual(["b1"]);
  });

  it("names every dangling bond, not just the first", () => {
    const broken = species(
      "sp",
      [atom("c1", "C")],
      [bond("b1", "c1", "ghost"), bond("b2", "other", "c1")],
    );
    expect(danglingBondIds(broken)).toEqual(["b1", "b2"]);
  });
});

describe("connectedComponentCount", () => {
  it("is zero for a species with no atoms", () => {
    expect(connectedComponentCount(species("sp", []))).toBe(0);
  });

  it("is one for a single unbonded atom", () => {
    expect(connectedComponentCount(species("sp", [atom("na1", "Na")]))).toBe(1);
  });

  it("is one for a connected molecule", () => {
    expect(connectedComponentCount(ethanol())).toBe(1);
  });

  it("counts each disconnected fragment", () => {
    const packed = species(
      "sp",
      [atom("c1", "C"), atom("c2", "C"), atom("na1", "Na")],
      [bond("b1", "c1", "c2")],
    );
    expect(connectedComponentCount(packed)).toBe(2);
  });

  it("walks through a chain rather than only counting direct neighbours", () => {
    // A traversal that stopped at depth one would report four fragments here.
    const chain = species(
      "sp",
      [atom("c1", "C"), atom("c2", "C"), atom("c3", "C"), atom("c4", "C")],
      [bond("b1", "c1", "c2"), bond("b2", "c2", "c3"), bond("b3", "c3", "c4")],
    );
    expect(connectedComponentCount(chain)).toBe(1);
  });

  it("traverses a bond in both directions", () => {
    // The adjacency map is filled from both ends. Filling it from one would make the
    // count depend on the order the atoms happen to be listed in.
    const reversed = species(
      "sp",
      [atom("c1", "C"), atom("c2", "C")],
      [bond("b1", "c2", "c1")],
    );
    expect(connectedComponentCount(reversed)).toBe(1);
  });

  it("does not loop forever on a ring", () => {
    const cyclopropane = species(
      "sp",
      [
        atom("c1", "C", { implicitHydrogens: 2 }),
        atom("c2", "C", { implicitHydrogens: 2 }),
        atom("c3", "C", { implicitHydrogens: 2 }),
      ],
      [bond("b1", "c1", "c2"), bond("b2", "c2", "c3"), bond("b3", "c3", "c1")],
    );
    expect(connectedComponentCount(cyclopropane)).toBe(1);
  });

  it("ignores a bond naming an atom the species does not have", () => {
    const broken = species("sp", [atom("c1", "C")], [bond("b1", "c1", "ghost")]);
    expect(connectedComponentCount(broken)).toBe(1);
  });
});
