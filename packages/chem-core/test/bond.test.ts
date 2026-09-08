import { describe, expect, it } from "vitest";

import {
  atomPairKey,
  bondPairKey,
  bondTouches,
  createBond,
  otherEnd,
  parseAtomPairKey,
  type DoubleBondStereo,
} from "../src/bond.ts";

describe("createBond", () => {
  it("defaults to order one", () => {
    expect(createBond({ id: "b1", a: "c1", b: "c2" }).order).toBe(1);
  });

  it("keeps the order it was given", () => {
    expect(createBond({ id: "b1", a: "c1", b: "c2", order: 2 }).order).toBe(2);
    expect(createBond({ id: "b1", a: "c1", b: "c2", order: 3 }).order).toBe(3);
  });

  it("refuses a bond from an atom to itself", () => {
    // Not a chemistry judgement. A self bond makes atomPairKey degenerate and every
    // bond delta keyed on it meaningless, so it is refused at construction.
    expect(() => createBond({ id: "b1", a: "c1", b: "c1" })).toThrow(/c1/);
  });

  it("keeps the two ends in the order they were written", () => {
    const built = createBond({ id: "b1", a: "c1", b: "cl1" });
    expect(built.a).toBe("c1");
    expect(built.b).toBe("cl1");
  });

  it("omits stereo rather than storing undefined", () => {
    expect("stereo" in createBond({ id: "b1", a: "c1", b: "c2" })).toBe(false);
  });

  it("carries double bond stereo through untouched", () => {
    const stereo: DoubleBondStereo = {
      kind: "doubleBond",
      reference: ["c1", "c4"],
      arrangement: "cis",
    };
    expect(createBond({ id: "b1", a: "c2", b: "c3", order: 2, stereo }).stereo).toEqual(stereo);
  });

  it("freezes the result", () => {
    expect(Object.isFrozen(createBond({ id: "b1", a: "c1", b: "c2" }))).toBe(true);
  });
});

describe("atomPairKey", () => {
  it("is the same whichever end is written first", () => {
    // Bonds are matched across a step by this key, because a bond that forms had no id
    // in the previous state. An order sensitive key would report every formed bond as a
    // different bond depending on which end the author happened to type first.
    expect(atomPairKey("c1", "cl1")).toBe(atomPairKey("cl1", "c1"));
  });

  it("sorts the two ids", () => {
    expect(atomPairKey("c1", "cl1")).toBe("c1|cl1");
    expect(atomPairKey("cl1", "c1")).toBe("c1|cl1");
    expect(atomPairKey("b", "a")).toBe("a|b");
  });

  it("separates distinct pairs that share a prefix", () => {
    expect(atomPairKey("c1", "c10")).not.toBe(atomPairKey("c1", "c1"));
    expect(atomPairKey("a", "bc")).not.toBe(atomPairKey("ab", "c"));
  });

  it("reads a bond's key off the bond", () => {
    expect(bondPairKey(createBond({ id: "b1", a: "cl1", b: "c1" }))).toBe("c1|cl1");
  });
});

describe("parseAtomPairKey", () => {
  it("round trips a key back to its two ids in sorted order", () => {
    expect(parseAtomPairKey(atomPairKey("cl1", "c1"))).toEqual(["c1", "cl1"]);
  });

  it("splits on the first separator", () => {
    expect(parseAtomPairKey("a|b")).toEqual(["a", "b"]);
  });

  it("throws on a string that is not a key", () => {
    expect(() => parseAtomPairKey("c1c2")).toThrow(/c1c2/);
    expect(() => parseAtomPairKey("")).toThrow();
  });
});

describe("otherEnd", () => {
  const single = createBond({ id: "b1", a: "c1", b: "cl1" });

  it("returns the far end from either side", () => {
    expect(otherEnd(single, "c1")).toBe("cl1");
    expect(otherEnd(single, "cl1")).toBe("c1");
  });

  it("throws when the atom is not on the bond", () => {
    expect(() => otherEnd(single, "o1")).toThrow(/o1/);
  });
});

describe("bondTouches", () => {
  const single = createBond({ id: "b1", a: "c1", b: "cl1" });

  it("is true at both ends and false elsewhere", () => {
    expect(bondTouches(single, "c1")).toBe(true);
    expect(bondTouches(single, "cl1")).toBe(true);
    expect(bondTouches(single, "o1")).toBe(false);
  });
});
