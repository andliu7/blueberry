import { describe, expect, it } from "vitest";

import { parseFixture } from "../src/checks/conservation/fixture-schema.ts";

/**
 * ADVERSARY PASS FIVE, PHASE 1, FINDING 2, and the control for its fix.
 *
 * The finding: a fixture refused by the loader could name a second check in
 * `expect.mustFail` alongside the loader's own name. A refused fixture never becomes a
 * LoadedFixture, so no other check's `find()` ever runs against it. Every check in the
 * family saw the load error, confirmed the loader refusal was declared, and skipped, so
 * the second name was accepted syntactically and then verified by nothing. The suite
 * stayed green either way and the claim read as tested.
 *
 * That is the same class of defect as a check with no negative control: it looks like
 * evidence and is not. `mustFail` is supposed to mean "the suite tests this claim", and
 * this was the one entry where it did not.
 *
 * WHY THIS LIVES IN tests/ AND NOT IN fixtures/.
 *
 * The rejection happens while parsing `expect` itself, which is earlier than the point at
 * which a fixture can declare anything at all. So a fixture demonstrating the rejection
 * cannot parse far enough to claim the loader exemption, and would instead fail hard in
 * every check in the family. The corpus has no way to say "this file is supposed to be
 * unparseable in this specific way". A test can.
 */

const ROUTE_IS_NOT_A_ROUTE = {
  schemaVersion: 2,
  id: "probe",
  title: "A fixture the loader refuses, for a reason that is not the point of this test",
  expect: {
    kind: "broken",
    mustFail: ["conservation-fixture-schema", "conservation-valence"],
    note: "Names a second check beside the loader. That second claim is unverifiable.",
  },
  pathway: { id: "p", route: "sn2z", steps: [] },
};

function parse(body: unknown): { ok: boolean; message: string } {
  try {
    parseFixture(JSON.stringify(body), "probe.fixture.json", "probe.fixture.json");
    return { ok: true, message: "" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

describe("a loader refusal cannot also claim to be another check's negative control", () => {
  it("rejects an expect block naming the loader alongside another check", () => {
    const result = parse(ROUTE_IS_NOT_A_ROUTE);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("conservation-fixture-schema");
    expect(result.message).toContain("conservation-valence");
    expect(result.message).toContain("a claim nothing verifies");
  });

  it("still accepts the loader named alone, which is the legitimate declaration", () => {
    const loaderOnly = {
      ...ROUTE_IS_NOT_A_ROUTE,
      expect: { ...ROUTE_IS_NOT_A_ROUTE.expect, mustFail: ["conservation-fixture-schema"] },
    };
    const result = parse(loaderOnly);
    // Still refused, because this probe is deliberately malformed in more than one way.
    // The point is not WHICH refusal it gets, it is that the refusal is no longer the
    // mustFail one, so the fixture is free to declare the exemption and be read as its own
    // fired control. Asserting the specific downstream message would pin this test to
    // whichever malformation the parser happens to reach first, which is not the subject.
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("a claim nothing verifies");
  });

  it("leaves an ordinary multi check declaration alone when the loader is not named", () => {
    const ordinary = {
      ...ROUTE_IS_NOT_A_ROUTE,
      expect: {
        ...ROUTE_IS_NOT_A_ROUTE.expect,
        mustFail: ["conservation-mass", "conservation-electron-flow"],
      },
    };
    const result = parse(ordinary);
    // A cascade across several checks is normal and is how the corpus records one defect
    // that genuinely trips more than one check. Only the loader name is exclusive.
    expect(result.message).not.toContain("a claim nothing verifies");
  });
});
