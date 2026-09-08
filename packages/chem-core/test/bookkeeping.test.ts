import { describe, expect, it } from "vitest";

import {
  approximateMass,
  atomKey,
  bondOrderSumAt,
  conservedTotals,
  derivedFormalCharge,
  molecularFormula,
  nuclideCounts,
  nuclideCountsOfMany,
  nuclideDifference,
  speciesCharge,
  valenceElectronCount,
  valenceElectronsAround,
} from "../src/bookkeeping.ts";
import { createState } from "../src/state.ts";
import { atom, bond, chloromethane, hydroxide, member, methane, species, state } from "./helpers.ts";

const acetone = () => species(
  "sp-acetone",
  [
    atom("c1", "C", { implicitHydrogens: 3 }),
    atom("c2", "C"),
    atom("c3", "C", { implicitHydrogens: 3 }),
    atom("o1", "O", { lonePairs: 2 }),
  ],
  [bond("b1", "c1", "c2"), bond("b2", "c2", "c3"), bond("b3", "c2", "o1", 2)],
);

describe("nuclideCounts", () => {
  it("counts implicit hydrogens as real atoms", () => {
    // VERIFICATION.md S5: a proton transfer that changes only implicit hydrogen counts
    // touches no bond, so a mass count walking the explicit atom list reports
    // conservation while a proton has quietly appeared or vanished.
    expect(nuclideCounts(methane())).toEqual({ C: 1, H: 4 });
  });

  it("does not add a hydrogen entry when there are none", () => {
    expect(nuclideCounts(species("sp", [atom("cl1", "Cl", { lonePairs: 4 })]))).toEqual({ Cl: 1 });
  });

  it("sums implicit hydrogens across atoms", () => {
    expect(nuclideCounts(acetone())).toEqual({ C: 3, O: 1, H: 6 });
  });

  it("keys a labelled nuclide separately from its element", () => {
    const labelled = species("sp", [
      atom("c1", "C", { isotope: 13, implicitHydrogens: 1 }),
      atom("c2", "C"),
    ]);
    expect(nuclideCounts(labelled)).toEqual({ "[13C]": 1, C: 1, H: 1 });
  });

  it("is empty for a species with no atoms", () => {
    expect(nuclideCounts(species("sp", []))).toEqual({});
  });
});

describe("nuclideCountsOfMany", () => {
  it("adds the counts of every species rather than replacing them", () => {
    expect(nuclideCountsOfMany([methane("a"), methane("b")])).toEqual({ C: 2, H: 8 });
  });

  it("merges different species into one multiset", () => {
    expect(nuclideCountsOfMany([chloromethane(), hydroxide()])).toEqual({
      C: 1,
      Cl: 1,
      O: 1,
      H: 4,
    });
  });

  it("is empty for an empty list", () => {
    expect(nuclideCountsOfMany([])).toEqual({});
  });
});

describe("nuclideDifference", () => {
  it("is empty when the two multisets match exactly", () => {
    expect(nuclideDifference({ C: 1, H: 4 }, { C: 1, H: 4 })).toEqual({});
  });

  it("reports the signed change, after minus before", () => {
    expect(nuclideDifference({ C: 1, H: 4 }, { C: 1, H: 3 })).toEqual({ H: -1 });
    expect(nuclideDifference({ C: 1, H: 3 }, { C: 1, H: 4 })).toEqual({ H: 1 });
  });

  it("reports a nuclide present on only one side", () => {
    expect(nuclideDifference({ C: 1 }, { C: 1, Cl: 1 })).toEqual({ Cl: 1 });
    expect(nuclideDifference({ C: 1, Cl: 1 }, { C: 1 })).toEqual({ Cl: -1 });
  });

  it("omits keys that did not change, so the difference reads as a diff", () => {
    expect(nuclideDifference({ C: 3, O: 1, H: 6 }, { C: 3, O: 1, H: 7 })).toEqual({ H: 1 });
  });
});

describe("bondOrderSumAt", () => {
  it("counts implicit hydrogens as order one bonds", () => {
    // Forgetting this term makes every methyl group look like a carbanion.
    expect(bondOrderSumAt(methane(), "c1")).toBe(4);
  });

  it("counts a double bond as two", () => {
    expect(bondOrderSumAt(acetone(), "c2")).toBe(4);
    expect(bondOrderSumAt(acetone(), "o1")).toBe(2);
  });

  it("counts explicit bonds and implicit hydrogens together", () => {
    expect(bondOrderSumAt(acetone(), "c1")).toBe(4);
    expect(bondOrderSumAt(chloromethane(), "c1")).toBe(4);
  });

  it("is zero for a bare ion", () => {
    expect(bondOrderSumAt(species("sp", [atom("na1", "Na", { formalCharge: 1 })]), "na1")).toBe(0);
  });

  it("throws for an atom the species does not have", () => {
    expect(() => bondOrderSumAt(acetone(), "n1")).toThrow(/n1/);
  });
});

describe("derivedFormalCharge", () => {
  it("is zero on a neutral carbon with four bonds", () => {
    expect(derivedFormalCharge(methane(), "c1")).toBe(0);
  });

  it("is minus one on hydroxide oxygen", () => {
    // 6 valence - 6 nonbonding - 1 bond order = -1.
    expect(derivedFormalCharge(hydroxide(), "o1")).toBe(-1);
  });

  it("is plus one on a protonated carbonyl oxygen", () => {
    const protonated = species(
      "sp",
      [atom("c2", "C", { implicitHydrogens: 2 }), atom("o1", "O", { lonePairs: 1, implicitHydrogens: 1, formalCharge: 1 })],
      [bond("b1", "c2", "o1", 2)],
    );
    // 6 valence - 2 nonbonding - 3 bond order = +1.
    expect(derivedFormalCharge(protonated, "o1")).toBe(1);
  });

  it("is plus one on a carbocation carbon", () => {
    const cation = species("sp", [atom("c1", "C", { formalCharge: 1, implicitHydrogens: 3 })]);
    expect(derivedFormalCharge(cation, "c1")).toBe(1);
  });

  it("reports what the structure implies even when the declaration disagrees", () => {
    // The disagreement is the signal. Deriving the charge silently would delete it, and
    // formal_charge_disagrees_with_structure could never fire.
    const wrong = species("sp", [atom("c1", "C", { formalCharge: 3, implicitHydrogens: 4 })]);
    expect(derivedFormalCharge(wrong, "c1")).toBe(0);
    expect(wrong.atoms[0]?.formalCharge).toBe(3);
  });
});

describe("valenceElectronsAround", () => {
  it("counts bonding electrons in full at both ends, the octet convention", () => {
    // Not the formal charge convention, which splits them. Mixing the two is a classic
    // source of a check that fires on correct structures.
    expect(valenceElectronsAround(methane(), "c1")).toBe(8);
  });

  it("counts lone pairs and bonds together", () => {
    expect(valenceElectronsAround(hydroxide(), "o1")).toBe(8);
    expect(valenceElectronsAround(acetone(), "o1")).toBe(8);
  });

  it("reports six around neutral boron, which is legal and not an error", () => {
    const borane = species("sp", [atom("b1", "B", { implicitHydrogens: 3 })]);
    expect(valenceElectronsAround(borane, "b1")).toBe(6);
  });

  it("reports ten around a hypervalent phosphorus, above the period two ceiling", () => {
    const pentavalent = species(
      "sp",
      [
        atom("p1", "P"),
        atom("f1", "F", { lonePairs: 3 }),
        atom("f2", "F", { lonePairs: 3 }),
        atom("f3", "F", { lonePairs: 3 }),
        atom("f4", "F", { lonePairs: 3 }),
        atom("f5", "F", { lonePairs: 3 }),
      ],
      [
        bond("b1", "p1", "f1"),
        bond("b2", "p1", "f2"),
        bond("b3", "p1", "f3"),
        bond("b4", "p1", "f4"),
        bond("b5", "p1", "f5"),
      ],
    );
    expect(valenceElectronsAround(pentavalent, "p1")).toBe(10);
  });
});

describe("speciesCharge", () => {
  it("sums declared formal charges", () => {
    expect(speciesCharge(hydroxide())).toBe(-1);
    expect(speciesCharge(methane())).toBe(0);
  });

  it("cancels a plus and a minus inside one species, as in a zwitterion", () => {
    const zwitterion = species("sp", [
      atom("n1", "N", { formalCharge: 1 }),
      atom("o1", "O", { formalCharge: -1, lonePairs: 3 }),
    ]);
    expect(speciesCharge(zwitterion)).toBe(0);
  });

  it("is zero for a species with no atoms", () => {
    expect(speciesCharge(species("sp", []))).toBe(0);
  });
});

describe("valenceElectronCount", () => {
  it("counts an implicit hydrogen's electron", () => {
    expect(valenceElectronCount(methane())).toBe(8);
  });

  it("subtracts the charge, so a cation has one electron fewer", () => {
    const cation = species("sp", [atom("c1", "C", { formalCharge: 1, implicitHydrogens: 3 })]);
    expect(valenceElectronCount(cation)).toBe(6);
  });

  it("adds an electron for an anion", () => {
    // Hydroxide: 6 for oxygen plus 1 for the hydrogen, minus a charge of -1, is 8.
    expect(valenceElectronCount(hydroxide())).toBe(8);
  });
});

describe("conservedTotals", () => {
  const sodium = species("sp-sodium", [atom("na1", "Na", { formalCharge: 1 })]);
  const withSpectator = createState({
    id: "st",
    members: [member(chloromethane(), "substrate"), member(sodium, "counterion")],
    spectators: [
      {
        speciesId: "sp-sodium",
        reason: "unreacting_counterion",
        justification: "never touched by any arrow in this mechanism",
        declaredBy: "test",
      },
    ],
  });

  it("excludes spectators by default, which is what declaring one means", () => {
    const totals = conservedTotals(withSpectator);
    expect(totals.countedSpeciesIds).toEqual(["sp-chloromethane"]);
    expect(totals.charge).toBe(0);
    expect(totals.nuclides).toEqual({ C: 1, Cl: 1, H: 3 });
  });

  it("includes spectators when asked, which is what an adversary wants", () => {
    const totals = conservedTotals(withSpectator, { includeSpectators: true });
    expect(totals.countedSpeciesIds).toEqual(["sp-chloromethane", "sp-sodium"]);
    expect(totals.charge).toBe(1);
    expect(totals.nuclides).toEqual({ C: 1, Cl: 1, H: 3, Na: 1 });
  });

  it("treats an omitted option object the same as an absent flag", () => {
    expect(conservedTotals(withSpectator).charge).toBe(
      conservedTotals(withSpectator, {}).charge,
    );
  });

  it("treats includeSpectators false as excluding them", () => {
    expect(conservedTotals(withSpectator, { includeSpectators: false }).countedSpeciesIds).toEqual([
      "sp-chloromethane",
    ]);
  });

  it("sums charge and electrons across the whole multiset", () => {
    // The system boundary rule. Charge is conserved over everything present, not over
    // the substrate, which is why a protonation only balances when the acid is in scope.
    const both = state("st", [member(chloromethane()), member(hydroxide())]);
    const totals = conservedTotals(both);
    expect(totals.charge).toBe(-1);
    expect(totals.valenceElectrons).toBe(14 + 8);
    expect(totals.nuclides).toEqual({ C: 1, Cl: 1, O: 1, H: 4 });
  });

  it("freezes the totals and the counted species list", () => {
    const totals = conservedTotals(withSpectator);
    expect(Object.isFrozen(totals)).toBe(true);
    expect(Object.isFrozen(totals.countedSpeciesIds)).toBe(true);
  });
});

describe("display helpers, which conservation must never use", () => {
  it("gives an approximate mass that includes implicit hydrogens", () => {
    const mass = approximateMass(methane());
    expect(mass).toBeCloseTo(12.011 + 4 * 1.008, 6);
  });

  it("uses the mass number for a labelled atom", () => {
    expect(approximateMass(species("sp", [atom("h1", "H", { isotope: 2 })]))).toBeCloseTo(2, 6);
  });

  it("writes a formula in Hill order, carbon then hydrogen then the rest", () => {
    expect(molecularFormula(acetone())).toBe("C3H6O");
    expect(molecularFormula(chloromethane())).toBe("CH3Cl");
  });

  it("omits the count when there is exactly one of an element", () => {
    expect(molecularFormula(hydroxide())).toBe("HO");
  });

  it("sorts the non carbon non hydrogen elements alphabetically", () => {
    const mixed = species("sp", [atom("s1", "S"), atom("br1", "Br"), atom("n1", "N")]);
    expect(molecularFormula(mixed)).toBe("BrNS");
  });

  it("folds an isotope into its element, so a formula is not an identity", () => {
    const labelled = species("sp", [atom("c1", "C", { isotope: 13, implicitHydrogens: 4 })]);
    expect(molecularFormula(labelled)).toBe("CH4");
  });

  it("is an empty string for a species with no atoms", () => {
    expect(molecularFormula(species("sp", []))).toBe("");
  });
});

describe("atomKey", () => {
  it("is the atom's nuclide key", () => {
    expect(atomKey(atom("c1", "C"))).toBe("C");
    expect(atomKey(atom("h1", "H", { isotope: 2 }))).toBe("[2H]");
  });
});
