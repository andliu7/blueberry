import { describe, expect, it } from "vitest";

import {
  createArrow,
  fromBond,
  fromLonePair,
  fromSingleElectron,
  referencedAtomIds,
  referencedBondIds,
  toAtom,
  toBondBetween,
} from "../src/arrows.ts";

describe("source and sink constructors", () => {
  it("tag each shape with the kind the union discriminates on", () => {
    expect(fromLonePair("o1")).toEqual({ kind: "lonePair", atomId: "o1" });
    expect(fromBond("b1")).toEqual({ kind: "bond", bondId: "b1" });
    expect(fromSingleElectron("br1")).toEqual({ kind: "singleElectron", atomId: "br1" });
    expect(toAtom("cl1")).toEqual({ kind: "atom", atomId: "cl1" });
    expect(toBondBetween("o1", "c1")).toEqual({ kind: "betweenAtoms", atomIds: ["o1", "c1"] });
  });

  it("keeps the two atoms of a bond forming sink in the order written", () => {
    // The pair is unordered chemically, but silently reordering here would make an
    // arrow's stored form differ from what the author wrote and a diff unreadable.
    const sink = toBondBetween("o1", "c1");
    expect(sink.kind).toBe("betweenAtoms");
    if (sink.kind !== "betweenAtoms") throw new Error("sink kind narrowed wrong");
    expect(sink.atomIds).toEqual(["o1", "c1"]);
  });
});

describe("createArrow", () => {
  it("defaults to two electrons, the ordinary double barbed arrow", () => {
    const arrow = createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("c1") });
    expect(arrow.electrons).toBe(2);
  });

  it("takes one electron when a radical step says so explicitly", () => {
    const arrow = createArrow({
      id: "a1",
      source: fromSingleElectron("br1"),
      sink: toBondBetween("br1", "c1"),
      electrons: 1,
    });
    expect(arrow.electrons).toBe(1);
  });

  it("keeps its id, source, and sink", () => {
    const arrow = createArrow({ id: "a7", source: fromBond("b1"), sink: toAtom("cl1") });
    expect(arrow.id).toBe("a7");
    expect(arrow.source).toEqual({ kind: "bond", bondId: "b1" });
    expect(arrow.sink).toEqual({ kind: "atom", atomId: "cl1" });
  });

  it("freezes the arrow and both of its ends", () => {
    const arrow = createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("c1") });
    expect(Object.isFrozen(arrow)).toBe(true);
    expect(Object.isFrozen(arrow.source)).toBe(true);
    expect(Object.isFrozen(arrow.sink)).toBe(true);
  });

  it("copies the source and sink rather than aliasing the caller's objects", () => {
    const source = { kind: "lonePair", atomId: "o1" } as const;
    const arrow = createArrow({ id: "a1", source, sink: toAtom("c1") });
    expect(arrow.source).not.toBe(source);
    expect(arrow.source).toEqual(source);
  });
});

describe("referencedAtomIds", () => {
  it("names the source atom and the sink atom for a lone pair to atom arrow", () => {
    const arrow = createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("c1") });
    expect(referencedAtomIds(arrow)).toEqual(["o1", "c1"]);
  });

  it("names both ends of a bond forming sink", () => {
    const arrow = createArrow({
      id: "a1",
      source: fromLonePair("o1"),
      sink: toBondBetween("o1", "c1"),
    });
    expect(referencedAtomIds(arrow)).toEqual(["o1", "o1", "c1"]);
  });

  it("names the atom a single electron source sits on", () => {
    const arrow = createArrow({
      id: "a1",
      source: fromSingleElectron("br1"),
      sink: toAtom("c1"),
      electrons: 1,
    });
    expect(referencedAtomIds(arrow)).toContain("br1");
  });

  it("names no atom for a bond source, because resolving a bond id needs the species", () => {
    // Deliberate. legality.ts resolves a BondId against the state; this file has no
    // state, and inventing the two ends here would be a lookup with no table.
    const arrow = createArrow({ id: "a1", source: fromBond("b1"), sink: toAtom("cl1") });
    expect(referencedAtomIds(arrow)).toEqual(["cl1"]);
  });
});

describe("referencedBondIds", () => {
  it("names the bond a bond source reads from", () => {
    const arrow = createArrow({ id: "a1", source: fromBond("b1"), sink: toAtom("cl1") });
    expect(referencedBondIds(arrow)).toEqual(["b1"]);
  });

  it("is empty for a source that is not a bond", () => {
    expect(
      referencedBondIds(createArrow({ id: "a1", source: fromLonePair("o1"), sink: toAtom("c1") })),
    ).toEqual([]);
    expect(
      referencedBondIds(
        createArrow({
          id: "a1",
          source: fromSingleElectron("br1"),
          sink: toAtom("c1"),
          electrons: 1,
        }),
      ),
    ).toEqual([]);
  });
});
