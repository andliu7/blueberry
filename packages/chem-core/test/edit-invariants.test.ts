import { describe, expect, it } from "vitest";

import { createSpecies } from "../src/species.ts";
import { createState, type SpectatorDeclaration } from "../src/state.ts";
import {
  declareSpectator,
  withAddedBond,
  withAtomPatch,
  withBondOrder,
  withBondStereo,
  withMember,
  withReplacedSpecies,
  withdrawSpectator,
} from "../src/edit.ts";
import { atom, bond, chloromethane, hydroxide, member, species, state } from "./helpers.ts";

/**
 * What an immutable edit must NOT touch.
 *
 * The tests in edit.test.ts check that each edit does its own job. These check the parts
 * that are easy to lose silently: optional fields carried through a rebuild, and the
 * "only this one" half of every edit that names a target. Mutation testing found both
 * groups unasserted, which is the same failure shape either way: an edit that quietly
 * applies to everything looks identical to a correct one on a one member state.
 */

const torsioned = () =>
  createSpecies({
    id: "sp-torsioned",
    label: "butane, anti",
    atoms: [
      atom("c1", "C", { implicitHydrogens: 3 }),
      atom("c2", "C", { implicitHydrogens: 2 }),
      atom("c3", "C", { implicitHydrogens: 2 }),
      atom("c4", "C", { implicitHydrogens: 3 }),
    ],
    bonds: [bond("b1", "c1", "c2"), bond("b2", "c2", "c3"), bond("b3", "c3", "c4")],
    declaredTorsions: [
      {
        atoms: ["c1", "c2", "c3", "c4"],
        degrees: 180,
        justification: "anti periplanar in the authored conformer",
      },
    ],
  });

describe("a rebuild carries the optional fields it did not touch", () => {
  it("keeps a declared torsion through an atom patch", () => {
    // A torsion is the only conformational evidence E2 has. Dropping it during an
    // unrelated edit would turn an authored anti periplanar geometry into an unstated one.
    const patched = withAtomPatch(torsioned(), "c1", { formalCharge: 1 });
    expect(patched.declaredTorsions).toHaveLength(1);
    expect(patched.declaredTorsions?.[0]?.degrees).toBe(180);
    expect(patched.declaredTorsions?.[0]?.justification.length).toBeGreaterThan(0);
  });

  it("keeps a label through an atom patch", () => {
    expect(withAtomPatch(torsioned(), "c1", { formalCharge: 1 }).label).toBe("butane, anti");
  });

  it("leaves a species with no label and no torsions without either field", () => {
    // The absent branch of the same two conditionals. A rebuild that wrote the key with
    // an undefined value would break exactOptionalPropertyTypes at every later read.
    const patched = withAtomPatch(chloromethane(), "cl1", { lonePairs: 4 });
    expect("label" in patched).toBe(false);
    expect("declaredTorsions" in patched).toBe(false);
  });

  it("leaves a bond with no stereo without the field after an order change", () => {
    const raised = withBondOrder(chloromethane(), "b1", 2);
    expect("stereo" in (raised.bonds[0] ?? {})).toBe(false);
  });
});

describe("a patch field set to zero still overrides", () => {
  it("applies an unpairedElectrons patch of zero, quenching a radical", () => {
    // `patch.x ?? atom.x` and `patch.x && atom.x` agree on every value except zero and
    // false, and zero is the value that matters here: a radical recombination sets the
    // unpaired count to zero and a truthiness test would silently keep the radical.
    const radical = species("sp", [atom("br1", "Br", { lonePairs: 3, unpairedElectrons: 1 })]);
    const quenched = withAtomPatch(radical, "br1", { unpairedElectrons: 0 });
    expect(quenched.atoms[0]?.unpairedElectrons).toBe(0);
  });

  it("applies a lonePairs patch of zero", () => {
    const quenched = withAtomPatch(hydroxide(), "o1", { lonePairs: 0 });
    expect(quenched.atoms[0]?.lonePairs).toBe(0);
  });

  it("applies an implicitHydrogens patch of zero", () => {
    const stripped = withAtomPatch(chloromethane(), "c1", { implicitHydrogens: 0 });
    expect(stripped.atoms.find((a) => a.id === "c1")?.implicitHydrogens).toBe(0);
  });

  it("applies a formalCharge patch of zero, which is how a cation is neutralised", () => {
    const cation = species("sp", [atom("c1", "C", { formalCharge: 1, implicitHydrogens: 3 })]);
    expect(withAtomPatch(cation, "c1", { formalCharge: 0 }).atoms[0]?.formalCharge).toBe(0);
  });
});

describe("an edit that names a target touches only that target", () => {
  it("sets stereo on the named bond only", () => {
    const twoBonds = species(
      "sp",
      [atom("c1", "C"), atom("c2", "C"), atom("c3", "C")],
      [bond("b1", "c1", "c2", 2), bond("b2", "c2", "c3", 2)],
    );
    const stereoed = withBondStereo(twoBonds, "b1", {
      kind: "doubleBond",
      reference: ["c1", "c3"],
      arrangement: "cis",
    });
    expect(stereoed.bonds[0]?.stereo).toBeDefined();
    expect("stereo" in (stereoed.bonds[1] ?? {})).toBe(false);
  });

  it("replaces the named species only, in a state with more than one member", () => {
    const both = state("st", [
      member(chloromethane(), "substrate"),
      member(hydroxide(), "nucleophile"),
    ]);
    const replaced = withReplacedSpecies(both, species("sp-chloromethane", [atom("c1", "C")]));
    expect(replaced.members[0]?.species.atoms).toHaveLength(1);
    expect(replaced.members[1]?.species.id).toBe("sp-hydroxide");
    expect(replaced.members[1]?.species.atoms).toHaveLength(1);
    expect(replaced.members[1]?.species.atoms[0]?.element).toBe("O");
  });

  it("refuses a duplicate member even when another member has a different id", () => {
    // `some` and `every` agree on a one member state and disagree here, which is the
    // shape of a duplicate guard that passes its own test and lets duplicates through in
    // the real corpus.
    const both = state("st", [
      member(chloromethane(), "substrate"),
      member(hydroxide(), "nucleophile"),
    ]);
    expect(() => withMember(both, member(hydroxide(), "reagent"))).toThrow(/sp-hydroxide/);
  });

  it("adds a member whose id is new even when other members exist", () => {
    const one = state("st", [member(chloromethane(), "substrate")]);
    expect(withMember(one, member(hydroxide(), "nucleophile")).members).toHaveLength(2);
  });

  it("refuses a duplicate bond id even when another bond has a different id", () => {
    const twoBonds = species(
      "sp",
      [atom("c1", "C"), atom("c2", "C"), atom("c3", "C")],
      [bond("b1", "c1", "c2"), bond("b2", "c2", "c3")],
    );
    expect(() => withAddedBond(twoBonds, bond("b1", "c1", "c3"))).toThrow(/b1/);
    expect(withAddedBond(twoBonds, bond("b3", "c1", "c3")).bonds).toHaveLength(3);
  });
});

describe("spectator declarations in a state with more than one member", () => {
  const declarationFor = (speciesId: string): SpectatorDeclaration => ({
    speciesId,
    reason: "unreacting_counterion",
    justification: "not touched by any arrow in this step",
    declaredBy: "test",
  });

  const twoMembers = () =>
    createState({
      id: "st",
      members: [member(chloromethane(), "substrate"), member(hydroxide(), "nucleophile")],
    });

  it("declares the named species when others are present", () => {
    const declared = declareSpectator(twoMembers(), declarationFor("sp-hydroxide"));
    expect(declared.spectators.map((d) => d.speciesId)).toEqual(["sp-hydroxide"]);
  });

  it("still refuses a species that is absent when other members are present", () => {
    expect(() => declareSpectator(twoMembers(), declarationFor("sp-absent"))).toThrow(
      /sp-absent/,
    );
  });

  it("refuses a second declaration when another species is already declared", () => {
    const declared = declareSpectator(twoMembers(), declarationFor("sp-hydroxide"));
    expect(() => declareSpectator(declared, declarationFor("sp-hydroxide"))).toThrow(/already/);
    expect(
      declareSpectator(declared, declarationFor("sp-chloromethane")).spectators,
    ).toHaveLength(2);
  });

  it("withdraws the named declaration and keeps every other one", () => {
    const declared = declareSpectator(
      declareSpectator(twoMembers(), declarationFor("sp-hydroxide")),
      declarationFor("sp-chloromethane"),
    );
    const withdrawn = withdrawSpectator(declared, "sp-hydroxide");
    expect(withdrawn.spectators.map((d) => d.speciesId)).toEqual(["sp-chloromethane"]);
    expect(withdrawn.members).toHaveLength(2);
  });
});
