import { describe, expect, it } from "vitest";

import { createArrow, fromLonePair, toAtom } from "../src/arrows.ts";
import { declaredDeltas, deltaMismatches, observedDeltas } from "../src/deltas.ts";
import { atom, bond, member, species, state } from "./helpers.ts";

/**
 * Which entries a delta set keeps, and what a mismatch points at.
 *
 * `assemble` drops any atom whose three counters are all zero and any bond pair whose
 * electron change is zero. That filter is the difference between a delta set that reads
 * as a diff and one that lists every atom in the flask, and each of its three clauses
 * needs its own case: an atom that changed in only one of the three would be dropped by
 * a filter missing that clause, and nothing else in the suite would notice.
 */

describe("assemble keeps an atom that changed in exactly one way", () => {
  it("keeps an atom whose only change is nonbonding electrons", () => {
    const from = state("st-0", [member(species("sp", [atom("o1", "O", { lonePairs: 2 })]))]);
    const to = state("st-1", [member(species("sp", [atom("o1", "O", { lonePairs: 3 })]))]);
    expect(observedDeltas(from, to).atoms).toEqual([
      { atomId: "o1", nonbondingElectrons: 2, implicitHydrogens: 0, formalCharge: 0 },
    ]);
  });

  it("keeps an atom whose only change is an implicit hydrogen count", () => {
    // The S5 case in isolation. Nothing bonded, nothing charged, one undrawn hydrogen
    // gone. A filter that only looked at nonbonding electrons would drop this entry and
    // the mismatch that catches the bug would never be produced.
    const from = state("st-0", [
      member(species("sp", [atom("o1", "O", { lonePairs: 2, implicitHydrogens: 1 })])),
    ]);
    const to = state("st-1", [
      member(species("sp", [atom("o1", "O", { lonePairs: 2, implicitHydrogens: 0 })])),
    ]);
    expect(observedDeltas(from, to).atoms).toEqual([
      { atomId: "o1", nonbondingElectrons: 0, implicitHydrogens: -1, formalCharge: 0 },
    ]);
  });

  it("keeps an atom whose only change is a declared formal charge", () => {
    // A charge relabelled with no electron change at all. It is carried, never asserted
    // here, but dropping it would hide a structure whose declaration was edited alone.
    const from = state("st-0", [
      member(species("sp", [atom("c1", "C", { implicitHydrogens: 3, formalCharge: 0 })])),
    ]);
    const to = state("st-1", [
      member(species("sp", [atom("c1", "C", { implicitHydrogens: 3, formalCharge: 1 })])),
    ]);
    expect(observedDeltas(from, to).atoms).toEqual([
      { atomId: "c1", nonbondingElectrons: 0, implicitHydrogens: 0, formalCharge: 1 },
    ]);
  });

  it("drops an atom that did not change in any of the three", () => {
    const same = state("st", [member(species("sp", [atom("c1", "C", { implicitHydrogens: 4 })]))]);
    expect(observedDeltas(same, same).atoms).toEqual([]);
  });

  it("drops a bond whose electron count did not change", () => {
    // Every bond in the flask appears in both maps. Without the zero filter the set would
    // list the whole structure and a reader would have to find the two lines that matter.
    const same = state("st", [
      member(
        species(
          "sp",
          [atom("c1", "C", { implicitHydrogens: 3 }), atom("cl1", "Cl", { lonePairs: 3 })],
          [bond("b1", "c1", "cl1")],
        ),
      ),
    ]);
    expect(observedDeltas(same, same).bonds).toEqual([]);
  });
});

describe("a mismatch says exactly what it is about", () => {
  const from = state("st-0", [
    member(species("sp", [atom("o1", "O", { lonePairs: 3 }), atom("c1", "C")])),
  ]);
  const to = state("st-1", [
    member(species("sp", [atom("o1", "O", { lonePairs: 3 }), atom("c1", "C")])),
  ]);

  it("points at the atom by id when nonbonding electrons disagree", () => {
    const declared = declaredDeltas(
      [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("c1") })],
      from,
    );
    const mismatches = deltaMismatches(declared, observedDeltas(from, to));
    const atOxygen = mismatches.find(
      (mismatch) => mismatch.target.kind === "atom" && mismatch.target.atomId === "o1",
    );
    expect(atOxygen?.target).toEqual({ kind: "atom", atomId: "o1" });
    expect(atOxygen?.quantity).toBe("nonbondingElectrons");
    expect(atOxygen?.declared).toBe(-2);
    expect(atOxygen?.observed).toBe(0);
  });

  it("points at the atom by id when an implicit hydrogen moved", () => {
    const protonated = state("st-0", [
      member(species("sp", [atom("o1", "O", { lonePairs: 2, implicitHydrogens: 1 })])),
    ]);
    const deprotonated = state("st-1", [
      member(species("sp", [atom("o1", "O", { lonePairs: 2, implicitHydrogens: 0 })])),
    ]);
    const mismatch = deltaMismatches(
      declaredDeltas([], protonated),
      observedDeltas(protonated, deprotonated),
    ).find((entry) => entry.quantity === "implicitHydrogens");
    expect(mismatch?.target).toEqual({ kind: "atom", atomId: "o1" });
  });
});
