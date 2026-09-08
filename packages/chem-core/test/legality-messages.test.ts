import { describe, expect, it } from "vitest";

import {
  createArrow,
  fromBond,
  fromLonePair,
  fromSingleElectron,
  toAtom,
  toBondBetween,
} from "../src/arrows.ts";
import { arrowLegalityFindings, type ArrowLegalityFinding } from "../src/legality.ts";
import { atom, bond, member, species, state } from "./helpers.ts";

/**
 * What an illegal arrow SAYS, not only that it was caught.
 *
 * CLAUDE.md makes feedback specificity a measured win axis, and the bar's observed count
 * is one yellow triangle. A rule id with an empty message is that triangle. These tests
 * assert the sentences whole, because mutation testing showed every message string in
 * legality.ts could be blanked without a single assertion noticing.
 *
 * They are also where the aggregate capacity findings are pinned: which arrows get named,
 * in what order, and with which numbers.
 */

const sn2 = () =>
  state("st-0", [
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

function only(findings: readonly ArrowLegalityFinding[]): ArrowLegalityFinding {
  expect(findings).toHaveLength(1);
  const first = findings[0];
  if (first === undefined) throw new Error("no finding");
  return first;
}

describe("the wording of a finding, which is what a student is shown", () => {
  it("names a lone pair source and an atom sink in the message", () => {
    const findings = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("cl1") })],
      sn2(),
    );
    const finding = findings.find((f) => f.rule === "endpoints_share_no_atom");
    expect(finding?.expected).toBe(
      "the source site {o1} and the sink site {cl1} to share an atom, which is the pivot " +
        "the electron pair swings around",
    );
    expect(finding?.actual).toBe(
      "they share none, so a lone pair on o1 reaches atom cl1 across empty space. " +
        "There is not even a bond between them in this state",
    );
  });

  it("names a bond forming sink by both of its atoms", () => {
    const findings = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("c1", "cl1") })],
      sn2(),
    );
    const finding = findings.find((f) => f.rule === "endpoints_share_no_atom");
    expect(finding?.actual).toContain("a lone pair on o1 reaches between c1 and cl1");
    expect(finding?.expected).toContain("the sink site {c1, cl1}");
  });

  it("names a single electron source and a bond source by their own words", () => {
    const radical = state("st", [
      member(
        species(
          "sp",
          [
            atom("br1", "Br", { lonePairs: 3, unpairedElectrons: 1 }),
            atom("br2", "Br", { lonePairs: 3 }),
          ],
          [bond("b1", "br1", "br2")],
        ),
      ),
    ]);

    const degenerateRadical = arrowLegalityFindings(
      [
        createArrow({
          id: "a1",
          source: fromSingleElectron("br1"),
          sink: toAtom("br1"),
          electrons: 1,
        }),
      ],
      radical,
    );
    expect(degenerateRadical[0]?.actual).toBe(
      "it runs from the unpaired electron on br1 to atom br1, which is the same site, so it " +
        "declares a change of zero everywhere",
    );

    const degenerateBond = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromBond("b1"), sink: toBondBetween("br1", "br2") })],
      radical,
    );
    expect(degenerateBond[0]?.actual).toBe(
      "it runs from bond b1 to between br1 and br2, which is the same site, so it declares a " +
        "change of zero everywhere",
    );
    expect(degenerateBond[0]?.expected).toBe(
      "an arrow moves electrons from one place to a different place",
    );
  });

  it("says an unresolvable sink points at nothing, with the endpoint cause", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("ghost") })],
        sn2(),
      ),
    );
    expect(finding.cause).toBe("arrow_endpoint_not_in_state");
    expect(finding.expected).toBe("atom ghost to be present in state st-0");
    expect(finding.actual).toBe("it is not in any species here, so the arrow points at nothing");
  });

  it("says an unresolvable source starts on nothing", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("ghost"), sink: toAtom("c1") })],
        sn2(),
      ),
    );
    expect(finding.cause).toBe("arrow_endpoint_not_in_state");
    expect(finding.actual).toBe("it is not in any species here, so the arrow starts on nothing");
  });

  it("says an unresolvable bond source has no pair to move", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromBond("b-absent"), sink: toAtom("cl1") })],
        sn2(),
      ),
    );
    expect(finding.expected).toBe("bond b-absent to be a bond in state st-0");
    expect(finding.actual).toBe(
      "no species here has a bond with that id, so there is no pair to move",
    );
  });

  it("gives the exact numbers on a radical source finding", () => {
    const findings = arrowLegalityFindings(
      [
        createArrow({
          id: "a1",
          source: fromSingleElectron("o1"),
          sink: toBondBetween("o1", "c1"),
          electrons: 2,
        }),
      ],
      sn2(),
    );
    expect(findings.find((f) => f.rule === "source_has_no_unpaired_electron")?.expected).toBe(
      "at least one unpaired electron on o1",
    );
    expect(findings.find((f) => f.rule === "source_has_no_unpaired_electron")?.actual).toBe(
      "it carries 0",
    );
    expect(findings.find((f) => f.rule === "single_electron_source_moved_a_pair")?.expected).toBe(
      "a singleElectron source moves exactly 1 electron",
    );
    expect(findings.find((f) => f.rule === "single_electron_source_moved_a_pair")?.actual).toBe(
      "this arrow moves 2, which is more than the source holds",
    );
  });

  it("gives the exact message on a missing lone pair", () => {
    const findings = arrowLegalityFindings(
      [createArrow({ id: "a1", source: fromLonePair("c1"), sink: toBondBetween("c1", "o1") })],
      sn2(),
    );
    const finding = findings.find((f) => f.rule === "source_has_no_lone_pair");
    expect(finding?.expected).toBe(
      "at least one lone pair on c1 for this arrow to start from",
    );
    expect(finding?.actual).toBe("it carries 0");
  });

  it("gives the exact message on a sink that bonds an atom to itself", () => {
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("c1", "c1") })],
        sn2(),
      ),
    );
    expect(finding.expected).toBe("a bond forming sink names two different atoms");
    expect(finding.actual).toBe("both ends are c1, and an atom cannot bond to itself");
  });
});

describe("aggregate capacity findings name the right arrows, in a stable order", () => {
  it("gives the exact ceiling and draw on every aggregate capacity finding", () => {
    const overdrawn = state("st", [
      member(
        species(
          "sp",
          [
            atom("o1", "O", { lonePairs: 1 }),
            atom("br1", "Br", { unpairedElectrons: 1 }),
            atom("c1", "C"),
            atom("c2", "C"),
            atom("c3", "C"),
          ],
          [bond("b1", "c1", "c2")],
        ),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
        createArrow({ id: "a2", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
        createArrow({
          id: "a3",
          source: fromSingleElectron("br1"),
          sink: toBondBetween("br1", "c1"),
          electrons: 1,
        }),
        createArrow({
          id: "a4",
          source: fromSingleElectron("br1"),
          sink: toBondBetween("br1", "c2"),
          electrons: 1,
        }),
        createArrow({ id: "a5", source: fromBond("b1"), sink: toAtom("c1"), electrons: 1 }),
        createArrow({ id: "a6", source: fromBond("b1"), sink: toAtom("c2"), electrons: 1 }),
        createArrow({
          id: "a7",
          source: fromBond("b1"),
          sink: toBondBetween("c1", "c3"),
          electrons: 1,
        }),
      ],
      overdrawn,
    );

    const lonePairs = findings.find((f) => f.rule === "lone_pairs_overdrawn");
    expect(lonePairs?.cause).toBe("arrow_source_has_no_electrons");
    expect(lonePairs?.expected).toBe("at most 2 electrons drawn from lone pairs on o1");
    expect(lonePairs?.actual).toBe("the arrows in this step draw 4 between them");

    const unpaired = findings.find((f) => f.rule === "unpaired_electrons_overdrawn");
    expect(unpaired?.cause).toBe("arrow_source_has_no_electrons");
    expect(unpaired?.expected).toBe("at most 1 electrons drawn from unpaired electrons on br1");
    expect(unpaired?.actual).toBe("the arrows in this step draw 2 between them");

    const bondSource = findings.find((f) => f.rule === "source_bond_overdrawn");
    expect(bondSource?.cause).toBe("arrow_source_has_no_electrons");
    expect(bondSource?.expected).toBe("at most 2 electrons drawn from bond b1, which is order 1");
    expect(bondSource?.actual).toBe("the arrows in this step draw 3 between them");
  });

  it("names only the arrows that actually drew from the overdrawn lone pair", () => {
    // A capacity violation belongs to a set of arrows. Naming an arrow that drew from
    // somewhere else sends the reader to an arrow that is fine on its own.
    const overdrawn = state("st", [
      member(
        species("sp", [
          atom("o1", "O", { lonePairs: 1 }),
          atom("o2", "O", { lonePairs: 3 }),
          atom("c1", "C"),
          atom("c2", "C"),
        ]),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
        createArrow({ id: "a2", source: fromLonePair("o2"), sink: toBondBetween("o2", "c1") }),
        createArrow({ id: "a3", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
      ],
      overdrawn,
    );
    expect(findings.find((f) => f.rule === "lone_pairs_overdrawn")?.arrowId).toBe("a1 + a3");
  });

  it("names only the fishhooks that drew from the overdrawn unpaired electron", () => {
    const overdrawn = state("st", [
      member(
        species("sp", [
          atom("br1", "Br", { unpairedElectrons: 1 }),
          atom("br2", "Br", { unpairedElectrons: 1 }),
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
          source: fromSingleElectron("br2"),
          sink: toBondBetween("br2", "c1"),
          electrons: 1,
        }),
        createArrow({
          id: "a3",
          source: fromSingleElectron("br1"),
          sink: toBondBetween("br1", "c2"),
          electrons: 1,
        }),
      ],
      overdrawn,
    );
    expect(findings.find((f) => f.rule === "unpaired_electrons_overdrawn")?.arrowId).toBe(
      "a1 + a3",
    );
  });

  it("names only the arrows that drew from the overdrawn bond", () => {
    const overdrawn = state("st", [
      member(
        species(
          "sp",
          [atom("c1", "C"), atom("c2", "C"), atom("c3", "C"), atom("c4", "C")],
          [bond("b1", "c1", "c2"), bond("b2", "c3", "c4")],
        ),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromBond("b1"), sink: toAtom("c1"), electrons: 1 }),
        createArrow({ id: "a2", source: fromBond("b2"), sink: toAtom("c3"), electrons: 1 }),
        createArrow({ id: "a3", source: fromBond("b1"), sink: toAtom("c2"), electrons: 1 }),
        createArrow({
          id: "a4",
          source: fromBond("b1"),
          sink: toBondBetween("c1", "c3"),
          electrons: 1,
        }),
      ],
      overdrawn,
    );
    expect(findings.find((f) => f.rule === "source_bond_overdrawn")?.arrowId).toBe("a1 + a3 + a4");
  });

  it("sorts lone pair capacity findings by atom, not by which arrow came first", () => {
    // A report whose order depends on which arrow the author happened to draw first
    // produces a different diff on every run for the same chemistry.
    const overdrawn = state("st", [
      member(
        species("sp", [
          atom("zz1", "O", { lonePairs: 1 }),
          atom("aa1", "O", { lonePairs: 1 }),
          atom("c1", "C"),
          atom("c2", "C"),
        ]),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromLonePair("zz1"), sink: toBondBetween("zz1", "c1") }),
        createArrow({ id: "a2", source: fromLonePair("zz1"), sink: toBondBetween("zz1", "c2") }),
        createArrow({ id: "a3", source: fromLonePair("aa1"), sink: toBondBetween("aa1", "c1") }),
        createArrow({ id: "a4", source: fromLonePair("aa1"), sink: toBondBetween("aa1", "c2") }),
      ],
      overdrawn,
    );
    expect(
      findings.filter((f) => f.rule === "lone_pairs_overdrawn").map((f) => f.expected),
    ).toEqual([
      "at most 2 electrons drawn from lone pairs on aa1",
      "at most 2 electrons drawn from lone pairs on zz1",
    ]);
  });

  it("sorts unpaired electron capacity findings by atom", () => {
    const overdrawn = state("st", [
      member(
        species("sp", [
          atom("zz1", "Br", { unpairedElectrons: 1 }),
          atom("aa1", "Br", { unpairedElectrons: 1 }),
          atom("c1", "C"),
          atom("c2", "C"),
        ]),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({
          id: "a1",
          source: fromSingleElectron("zz1"),
          sink: toBondBetween("zz1", "c1"),
          electrons: 1,
        }),
        createArrow({
          id: "a2",
          source: fromSingleElectron("zz1"),
          sink: toBondBetween("zz1", "c2"),
          electrons: 1,
        }),
        createArrow({
          id: "a3",
          source: fromSingleElectron("aa1"),
          sink: toBondBetween("aa1", "c1"),
          electrons: 1,
        }),
        createArrow({
          id: "a4",
          source: fromSingleElectron("aa1"),
          sink: toBondBetween("aa1", "c2"),
          electrons: 1,
        }),
      ],
      overdrawn,
    );
    expect(
      findings.filter((f) => f.rule === "unpaired_electrons_overdrawn").map((f) => f.expected),
    ).toEqual([
      "at most 1 electrons drawn from unpaired electrons on aa1",
      "at most 1 electrons drawn from unpaired electrons on zz1",
    ]);
  });

  it("sorts bond capacity findings by bond id", () => {
    const overdrawn = state("st", [
      member(
        species(
          "sp",
          [atom("c1", "C"), atom("c2", "C"), atom("c3", "C"), atom("c4", "C"), atom("c5", "C")],
          [bond("bz", "c1", "c2"), bond("ba", "c3", "c4")],
        ),
      ),
    ]);
    const findings = arrowLegalityFindings(
      [
        createArrow({ id: "a1", source: fromBond("bz"), sink: toAtom("c1"), electrons: 1 }),
        createArrow({ id: "a2", source: fromBond("bz"), sink: toAtom("c2"), electrons: 1 }),
        createArrow({
          id: "a3",
          source: fromBond("bz"),
          sink: toBondBetween("c1", "c5"),
          electrons: 1,
        }),
        createArrow({ id: "a4", source: fromBond("ba"), sink: toAtom("c3"), electrons: 1 }),
        createArrow({ id: "a5", source: fromBond("ba"), sink: toAtom("c4"), electrons: 1 }),
        createArrow({
          id: "a6",
          source: fromBond("ba"),
          sink: toBondBetween("c3", "c5"),
          electrons: 1,
        }),
      ],
      overdrawn,
    );
    expect(
      findings.filter((f) => f.rule === "source_bond_overdrawn").map((f) => f.expected),
    ).toEqual([
      "at most 2 electrons drawn from bond ba, which is order 1",
      "at most 2 electrons drawn from bond bz, which is order 1",
    ]);
  });
});

describe("boundaries the rules turn on", () => {
  it("accepts a pair drawn from an atom carrying exactly one lone pair", () => {
    // The boundary of the source density rule. One lone pair is two electrons, which is
    // exactly what a double barbed arrow moves, so this is the commonest legal arrow in
    // the corpus and must not be reported.
    const oneLonePair = state("st", [
      member(species("sp", [atom("o1", "O", { lonePairs: 1 }), atom("c1", "C")])),
    ]);
    expect(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") })],
        oneLonePair,
      ),
    ).toEqual([]);
  });

  it("accepts a fishhook from an atom carrying exactly one unpaired electron", () => {
    const oneRadical = state("st", [
      member(species("sp", [atom("br1", "Br", { unpairedElectrons: 1 }), atom("c1", "C")])),
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
        oneRadical,
      ),
    ).toEqual([]);
  });

  it("notes a bond between the sites when only one end of a BOND SOURCE reaches the sink", () => {
    // The bonded note is about any pair of source and sink atoms, not about all of them.
    // A bond source contributes two atoms and only one of them needs to reach the sink.
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
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromBond("b1"), sink: toAtom("c3") })],
        branched,
      ),
    );
    expect(finding.rule).toBe("endpoints_share_no_atom");
    expect(finding.actual).toContain("joined by an existing bond");
  });

  it("notes a bond between the sites when only one end of a BOND FORMING SINK is bonded", () => {
    const branched = state("st", [
      member(
        species(
          "sp",
          [
            atom("o1", "O", { lonePairs: 2 }),
            atom("c1", "C", { implicitHydrogens: 2 }),
            atom("cl1", "Cl", { lonePairs: 3 }),
          ],
          [bond("b1", "o1", "c1")],
        ),
      ),
    ]);
    const finding = only(
      arrowLegalityFindings(
        [createArrow({ id: "a1", source: fromLonePair("o1"), sink: toBondBetween("c1", "cl1") })],
        branched,
      ),
    );
    expect(finding.actual).toContain(
      "The two sites are joined by an existing bond, which is still not enough: an arrow " +
        "that runs the length of a bond it neither sources from nor forms is moving that " +
        "bond's electrons without saying so",
    );
  });
});
