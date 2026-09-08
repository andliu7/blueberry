import { describe, expect, it } from "vitest";

import {
  createArrow,
  fromBond,
  fromLonePair,
  fromSingleElectron,
  toAtom,
  toBondBetween,
  type ElectronFlowArrow,
} from "../src/arrows.ts";
import { causeDefinition, type CauseId } from "../src/causes.ts";
import {
  arrowEndpointsShareAnAtom,
  arrowLegalityFindings,
  sinkAtomIds,
  sourceAtomIds,
  type ArrowLegalityFinding,
  type ArrowLegalityRuleId,
} from "../src/legality.ts";
import type { MechanismState } from "../src/state.ts";
import { atom, bond, member, species, state } from "./helpers.ts";

/** Chloromethane plus hydroxide, the state every SN2 arrow below resolves against. */
const sn2 = () => state("st-0", [
  member(
    species(
      "sp-substrate",
      [atom("c1", "C", { implicitHydrogens: 3 }), atom("cl1", "Cl", { lonePairs: 3 })],
      [bond("b1", "c1", "cl1")],
    ),
    "substrate",
  ),
  member(
    species("sp-nucleophile", [
      atom("o1", "O", { formalCharge: -1, lonePairs: 3, implicitHydrogens: 1 }),
    ]),
    "nucleophile",
  ),
]);

const attack = () => createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") });
const departure = () => createArrow({ id: "a2", source: fromBond("b1"), sink: toAtom("cl1") });

function rules(findings: readonly ArrowLegalityFinding[]): ArrowLegalityRuleId[] {
  return findings.map((finding) => finding.rule);
}

function only(findings: readonly ArrowLegalityFinding[]): ArrowLegalityFinding {
  expect(findings).toHaveLength(1);
  const first = findings[0];
  if (first === undefined) throw new Error("no finding");
  return first;
}

describe("sourceAtomIds and sinkAtomIds", () => {
  it("gives the one atom a lone pair or unpaired electron sits on", () => {
    expect(sourceAtomIds(fromLonePair("o1"), sn2())).toEqual(["o1"]);
    expect(sourceAtomIds(fromSingleElectron("o1"), sn2())).toEqual(["o1"]);
  });

  it("gives BOTH ends of a bond source, because either end can be the pivot", () => {
    expect(sourceAtomIds(fromBond("b1"), sn2())).toEqual(["c1", "cl1"]);
  });

  it("gives an empty list for a bond that does not resolve, which means unknown", () => {
    // Callers must treat this as "unknown", never as "no atoms". The dedicated
    // source_bond_not_in_state finding is what a reader should get instead.
    expect(sourceAtomIds(fromBond("b-absent"), sn2())).toEqual([]);
  });

  it("gives one atom for an atom sink and two for a bond forming sink", () => {
    expect(sinkAtomIds(toAtom("cl1"))).toEqual(["cl1"]);
    expect(sinkAtomIds(toBondBetween("o1", "c1"))).toEqual(["o1", "c1"]);
  });
});

describe("arrowEndpointsShareAnAtom", () => {
  it("is true for a nucleophilic attack, pivoting on the nucleophile", () => {
    expect(arrowEndpointsShareAnAtom(attack(), sn2())).toBe(true);
  });

  it("is true for a heterolysis, pivoting on the leaving atom", () => {
    expect(arrowEndpointsShareAnAtom(departure(), sn2())).toBe(true);
  });

  it("is false when the two sites are disjoint", () => {
    const teleport = createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("cl1") });
    expect(arrowEndpointsShareAnAtom(teleport, sn2())).toBe(false);
  });

  it("is false for an unresolvable bond source, which is correct but a worse message", () => {
    const dangling = createArrow({ id: "a1", source: fromBond("b-absent"), sink: toAtom("cl1") });
    expect(arrowEndpointsShareAnAtom(dangling, sn2())).toBe(false);
  });
});

describe("a correctly drawn step produces no findings", () => {
  it("accepts the two arrow SN2", () => {
    expect(arrowLegalityFindings([attack(), departure()], sn2())).toEqual([]);
  });

  it("accepts an empty arrow list", () => {
    expect(arrowLegalityFindings([], sn2())).toEqual([]);
  });

  it("accepts Br2 homolysis, two fishhooks out of one single bond", () => {
    // The case that makes the capacity rule a ceiling on the sum rather than a ban on
    // sharing. Two fishhooks move two electrons in total, which is what the bond holds.
    const bromine = state("st", [
      member(
        species(
          "sp-br2",
          [atom("br1", "Br", { lonePairs: 3 }), atom("br2", "Br", { lonePairs: 3 })],
          [bond("b1", "br1", "br2")],
        ),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromBond("b1"), sink: toAtom("br1"), electrons: 1 }),
        createArrow({ id: "a2", source: fromBond("b1"), sink: toAtom("br2"), electrons: 1 }),
      ],
      bromine,
    );
    expect(findings).toEqual([]);
  });

  it("accepts a pi bond attacking an electrophile, pivoting on the shared carbon", () => {
    const alkene = state("st", [
      member(
        species(
          "sp-alkene",
          [
            atom("c1", "C", { implicitHydrogens: 2 }),
            atom("c2", "C", { implicitHydrogens: 2 }),
          ],
          [bond("b1", "c1", "c2", 2)],
        ),
      ),
      member(species("sp-proton", [atom("h1", "H", { formalCharge: 1 })]), "acid"),
    ]);
    const findings = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromBond("b1"), sink: toBondBetween("c2", "h1") })],
      alkene,
    );
    expect(findings).toEqual([]);
  });

  it("accepts a 1,2 hydride shift, pivoting on the hydrogen", () => {
    const cation = state("st", [
      member(
        species(
          "sp-cation",
          [
            atom("c1", "C", { formalCharge: 1, implicitHydrogens: 2 }),
            atom("c2", "C", { implicitHydrogens: 2 }),
            atom("h1", "H"),
          ],
          [bond("b1", "c1", "c2"), bond("b2", "c2", "h1")],
        ),
      ),
    ]);
    expect(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromBond("b2"), sink: toBondBetween("c1", "h1") })],
        cation,
      ),
    ).toEqual([]);
  });
});

describe("RESOLUTION: every endpoint is in the from state", () => {
  it("names a source atom that is not there", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("ghost"), sink: toAtom("c1") })],
        sn2(),
      ),
    );
    expect(finding.rule).toBe("source_atom_not_in_state");
    expect(finding.cause).toBe("arrow_endpoint_not_in_state");
    expect(finding.arrowId).toBe("a1");
    expect(finding.expected).toContain("ghost");
    expect(finding.expected).toContain("st-0");
    expect(finding.actual.length).toBeGreaterThan(0);
  });

  it("names a source bond that is not there", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromBond("b-absent"), sink: toAtom("cl1") })],
        sn2(),
      ),
    );
    expect(finding.rule).toBe("source_bond_not_in_state");
    expect(finding.cause).toBe("arrow_endpoint_not_in_state");
    expect(finding.expected).toContain("b-absent");
  });

  it("names a sink atom that is not there", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("ghost") })],
        sn2(),
      ),
    );
    expect(finding.rule).toBe("sink_atom_not_in_state");
    expect(finding.expected).toContain("ghost");
  });

  it("names both ends of a bond forming sink that are missing", () => {
    const findings = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("gx", "gy") })],
      sn2(),
    );
    expect(rules(findings)).toEqual(["sink_atom_not_in_state", "sink_atom_not_in_state"]);
    expect(findings.map((f) => f.expected).join(" ")).toContain("gx");
    expect(findings.map((f) => f.expected).join(" ")).toContain("gy");
  });

  it("stops at a dangling reference rather than reporting adjacency on top of it", () => {
    // Everything below resolution would be arithmetic on undefined, and "these two share
    // no atom" is a confusing thing to be told about an arrow anchored to nothing.
    const findings = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromLonePair("ghost"), sink: toAtom("cl1") })],
      sn2(),
    );
    expect(rules(findings)).not.toContain("endpoints_share_no_atom");
  });
});

describe("SOURCE DENSITY: an arrow starts on electrons that exist", () => {
  it("rejects a lone pair arrow off an atom with no lone pairs", () => {
    const findings = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromLonePair("c1"), sink: toBondBetween("c1", "o1") })],
      sn2(),
    );
    const finding = findings.find((f) => f.rule === "source_has_no_lone_pair");
    expect(finding?.cause).toBe("arrow_source_has_no_electrons");
    expect(finding?.expected).toContain("c1");
    expect(finding?.actual).toContain("0");
    // The aggregate capacity rule fires as well, because zero available is also less
    // than the two this arrow draws. Both are true, and reporting both is the stated
    // policy: an adversary reading one finding per run learns one thing per run.
    expect(rules(findings)).toContain("lone_pairs_overdrawn");
  });

  it("rejects a fishhook off an atom with no unpaired electron", () => {
    const findings = arrowLegalityFindings(
      [
        createArrow({
          id: "a1",
          source: fromSingleElectron("o1"),
          sink: toBondBetween("o1", "c1"),
          electrons: 1,
        }),
      ],
      sn2(),
    );
    const finding = findings.find((f) => f.rule === "source_has_no_unpaired_electron");
    expect(finding?.cause).toBe("arrow_source_has_no_electrons");
    expect(finding?.actual).toContain("0");
    expect(rules(findings)).toContain("unpaired_electrons_overdrawn");
  });

  it("rejects a single electron source that claims to move a pair", () => {
    const radical = state("st", [
      member(
        species("sp", [
          atom("br1", "Br", { lonePairs: 3, unpairedElectrons: 1 }),
          atom("c1", "C", { implicitHydrogens: 3 }),
        ]),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({
          id: "a1",
          source: fromSingleElectron("br1"),
          sink: toBondBetween("br1", "c1"),
          electrons: 2,
        }),
      ],
      radical,
    );
    expect(rules(findings)).toContain("single_electron_source_moved_a_pair");
    const finding = findings.find((f) => f.rule === "single_electron_source_moved_a_pair");
    expect(finding?.cause).toBe("electron_count_not_integral");
    expect(finding?.actual).toContain("2");
  });

  it("accepts a fishhook that moves exactly one electron", () => {
    const radical = state("st", [
      member(species("sp", [atom("br1", "Br", { lonePairs: 3, unpairedElectrons: 1 })])),
      member(species("sp2", [atom("c1", "C", { unpairedElectrons: 1 })])),
    ]);
    expect(
      arrowLegalityFindings(
        [
          createArrow({
            id: "a1",
            source: fromSingleElectron("br1"),
            sink: toBondBetween("br1", "c1"),
            electrons: 1,
          }),
        ],
        radical,
      ),
    ).toEqual([]);
  });

  it("accepts one electron drawn out of a single bond, which holds two", () => {
    expect(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromBond("b1"), sink: toAtom("cl1"), electrons: 1 })],
        sn2(),
      ),
    ).toEqual([]);
  });
});

describe("SOURCE CAPACITY: the sum across a step, not one arrow at a time", () => {
  it("rejects two pair arrows off one lone pair worth of density", () => {
    const oneLonePair = state("st", [
      member(
        species("sp", [
          atom("o1", "O", { lonePairs: 1 }),
          atom("c1", "C"),
          atom("c2", "C"),
        ]),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
        createArrow({ id: "a2", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
      ],
      oneLonePair,
    );
    const finding = findings.find((f) => f.rule === "lone_pairs_overdrawn");
    expect(finding?.cause).toBe("arrow_source_has_no_electrons");
    // The violation belongs to the SET of arrows, so both are named.
    expect(finding?.arrowId).toBe("a1 + a2");
    expect(finding?.expected).toContain("2");
    expect(finding?.actual).toContain("4");
  });

  it("accepts two pair arrows off an atom that has two lone pairs", () => {
    const twoLonePairs = state("st", [
      member(
        species("sp", [
          atom("o1", "O", { lonePairs: 2 }),
          atom("c1", "C"),
          atom("c2", "C"),
        ]),
      ),
    ]);
    expect(
      arrowLegalityFindings(
        [
          createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
          createArrow({ id: "a2", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
        ],
        twoLonePairs,
      ),
    ).toEqual([]);
  });

  it("rejects two fishhooks off one unpaired electron", () => {
    const radical = state("st", [
      member(
        species("sp", [
          atom("br1", "Br", { lonePairs: 3, unpairedElectrons: 1 }),
          atom("c1", "C"),
          atom("c2", "C"),
        ]),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({
          id: "a1",
          source: fromSingleElectron("br1"),
          sink: toBondBetween("br1", "c1"),
          electrons: 1,
        }),
        createArrow({
          id: "a2",
          source: fromSingleElectron("br1"),
          sink: toBondBetween("br1", "c2"),
          electrons: 1,
        }),
      ],
      radical,
    );
    const finding = findings.find((f) => f.rule === "unpaired_electrons_overdrawn");
    expect(finding?.arrowId).toBe("a1 + a2");
    expect(finding?.expected).toContain("1");
    expect(finding?.actual).toContain("2");
  });

  it("rejects three fishhooks out of a single bond, which only holds two electrons", () => {
    const bromine = state("st", [
      member(
        species(
          "sp",
          [
            atom("br1", "Br", { lonePairs: 3 }),
            atom("br2", "Br", { lonePairs: 3 }),
            atom("c1", "C"),
          ],
          [bond("b1", "br1", "br2")],
        ),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromBond("b1"), sink: toAtom("br1"), electrons: 1 }),
        createArrow({ id: "a2", source: fromBond("b1"), sink: toAtom("br2"), electrons: 1 }),
        createArrow({ id: "a3", source: fromBond("b1"), sink: toBondBetween("br1", "c1"), electrons: 1 }),
      ],
      bromine,
    );
    const finding = findings.find((f) => f.rule === "source_bond_overdrawn");
    expect(finding?.arrowId).toBe("a1 + a2 + a3");
    expect(finding?.actual).toContain("3");
  });

  it("rejects a single arrow drawing more than one bond holds", () => {
    const findings = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromBond("b1"), sink: toBondBetween("c1", "o1") })],
      sn2(),
    );
    // Order two would be four electrons; this bond is order one, so a pair is fine, and
    // the aggregate rule is what a genuinely overdrawn single bond trips.
    expect(findings.filter((f) => f.rule === "source_bond_overdrawn")).toHaveLength(0);
  });

  it("accepts four electrons out of a double bond", () => {
    const alkene = state("st", [
      member(
        species(
          "sp",
          [
            atom("c1", "C", { implicitHydrogens: 2 }),
            atom("c2", "C", { implicitHydrogens: 2 }),
            atom("c3", "C", { formalCharge: 1 }),
            atom("c4", "C", { formalCharge: 1 }),
          ],
          [bond("b1", "c1", "c2", 2)],
        ),
      ),
    ]);
    expect(
      arrowLegalityFindings(
        [
          createArrow({ id: "a1", source: fromBond("b1"), sink: toBondBetween("c1", "c3") }),
          createArrow({ id: "a2", source: fromBond("b1"), sink: toBondBetween("c2", "c4") }),
        ],
        alkene,
      ),
    ).toEqual([]);
  });
});

describe("NON DEGENERACY: an arrow has to claim something moved", () => {
  it("rejects a lone pair taken off an atom and put back on the same atom", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("o1") })],
        sn2(),
      ),
    );
    expect(finding.rule).toBe("arrow_declares_no_change");
    expect(finding.cause).toBe("arrow_declares_no_change");
    expect(finding.actual).toContain("o1");
  });

  it("rejects a bond emptied out into the same bond", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromBond("b1"), sink: toBondBetween("c1", "cl1") })],
        sn2(),
      ),
    );
    expect(finding.rule).toBe("arrow_declares_no_change");
    expect(finding.actual).toContain("b1");
  });

  it("rejects the same bond written with its ends the other way round", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromBond("b1"), sink: toBondBetween("cl1", "c1") })],
        sn2(),
      ),
    );
    expect(finding.rule).toBe("arrow_declares_no_change");
  });

  it("rejects a sink that bonds an atom to itself, before saying anything about adjacency", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("c1", "c1") })],
        sn2(),
      ),
    );
    expect(finding.rule).toBe("sink_bonds_an_atom_to_itself");
    expect(finding.cause).toBe("arrow_sink_cannot_accept_electrons");
    expect(finding.actual).toContain("c1");
  });

  it("does not call a bond to atom arrow degenerate just because the atom is on the bond", () => {
    // bond(A, B) -> atom(B) is heterolysis, the commonest arrow in the corpus. The sites
    // differ in size, so the degeneracy rule must compare the sets and not just overlap.
    expect(arrowLegalityFindings([departure()], sn2())).toEqual([]);
  });
});

describe("ADJACENCY: the headline rule", () => {
  it("rejects a lone pair teleporting onto a non adjacent atom", () => {
    // The Phase 0 adversary finding. Declared deltas total per atom and per atom pair and
    // never ask whether a source and its sink are adjacent, so summation is blind to it.
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("cl1") })],
        sn2(),
      ),
    );
    expect(finding.rule).toBe("endpoints_share_no_atom");
    expect(finding.cause).toBe("arrow_endpoints_not_adjacent");
    expect(finding.expected).toContain("o1");
    expect(finding.expected).toContain("cl1");
  });

  it("says explicitly when the two sites happen to be bonded, and still rejects", () => {
    // The weaker "or the two sites are joined by an existing bond" rule is deliberately
    // not accepted, and the message names that case so the argument is easy to start.
    const bonded = state("st", [
      member(
        species(
          "sp",
          [
            atom("o1", "O", { lonePairs: 2 }),
            atom("c1", "C", { implicitHydrogens: 2 }),
            atom("c2", "C", { implicitHydrogens: 3 }),
          ],
          [bond("b1", "o1", "c1"), bond("b2", "c1", "c2")],
        ),
      ),
    ]);
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("c1") })],
        bonded,
      ),
    );
    expect(finding.rule).toBe("endpoints_share_no_atom");
    expect(finding.actual).toContain("joined by an existing bond");
  });

  it("says there is not even a bond when the two sites are in different species", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("cl1") })],
        sn2(),
      ),
    );
    expect(finding.actual).toContain("not even a bond");
  });

  it("accepts a bond source whose far end is the pivot", () => {
    const chain = state("st", [
      member(
        species(
          "sp",
          [
            atom("c1", "C", { formalCharge: 1, implicitHydrogens: 2 }),
            atom("c2", "C", { implicitHydrogens: 2 }),
            atom("c3", "C", { implicitHydrogens: 3 }),
          ],
          [bond("b1", "c1", "c2"), bond("b2", "c2", "c3")],
        ),
      ),
    ]);
    // bond(c2, c3) -> between(c1, c3): the alkyl shift shape, pivoting on c3.
    expect(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromBond("b2"), sink: toBondBetween("c1", "c3") })],
        chain,
      ),
    ).toEqual([]);
  });
});

describe("the finder as a whole", () => {
  it("reports every rule an arrow breaks, not just the first", () => {
    const findings = arrowLegalityFindings(
      [
        createArrow({
          id: "a1",
          source: fromSingleElectron("c1"),
          sink: toBondBetween("c1", "o1"),
          electrons: 2,
        }),
      ],
      sn2(),
    );
    // Per arrow rules first, in the order the file lists them, then the aggregate
    // capacity rule that only makes sense after every arrow has been seen.
    expect(rules(findings)).toEqual([
      "source_has_no_unpaired_electron",
      "single_electron_source_moved_a_pair",
      "unpaired_electrons_overdrawn",
    ]);
  });

  it("examines every arrow, not just the first", () => {
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("cl1") }),
        createArrow({ id: "a2", source: fromLonePair("c1"), sink: toBondBetween("c1", "o1") }),
      ],
      sn2(),
    );
    expect(findings.map((f) => f.arrowId)).toContain("a1");
    expect(findings.map((f) => f.arrowId)).toContain("a2");
  });

  it("never throws on a malformed arrow", () => {
    const nonsense: ElectronFlowArrow[] = [
      createArrow({ id: "a1", source: fromBond("b-absent"), sink: toBondBetween("gx", "gy") }),
      createArrow({ id: "a2", source: fromLonePair("ghost"), sink: toAtom("ghost") }),
    ];
    expect(() => arrowLegalityFindings(nonsense, sn2())).not.toThrow();
    expect(arrowLegalityFindings(nonsense, sn2()).length).toBeGreaterThan(0);
  });

  it("returns a frozen list", () => {
    expect(Object.isFrozen(arrowLegalityFindings([], sn2()))).toBe(true);
  });

  it("maps every finding to a cause that exists in the registry and is blocking", () => {
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("cl1") }),
        createArrow({ id: "a2", source: fromLonePair("c1"), sink: toBondBetween("c1", "o1") }),
        createArrow({ id: "a3", source: fromBond("b-absent"), sink: toAtom("cl1") }),
        createArrow({ id: "a4", source: fromLonePair("o1"), sink: toBondBetween("c1", "c1") }),
        createArrow({ id: "a5", source: fromLonePair("o1"), sink: toAtom("o1") }),
      ],
      sn2(),
    );
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      const definition = causeDefinition(finding.cause as CauseId);
      expect(definition.severity).toBe("blocking");
      expect(finding.expected.trim().length).toBeGreaterThan(0);
      expect(finding.actual.trim().length).toBeGreaterThan(0);
      expect(finding.arrowId.length).toBeGreaterThan(0);
    }
  });

  it("resolves arrows against the from state and never looks at the to state", () => {
    // Whether an arrow is drawable is a property of where it starts and where it points,
    // not of what the student drew next. The signature has no `to` parameter, and this
    // asserts the behaviour that signature promises.
    const other: MechanismState = state("st-1", [
      member(species("sp", [atom("c1", "C"), atom("cl1", "Cl", { lonePairs: 4 })])),
    ]);
    expect(arrowLegalityFindings([attack(), departure()], sn2())).toEqual([]);
    expect(arrowLegalityFindings([attack(), departure()], other).length).toBeGreaterThan(0);
  });
});
