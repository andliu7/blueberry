import { describe, expect, it, vi } from "vitest";

import { isConservationFamilyCheck } from "../src/checks/conservation/family.ts";

/**
 * ADVERSARY PASS TWO, PHASE 1. "ALSO WORTH PROBING" ITEM 1 IN THE BRIEF.
 *
 * conservation-disfavoured-rate-comparison's rule 4, the one that closed the Phase 1
 * adversary's third finding, decides whether a fixture's named competing route is believed
 * by asking `@blueberry/feedback`'s `competingRoutesFor(CAUSE)`, which reads
 * `STERICS_COPY.sn2_center_strongly_hindered.competingRoutes` in
 * packages/feedback/src/copy/sterics.ts. That array is `["carbocation_rearrangement"]` today,
 * which is why `broken-known-limit-rate-comparison-naming-a-route-the-engine-does-not-name`
 * correctly fails when it names `radical_halogenation` instead.
 *
 * `validators.lock.json` hashes only files inside `packages/validators`, confirmed by
 * inspecting `lock.files` directly: every entry under the `feedback` heading is a path
 * beginning `src/checks/feedback/` or `tests/`, i.e. this package's OWN feedback-consuming
 * code, never `packages/feedback/src/copy/sterics.ts` itself. So the fact that changed
 * chemistry (which route beats a strongly hindered SN2) lives in a file this suite's own
 * integrity gate does not fingerprint at all. Anybody who can write to packages/feedback,
 * which is a normal implementation package and not inside this adversary's write scope,
 * can make `radical_halogenation`, or any other MechanismRoute id, the believed answer for
 * `sn2_center_strongly_hindered` by editing one array literal, and the validator run
 * afterward is green, the lock is unmodified, and no fixture changed.
 *
 * THIS TEST DEMONSTRATES IT WITHOUT TOUCHING packages/feedback ON DISK, the same technique
 * feedback-copy-coverage.test.ts already uses on chem-core's cause registry: `vi.mock`
 * intercepts the module specifier for this file's own import graph only. It exercises the
 * real, unmodified `conservationDisfavouredRateComparison.find` against a pathway that is
 * bit for bit the neopentyl SN2 chemistry in
 * good-sn2-on-neopentyl-bromide-strongly-disfavoured-not-forbidden, with a rate_comparison
 * annotation naming `radical_halogenation`, the exact route the real, on disk
 * competingRoutesFor rejects today. Two assertions:
 *
 *   1. Against the REAL packages/feedback, re-derived from its own real registry logic
 *      (`causeCopy(id).competingRoutes ?? []`) rather than by reimplementing the number, this
 *      annotation is rejected. This is the control: it proves the fixture used below is the
 *      genuine adversarial shape and not an accident of construction.
 *   2. Against a MOCKED packages/feedback whose `competingRoutesFor` answers
 *      `["radical_halogenation"]` for this cause, exactly what editing
 *      STERICS_COPY.sn2_center_strongly_hindered.competingRoutes in the real file would
 *      produce, the identical pathway object passes with zero violations.
 *
 * The gap this proves: the correctness of conservation-disfavoured-rate-comparison rule 4
 * is not self contained inside the locked, adversary writable corpus. It is a joint claim
 * over a fixture AND a copy file, and only the fixture half is under any integrity
 * guarantee. Widening validators.lock.json to also hash the feedback package's copy files
 * it structurally depends on, or an explicit cross package contract test committed outside
 * this adversary's write scope, would close it. Neither is available from
 * packages/validators/fixtures/ or packages/validators/tests/, so this test is the
 * demonstration rather than the fix.
 */

const HINDERED_CENTRE_CAUSE = "sn2_center_strongly_hindered";
const UNBELIEVED_ROUTE = "radical_halogenation";

function neopentylSn2WithRateComparisonNaming(route: string) {
  return {
    pathway: {
      id: "rate-comparison-lock-gap-demo",
      route: "sn2",
      annotations: [
        {
          kind: "rate_comparison",
          value: `About 10^-5 relative to ethyl bromide. Strongly disfavoured, competing pathway likely: ${route}.`,
          justification: "Adversary construction for rate-comparison-competing-routes-not-locked.test.ts.",
        },
      ],
      steps: [
        {
          id: "step-1",
          identity: { elementaryStep: "concerted_substitution", route: "sn2", reactionCenters: ["C5"] },
          arrows: [
            {
              id: "a1",
              electrons: 2,
              source: { kind: "lonePair", atomId: "O1" },
              sink: { kind: "betweenAtoms", atomIds: ["O1", "C5"] },
            },
            {
              id: "a2",
              electrons: 2,
              source: { kind: "bond", bondId: "b5" },
              sink: { kind: "atom", atomId: "Br1" },
            },
          ],
          from: {
            id: "s0",
            members: [
              {
                role: "substrate",
                species: {
                  id: "neopentyl-bromide",
                  atoms: [
                    { id: "C1", element: "C" },
                    { id: "C2", element: "C", implicitHydrogens: 3 },
                    { id: "C3", element: "C", implicitHydrogens: 3 },
                    { id: "C4", element: "C", implicitHydrogens: 3 },
                    { id: "C5", element: "C", implicitHydrogens: 2 },
                    { id: "Br1", element: "Br", lonePairs: 3 },
                  ],
                  bonds: [
                    { id: "b1", a: "C1", b: "C2", order: 1 },
                    { id: "b2", a: "C1", b: "C3", order: 1 },
                    { id: "b3", a: "C1", b: "C4", order: 1 },
                    { id: "b4", a: "C1", b: "C5", order: 1 },
                    { id: "b5", a: "C5", b: "Br1", order: 1 },
                  ],
                },
              },
              {
                role: "nucleophile",
                species: {
                  id: "hydroxide",
                  atoms: [
                    { id: "O1", element: "O", formalCharge: -1, lonePairs: 3 },
                    { id: "H1", element: "H" },
                  ],
                  bonds: [{ id: "b6", a: "O1", b: "H1", order: 1 }],
                },
              },
            ],
          },
          to: {
            id: "s1",
            members: [
              {
                role: "product",
                species: {
                  id: "neopentyl-alcohol",
                  atoms: [
                    { id: "C1", element: "C" },
                    { id: "C2", element: "C", implicitHydrogens: 3 },
                    { id: "C3", element: "C", implicitHydrogens: 3 },
                    { id: "C4", element: "C", implicitHydrogens: 3 },
                    { id: "C5", element: "C", implicitHydrogens: 2 },
                    { id: "O1", element: "O", lonePairs: 2 },
                    { id: "H1", element: "H" },
                  ],
                  bonds: [
                    { id: "b7", a: "C1", b: "C2", order: 1 },
                    { id: "b8", a: "C1", b: "C3", order: 1 },
                    { id: "b9", a: "C1", b: "C4", order: 1 },
                    { id: "b10", a: "C1", b: "C5", order: 1 },
                    { id: "b11", a: "C5", b: "O1", order: 1 },
                    { id: "b12", a: "O1", b: "H1", order: 1 },
                  ],
                },
              },
              {
                role: "leaving_group",
                species: {
                  id: "bromide",
                  atoms: [{ id: "Br1", element: "Br", formalCharge: -1, lonePairs: 4 }],
                },
              },
            ],
          },
        },
      ],
    },
    // Only `.pathway` is read by conservationDisfavouredRateComparison.find, the same
    // narrow surface the check itself documents in family.ts (`ViolationFinder`).
  } as unknown as import("../src/checks/conservation/fixture-schema.ts").LoadedFixture;
}

describe("conservation-disfavoured-rate-comparison rule 4, and what actually guarantees it", () => {
  it("control: against the real, unmocked packages/feedback, radical_halogenation is rejected for the neopentyl cause", async () => {
    const { conservationDisfavouredRateComparison } = await import(
      "../src/checks/conservation/rate-comparison.ts"
    );
    if (!isConservationFamilyCheck(conservationDisfavouredRateComparison)) {
      throw new Error("conservation-disfavoured-rate-comparison is no longer a family check");
    }
    const violations = conservationDisfavouredRateComparison.find(
      neopentylSn2WithRateComparisonNaming(UNBELIEVED_ROUTE),
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((violation) => violation.cause === "route_requires_conditions_not_present")).toBe(
      true,
    );
  });
});

describe("conservation-disfavoured-rate-comparison rule 4, with packages/feedback mocked to believe the wrong route", () => {
  it("the identical fixture object, unchanged, now passes with zero violations", async () => {
    // vi.doMock, unlike vi.mock, is not hoisted to the top of the file, so it is safe to
    // register it here, after the control test above has already exercised the real
    // module. Registered inside the test body rather than at describe scope on purpose:
    // describe callbacks run once during collection, before either `it` body runs, so a
    // doMock placed there would poison the "control" test that has to run against the
    // real, unmocked package.
    vi.resetModules();
    vi.doMock("@blueberry/feedback", async (importOriginal) => {
      const actual = await importOriginal<Record<string, unknown>>();
      return {
        ...actual,
        // Exactly what editing STERICS_COPY.sn2_center_strongly_hindered.competingRoutes in
        // packages/feedback/src/copy/sterics.ts to add "radical_halogenation" would
        // produce, reached here through a module mock instead, because packages/feedback
        // is outside this adversary's write scope and validators.lock.json does not hash
        // it either way.
        competingRoutesFor: (id: string) => (id === HINDERED_CENTRE_CAUSE ? [UNBELIEVED_ROUTE] : []),
      };
    });

    const { conservationDisfavouredRateComparison } = await import(
      "../src/checks/conservation/rate-comparison.ts"
    );
    if (!isConservationFamilyCheck(conservationDisfavouredRateComparison)) {
      throw new Error("conservation-disfavoured-rate-comparison is no longer a family check");
    }
    const violations = conservationDisfavouredRateComparison.find(
      neopentylSn2WithRateComparisonNaming(UNBELIEVED_ROUTE),
    );
    expect(violations).toEqual([]);

    vi.doUnmock("@blueberry/feedback");
    vi.resetModules();
  });
});
