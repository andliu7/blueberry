import { describe, expect, it } from "vitest";

import {
  createArrow,
  fromBond,
  fromLonePair,
  fromSingleElectron,
  toAtom,
  toBondBetween,
} from "../src/arrows.ts";
import { declaredDeltas, deltaMismatches, observedDeltas } from "../src/deltas.ts";
import { atom, bond, member, species, state } from "./helpers.ts";

/**
 * The SN2 of hydroxide on chloromethane, written out as two independently drawn states
 * plus the two arrows. Nothing here computes one from the other, which is the only
 * reason comparing them means anything.
 */
const before = () => state("st-0", [
  member(
    species(
      "sp-substrate",
      [atom("c1", "C", { implicitHydrogens: 3 }), atom("cl1", "Cl", { lonePairs: 3 })],
      [bond("b1", "c1", "cl1")],
    ),
  ),
  member(species("sp-nucleophile", [atom("o1", "O", { formalCharge: -1, lonePairs: 3, implicitHydrogens: 1 })])),
]);

const after = () => state("st-1", [
  member(
    species(
      "sp-product",
      [
        atom("c1", "C", { implicitHydrogens: 3 }),
        atom("o1", "O", { lonePairs: 2, implicitHydrogens: 1 }),
      ],
      [bond("b2", "c1", "o1")],
    ),
  ),
  member(species("sp-leaving", [atom("cl1", "Cl", { formalCharge: -1, lonePairs: 4 })])),
]);

const attack = () => createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") });
const departure = () => createArrow({ id: "a2", source: fromBond("b1"), sink: toAtom("cl1") });

describe("declaredDeltas", () => {
  it("takes electrons off a lone pair source", () => {
    const declared = declaredDeltas([attack()], before());
    expect(declared.atoms).toEqual([
      { atomId: "o1", nonbondingElectrons: -2, implicitHydrogens: 0, formalCharge: 0 },
    ]);
  });

  it("puts electrons into the bond a betweenAtoms sink names", () => {
    const declared = declaredDeltas([attack()], before());
    expect(declared.bonds).toEqual([{ atomIds: ["c1", "o1"], electrons: 2 }]);
  });

  it("takes electrons out of a bond source and lands them on the sink atom", () => {
    const declared = declaredDeltas([departure()], before());
    expect(declared.bonds).toEqual([{ atomIds: ["c1", "cl1"], electrons: -2 }]);
    expect(declared.atoms).toEqual([
      { atomId: "cl1", nonbondingElectrons: 2, implicitHydrogens: 0, formalCharge: 0 },
    ]);
  });

  it("accumulates several arrows into one set", () => {
    const declared = declaredDeltas([attack(), departure()], before());
    expect(declared.bonds).toEqual([
      { atomIds: ["c1", "cl1"], electrons: -2 },
      { atomIds: ["c1", "o1"], electrons: 2 },
    ]);
    expect(declared.atoms.map((delta) => delta.atomId)).toEqual(["cl1", "o1"]);
  });

  it("counts a fishhook as one electron, not half a bond order", () => {
    const homolysis = state("st", [
      member(
        species(
          "sp",
          [atom("br1", "Br", { lonePairs: 3 }), atom("br2", "Br", { lonePairs: 3 })],
          [bond("b1", "br1", "br2")],
        ),
      ),
    ]);
    const first = createArrow({
      id: "a1",
      source: fromBond("b1"),
      sink: toAtom("br1"),
      electrons: 1,
    });
    const second = createArrow({
      id: "a2",
      source: fromBond("b1"),
      sink: toAtom("br2"),
      electrons: 1,
    });
    const declared = declaredDeltas([first, second], homolysis);
    expect(declared.bonds).toEqual([{ atomIds: ["br1", "br2"], electrons: -2 }]);
    expect(declared.atoms).toEqual([
      { atomId: "br1", nonbondingElectrons: 1, implicitHydrogens: 0, formalCharge: 0 },
      { atomId: "br2", nonbondingElectrons: 1, implicitHydrogens: 0, formalCharge: 0 },
    ]);
  });

  it("takes an electron off a single electron source", () => {
    const radical = state("st", [
      member(species("sp", [atom("br1", "Br", { lonePairs: 3, unpairedElectrons: 1 })])),
      member(species("sp2", [atom("c1", "C", { unpairedElectrons: 1 })])),
    ]);
    const arrow = createArrow({
      id: "a1",
      source: fromSingleElectron("br1"),
      sink: toBondBetween("br1", "c1"),
      electrons: 1,
    });
    expect(declaredDeltas([arrow], radical).atoms).toEqual([
      { atomId: "br1", nonbondingElectrons: -1, implicitHydrogens: 0, formalCharge: 0 },
    ]);
  });

  it("declares no implicit hydrogen change, because no arrow can express one", () => {
    for (const delta of declaredDeltas([attack(), departure()], before()).atoms) {
      expect(delta.implicitHydrogens).toBe(0);
    }
  });

  it("declares no atoms added or removed", () => {
    const declared = declaredDeltas([attack(), departure()], before());
    expect(declared.atomsAdded).toEqual([]);
    expect(declared.atomsRemoved).toEqual([]);
  });

  it("cancels an arrow pair that puts electrons back where they came from", () => {
    // Two arrows that between them declare nothing produce no entry at all, rather than
    // a zero entry. A zero in the set would read as "this changed by nothing", which is
    // a different statement from "this is not part of the step".
    const out = createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("cl1") });
    const back = createArrow({ id: "a2", source: fromLonePair("cl1"), sink: toAtom("o1") });
    expect(declaredDeltas([out, back], before()).atoms).toEqual([]);
  });

  it("throws when an arrow sources a bond that is not in the state", () => {
    // A broken reference, not a chemistry error. A silent zero here would hide it.
    const dangling = createArrow({ id: "a1", source: fromBond("b-absent"), sink: toAtom("cl1") });
    expect(() => declaredDeltas([dangling], before())).toThrow(/b-absent/);
    expect(() => declaredDeltas([dangling], before())).toThrow(/a1/);
  });

  it("is empty for a step with no arrows", () => {
    const declared = declaredDeltas([], before());
    expect(declared.atoms).toEqual([]);
    expect(declared.bonds).toEqual([]);
  });
});

describe("observedDeltas", () => {
  it("reports the nonbonding change on each atom", () => {
    const observed = observedDeltas(before(), after());
    const byId = new Map(observed.atoms.map((delta) => [delta.atomId, delta]));
    expect(byId.get("o1")?.nonbondingElectrons).toBe(-2);
    expect(byId.get("cl1")?.nonbondingElectrons).toBe(2);
  });

  it("reports the formal charge change, which it carries but never asserts", () => {
    const byId = new Map(observedDeltas(before(), after()).atoms.map((d) => [d.atomId, d]));
    expect(byId.get("o1")?.formalCharge).toBe(1);
    expect(byId.get("cl1")?.formalCharge).toBe(-1);
  });

  it("reports a bond broken as minus two electrons and a bond formed as plus two", () => {
    expect(observedDeltas(before(), after()).bonds).toEqual([
      { atomIds: ["c1", "cl1"], electrons: -2 },
      { atomIds: ["c1", "o1"], electrons: 2 },
    ]);
  });

  it("matches bonds by their endpoint atoms, not by bond id", () => {
    // The bond ids differ across this step, b1 to b2, and the pairing still works.
    // Matching on id would report every formed bond as unrelated to anything.
    expect(before().members[0]?.species.bonds[0]?.id).toBe("b1");
    expect(after().members[0]?.species.bonds[0]?.id).toBe("b2");
    expect(observedDeltas(before(), after()).bonds).toHaveLength(2);
  });

  it("reports a bond order change as two electrons per order", () => {
    const single = state("st-0", [
      member(species("sp", [atom("c1", "C"), atom("o1", "O", { lonePairs: 2 })], [bond("b1", "c1", "o1")])),
    ]);
    const double = state("st-1", [
      member(species("sp", [atom("c1", "C"), atom("o1", "O", { lonePairs: 2 })], [bond("b1", "c1", "o1", 2)])),
    ]);
    expect(observedDeltas(single, double).bonds).toEqual([
      { atomIds: ["c1", "o1"], electrons: 2 },
    ]);
  });

  it("reports an implicit hydrogen change, which no arrow can account for", () => {
    const protonated = state("st-0", [member(species("sp", [atom("o1", "O", { lonePairs: 2, implicitHydrogens: 1 })]))]);
    const deprotonated = state("st-1", [member(species("sp", [atom("o1", "O", { lonePairs: 3 })]))]);
    const observed = observedDeltas(protonated, deprotonated);
    expect(observed.atoms).toHaveLength(1);
    expect(observed.atoms[0]?.implicitHydrogens).toBe(-1);
  });

  it("lists an atom present only in `from` as removed, not as changed", () => {
    const gone = state("st-1", [member(species("sp", [atom("c1", "C", { implicitHydrogens: 3 })]))]);
    const observed = observedDeltas(before(), gone);
    expect(observed.atomsRemoved).toEqual(["cl1", "o1"]);
    expect(observed.atomsAdded).toEqual([]);
  });

  it("lists an atom present only in `to` as added", () => {
    const extra = state("st-1", [
      member(species("sp", [atom("c1", "C"), atom("cl1", "Cl"), atom("o1", "O"), atom("n1", "N")])),
    ]);
    expect(observedDeltas(before(), extra).atomsAdded).toEqual(["n1"]);
  });

  it("sorts added and removed atom ids", () => {
    const from = state("st-0", [member(species("sp", [atom("z1", "C"), atom("a1", "C")]))]);
    const to = state("st-1", [member(species("sp", [atom("z2", "C"), atom("a2", "C")]))]);
    const observed = observedDeltas(from, to);
    expect(observed.atomsRemoved).toEqual(["a1", "z1"]);
    expect(observed.atomsAdded).toEqual(["a2", "z2"]);
  });

  it("omits an atom that did not change at all", () => {
    const observed = observedDeltas(before(), after());
    expect(observed.atoms.map((delta) => delta.atomId)).not.toContain("c1");
  });

  it("sorts atoms and bonds so two runs produce the same report", () => {
    const observed = observedDeltas(before(), after());
    const atomIds = observed.atoms.map((delta) => delta.atomId);
    expect(atomIds).toEqual([...atomIds].sort());
  });
});

describe("deltaMismatches", () => {
  it("is empty when the arrows fully account for the structural change", () => {
    const declared = declaredDeltas([attack(), departure()], before());
    const observed = observedDeltas(before(), after());
    expect(deltaMismatches(declared, observed)).toEqual([]);
  });

  it("reports a bond that changed with no arrow to explain it", () => {
    const declared = declaredDeltas([attack()], before());
    const observed = observedDeltas(before(), after());
    const mismatches = deltaMismatches(declared, observed);
    const bondMismatch = mismatches.find(
      (mismatch) => mismatch.target.kind === "atomPair" && mismatch.quantity === "bondingElectrons",
    );
    expect(bondMismatch?.declared).toBe(0);
    expect(bondMismatch?.observed).toBe(-2);
  });

  it("reports a nonbonding change the arrows did not claim", () => {
    const declared = declaredDeltas([], before());
    const observed = observedDeltas(before(), after());
    const atomMismatch = deltaMismatches(declared, observed).find(
      (mismatch) => mismatch.quantity === "nonbondingElectrons",
    );
    expect(atomMismatch).toBeDefined();
    expect(atomMismatch?.declared).toBe(0);
  });

  it("reports a claim the states do not show", () => {
    const declared = declaredDeltas([attack(), departure()], before());
    const observed = observedDeltas(before(), before());
    const mismatches = deltaMismatches(declared, observed);
    expect(mismatches.length).toBeGreaterThan(0);
    for (const mismatch of mismatches) {
      expect(mismatch.observed).toBe(0);
    }
  });

  it("always reports an implicit hydrogen change, because declared is always zero", () => {
    // The S5 signal: no arrow can express an undrawn hydrogen moving, so any observed
    // value stands alone and is caught in the act.
    const protonated = state("st-0", [member(species("sp", [atom("o1", "O", { lonePairs: 2, implicitHydrogens: 1 })]))]);
    const deprotonated = state("st-1", [member(species("sp", [atom("o1", "O", { lonePairs: 3 })]))]);
    const mismatches = deltaMismatches(
      declaredDeltas([], protonated),
      observedDeltas(protonated, deprotonated),
    );
    const hydrogen = mismatches.find((mismatch) => mismatch.quantity === "implicitHydrogens");
    expect(hydrogen?.declared).toBe(0);
    expect(hydrogen?.observed).toBe(-1);
  });

  it("does not compare formal charge, which would report the same error twice", () => {
    // Charge follows from the electrons. It is checked against structure by
    // derivedFormalCharge and across the step by conservedTotals, not here.
    const declared = declaredDeltas([attack(), departure()], before());
    const observed = observedDeltas(before(), after());
    expect(observed.atoms.some((delta) => delta.formalCharge !== 0)).toBe(true);
    expect(deltaMismatches(declared, observed)).toEqual([]);
  });

  it("names the atom pair a bond mismatch is about", () => {
    const mismatches = deltaMismatches(declaredDeltas([], before()), observedDeltas(before(), after()));
    const pairs = mismatches
      .filter((mismatch) => mismatch.target.kind === "atomPair")
      .map((mismatch) => (mismatch.target.kind === "atomPair" ? mismatch.target.atomIds : []));
    expect(pairs).toContainEqual(["c1", "cl1"]);
    expect(pairs).toContainEqual(["c1", "o1"]);
  });

  it("is frozen, so a caller cannot quietly drop a mismatch it does not like", () => {
    expect(Object.isFrozen(deltaMismatches(declaredDeltas([], before()), observedDeltas(before(), after())))).toBe(true);
  });
});
