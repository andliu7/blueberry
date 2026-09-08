import { describe, expect, it } from "vitest";

import {
  atomNuclideKey,
  createAtom,
  nonbondingElectrons,
  nuclideKey,
  type TetrahedralStereo,
} from "../src/atom.ts";
import { IMPLICIT_HYDROGEN } from "../src/ids.ts";

describe("createAtom", () => {
  it("fills every count with zero rather than leaving it undefined", () => {
    const built = createAtom({ id: "c1", element: "C" });
    expect(built.formalCharge).toBe(0);
    expect(built.lonePairs).toBe(0);
    expect(built.unpairedElectrons).toBe(0);
    expect(built.implicitHydrogens).toBe(0);
  });

  it("keeps the values it was given", () => {
    const built = createAtom({
      id: "o1",
      element: "O",
      formalCharge: -1,
      lonePairs: 3,
      unpairedElectrons: 0,
      implicitHydrogens: 1,
    });
    expect(built.id).toBe("o1");
    expect(built.element).toBe("O");
    expect(built.formalCharge).toBe(-1);
    expect(built.lonePairs).toBe(3);
    expect(built.implicitHydrogens).toBe(1);
  });

  it("distinguishes an absent optional field from one set to undefined", () => {
    // exactOptionalPropertyTypes is on, and the whole reason the constructor spreads
    // conditionally instead of assigning. A field present and undefined survives
    // JSON round trips differently and reads as "declared, empty" rather than "absent".
    const plain = createAtom({ id: "c1", element: "C" });
    expect("isotope" in plain).toBe(false);
    expect("stereo" in plain).toBe(false);
    expect("geometry" in plain).toBe(false);
  });

  it("carries an isotope when one is given, so deuterium is not a separate element", () => {
    const deuterium = createAtom({ id: "h1", element: "H", isotope: 2 });
    expect(deuterium.element).toBe("H");
    expect(deuterium.isotope).toBe(2);
  });

  it("carries geometry and stereo through untouched", () => {
    const stereo: TetrahedralStereo = {
      kind: "tetrahedral",
      neighbors: ["a", "b", "c", IMPLICIT_HYDROGEN],
      parity: "clockwise",
    };
    const built = createAtom({
      id: "c1",
      element: "C",
      stereo,
      geometry: { x: 1, y: 2, z: 3 },
    });
    expect(built.stereo).toEqual(stereo);
    expect(built.geometry).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("freezes the result, because readonly disappears at runtime", () => {
    const built = createAtom({ id: "c1", element: "C" });
    expect(Object.isFrozen(built)).toBe(true);
  });
});

describe("nonbondingElectrons", () => {
  it("counts a lone pair as two electrons", () => {
    expect(nonbondingElectrons(createAtom({ id: "o1", element: "O", lonePairs: 3 }))).toBe(6);
    expect(nonbondingElectrons(createAtom({ id: "o1", element: "O", lonePairs: 2 }))).toBe(4);
  });

  it("counts an unpaired electron as one", () => {
    expect(
      nonbondingElectrons(createAtom({ id: "c1", element: "C", unpairedElectrons: 1 })),
    ).toBe(1);
  });

  it("adds the two rather than taking whichever is larger", () => {
    // A bromine radical has three lone pairs and one unpaired electron: seven electrons,
    // not six and not one.
    const bromineRadical = createAtom({
      id: "br1",
      element: "Br",
      lonePairs: 3,
      unpairedElectrons: 1,
    });
    expect(nonbondingElectrons(bromineRadical)).toBe(7);
  });

  it("is zero for a closed shell atom with no lone pairs", () => {
    expect(nonbondingElectrons(createAtom({ id: "c1", element: "C" }))).toBe(0);
  });
});

describe("nuclide keys", () => {
  it("is the bare symbol at natural abundance", () => {
    expect(nuclideKey("C")).toBe("C");
    expect(nuclideKey("H")).toBe("H");
  });

  it("brackets the mass number when the atom is labelled", () => {
    expect(nuclideKey("H", 2)).toBe("[2H]");
    expect(nuclideKey("C", 13)).toBe("[13C]");
  });

  it("keeps a labelled nuclide distinct from its unlabelled element", () => {
    // Mass is conserved as a multiset of these keys. If deuterium and protium shared a
    // key, an isotope label could be lost across a step and mass would still balance,
    // which deletes every labelling experiment in the corpus.
    expect(nuclideKey("H", 2)).not.toBe(nuclideKey("H"));
    expect(nuclideKey("C", 13)).not.toBe(nuclideKey("C"));
  });

  it("reads the key off an atom the same way", () => {
    expect(atomNuclideKey(createAtom({ id: "c1", element: "C" }))).toBe("C");
    expect(atomNuclideKey(createAtom({ id: "h1", element: "H", isotope: 2 }))).toBe("[2H]");
  });
});
