import { describe, expect, it } from "vitest";

import {
  allAtoms,
  atomsAreBonded,
  createState,
  duplicateAtomIds,
  duplicateSpeciesIds,
  findAtomInState,
  findBondInState,
  findMember,
  findSpecies,
  isSpectator,
  membersWithRole,
  orphanSpectatorDeclarations,
  participatingMembers,
  spectatorDeclarationFor,
  spectatorMembers,
  speciesIdOccurrences,
  type SpectatorDeclaration,
} from "../src/state.ts";
import { atom, bond, chloromethane, hydroxide, member, species, state } from "./helpers.ts";

const sodium = () => species("sp-sodium", [atom("na1", "Na", { formalCharge: 1 })]);

const spectatorDeclaration: SpectatorDeclaration = {
  speciesId: "sp-sodium",
  reason: "unreacting_counterion",
  justification: "sodium is a spectator counterion throughout this displacement",
  declaredBy: "test",
};

const sn2 = () => createState({
  id: "st-0",
  members: [
    member(chloromethane(), "substrate"),
    member(hydroxide(), "nucleophile"),
    member(sodium(), "counterion"),
  ],
  spectators: [spectatorDeclaration],
});

describe("createState", () => {
  it("defaults spectators to an empty list", () => {
    const bare = createState({ id: "st", members: [] });
    expect(bare.spectators).toEqual([]);
  });

  it("copies both lists rather than aliasing them, and freezes the result", () => {
    const members = [member(chloromethane())];
    const built = createState({ id: "st", members });
    members.length = 0;
    expect(built.members).toHaveLength(1);
    expect(Object.isFrozen(built)).toBe(true);
    expect(Object.isFrozen(built.members)).toBe(true);
    expect(Object.isFrozen(built.spectators)).toBe(true);
  });
});

describe("the system boundary", () => {
  it("knows which species are declared spectators", () => {
    expect(isSpectator(sn2(), "sp-sodium")).toBe(true);
    expect(isSpectator(sn2(), "sp-hydroxide")).toBe(false);
  });

  it("hands back the declaration itself, with the reason and the author", () => {
    // CLAUDE.md: declaring a spectator is an explicit, recorded act that a validator can
    // see and an adversary can attack. That is only true if the record is retrievable.
    const found = spectatorDeclarationFor(sn2(), "sp-sodium");
    expect(found?.reason).toBe("unreacting_counterion");
    expect(found?.justification.length).toBeGreaterThan(0);
    expect(found?.declaredBy).toBe("test");
    expect(spectatorDeclarationFor(sn2(), "sp-hydroxide")).toBeUndefined();
  });

  it("excludes spectators from the participating members and includes them nowhere else", () => {
    expect(participatingMembers(sn2()).map((m) => m.species.id)).toEqual([
      "sp-chloromethane",
      "sp-hydroxide",
    ]);
    expect(spectatorMembers(sn2()).map((m) => m.species.id)).toEqual(["sp-sodium"]);
  });

  it("partitions the members between participating and spectating with nothing lost", () => {
    expect(participatingMembers(sn2()).length + spectatorMembers(sn2()).length).toBe(
      sn2().members.length,
    );
  });

  it("names a declaration that points at a species not in the state", () => {
    const orphaned = createState({
      id: "st",
      members: [member(chloromethane())],
      spectators: [{ ...spectatorDeclaration, speciesId: "sp-absent" }],
    });
    expect(orphanSpectatorDeclarations(orphaned).map((d) => d.speciesId)).toEqual(["sp-absent"]);
    expect(orphanSpectatorDeclarations(sn2())).toEqual([]);
  });
});

describe("lookups across the multiset", () => {
  it("finds a species and its membership by id", () => {
    expect(findSpecies(sn2(), "sp-hydroxide")?.id).toBe("sp-hydroxide");
    expect(findSpecies(sn2(), "sp-absent")).toBeUndefined();
    expect(findMember(sn2(), "sp-hydroxide")?.role).toBe("nucleophile");
    expect(findMember(sn2(), "sp-absent")).toBeUndefined();
  });

  it("finds an atom in whichever species holds it, and reports both", () => {
    // Atom ids are unique across the whole state, which is what lets an arrow name a
    // source in one molecule and a sink in another without carrying a species id.
    const located = findAtomInState(sn2(), "o1");
    expect(located?.species.id).toBe("sp-hydroxide");
    expect(located?.atom.element).toBe("O");
    expect(findAtomInState(sn2(), "n1")).toBeUndefined();
  });

  it("finds a bond in whichever species holds it", () => {
    const located = findBondInState(sn2(), "b1");
    expect(located?.species.id).toBe("sp-chloromethane");
    expect(located?.bond.a).toBe("c1");
    expect(findBondInState(sn2(), "b9")).toBeUndefined();
  });

  it("lists every atom in the state, spectators included", () => {
    expect(allAtoms(sn2()).map((a) => a.id).sort()).toEqual(["c1", "cl1", "na1", "o1"]);
  });

  it("filters members by role", () => {
    expect(membersWithRole(sn2(), "nucleophile").map((m) => m.species.id)).toEqual(["sp-hydroxide"]);
    expect(membersWithRole(sn2(), "solvent")).toEqual([]);
  });
});

describe("atomsAreBonded", () => {
  it("is true for two atoms joined inside one species", () => {
    expect(atomsAreBonded(sn2(), "c1", "cl1")).toBe(true);
    expect(atomsAreBonded(sn2(), "cl1", "c1")).toBe(true);
  });

  it("is false for two atoms in different species", () => {
    // The adjacency test arrow legality turns on. An arrow reaching from one molecule
    // into another has to form a bond; it cannot travel along one that is not there.
    expect(atomsAreBonded(sn2(), "o1", "c1")).toBe(false);
  });

  it("is false for an atom and itself, which is not a bond", () => {
    expect(atomsAreBonded(sn2(), "c1", "c1")).toBe(false);
  });

  it("is false for an atom that is not in the state", () => {
    expect(atomsAreBonded(sn2(), "c1", "ghost")).toBe(false);
  });
});

describe("duplicate ids", () => {
  it("finds no duplicates in a well formed state", () => {
    expect(duplicateAtomIds(sn2())).toEqual([]);
    expect(duplicateSpeciesIds(sn2())).toEqual([]);
  });

  it("names an atom id used in two species", () => {
    const clash = state("st", [
      member(species("sp-a", [atom("c1", "C")])),
      member(species("sp-b", [atom("c1", "C")])),
    ]);
    expect(duplicateAtomIds(clash)).toEqual(["c1"]);
  });

  it("reports a repeated atom id once, however many times it repeats", () => {
    const clash = state("st", [
      member(species("sp-a", [atom("c1", "C")])),
      member(species("sp-b", [atom("c1", "C")])),
      member(species("sp-c", [atom("c1", "C")])),
    ]);
    expect(duplicateAtomIds(clash)).toEqual(["c1"]);
  });

  it("names a species id used by two members", () => {
    // The Phase 0 adversary finding: findSpecies resolves to whichever member is first,
    // so the second copy is invisible to every lookup while still counting toward every
    // total. One half of the engine sees it and the other half does not.
    const clash = state("st", [
      member(species("sp-water", [atom("o1", "O")])),
      member(species("sp-water", [atom("o2", "O")])),
    ]);
    expect(duplicateSpeciesIds(clash)).toEqual(["sp-water"]);
  });

  it("sorts duplicate species ids, so a failure report is stable between runs", () => {
    const clash = state("st", [
      member(species("sp-zeta", [atom("z1", "O")])),
      member(species("sp-alpha", [atom("a1", "O")])),
      member(species("sp-zeta", [atom("z2", "O")])),
      member(species("sp-alpha", [atom("a2", "O")])),
    ]);
    expect(duplicateSpeciesIds(clash)).toEqual(["sp-alpha", "sp-zeta"]);
  });
});

describe("speciesIdOccurrences", () => {
  it("is one for a species present once", () => {
    expect(speciesIdOccurrences(sn2(), "sp-hydroxide")).toBe(1);
  });

  it("is zero for a species that is not there", () => {
    expect(speciesIdOccurrences(sn2(), "sp-absent")).toBe(0);
  });

  it("counts every member carrying the id", () => {
    const clash = state("st", [
      member(species("sp-water", [atom("o1", "O")])),
      member(species("sp-water", [atom("o2", "O")])),
    ]);
    expect(speciesIdOccurrences(clash, "sp-water")).toBe(2);
  });
});
