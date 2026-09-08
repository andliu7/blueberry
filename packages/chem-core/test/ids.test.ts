import { describe, expect, it } from "vitest";

import {
  IMPLICIT_HYDROGEN,
  LONE_PAIR,
  RESERVED_ID_PREFIX,
  isImplicitHydrogenSlot,
  isLonePairSlot,
  isSentinelId,
} from "../src/ids.ts";

describe("reserved identifiers", () => {
  it("uses a prefix no real id would carry, and both sentinels use it", () => {
    expect(RESERVED_ID_PREFIX).toBe("@");
    expect(IMPLICIT_HYDROGEN.startsWith(RESERVED_ID_PREFIX)).toBe(true);
    expect(LONE_PAIR.startsWith(RESERVED_ID_PREFIX)).toBe(true);
  });

  it("keeps the two sentinels distinct", () => {
    // They fill different slots in a stereo neighbour list. One value for both would
    // make a pyramidal sulfoxide indistinguishable from a CH stereocenter.
    expect(IMPLICIT_HYDROGEN).not.toBe(LONE_PAIR);
  });
});

describe("isSentinelId", () => {
  it("is true for both sentinels", () => {
    expect(isSentinelId(IMPLICIT_HYDROGEN)).toBe(true);
    expect(isSentinelId(LONE_PAIR)).toBe(true);
  });

  it("is false for ordinary atom ids", () => {
    expect(isSentinelId("c1")).toBe(false);
    expect(isSentinelId("")).toBe(false);
    expect(isSentinelId("h1")).toBe(false);
  });

  it("keys on the prefix rather than on the two known values", () => {
    // A future sentinel must be caught by the same test a validator already runs.
    expect(isSentinelId("@somethingElse")).toBe(true);
  });

  it("looks at the start of the id, not anywhere in it", () => {
    expect(isSentinelId("c1@")).toBe(false);
    expect(isSentinelId("atom@implicitH")).toBe(false);
  });
});

describe("slot predicates", () => {
  it("match their own sentinel and nothing else", () => {
    expect(isImplicitHydrogenSlot(IMPLICIT_HYDROGEN)).toBe(true);
    expect(isImplicitHydrogenSlot(LONE_PAIR)).toBe(false);
    expect(isImplicitHydrogenSlot("h1")).toBe(false);

    expect(isLonePairSlot(LONE_PAIR)).toBe(true);
    expect(isLonePairSlot(IMPLICIT_HYDROGEN)).toBe(false);
    expect(isLonePairSlot("lp")).toBe(false);
  });

  it("compare exactly, so a near miss is not silently accepted", () => {
    expect(isImplicitHydrogenSlot("@implicith")).toBe(false);
    expect(isLonePairSlot("@lonepair")).toBe(false);
  });
});
