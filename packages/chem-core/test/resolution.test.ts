import { describe, expect, it } from "vitest";

import { namedCause } from "../src/causes.ts";
import {
  blockingAdvisories,
  countByKind,
  distinctCauseCount,
  isChemicallyValid,
  primaryCauseIsConsistent,
  reachesRequestedProduct,
  resolutionCauses,
  type AttemptResolution,
} from "../src/resolution.ts";

const correct: AttemptResolution = {
  kind: "correct",
  route: "sn2",
  cause: namedCause({ id: "matches_requested_route" }),
  advisories: [],
};

const alternative: AttemptResolution = {
  kind: "correct_alternative_route",
  routeTaken: "sn1",
  routeRequested: "sn2",
  cause: namedCause({ id: "alternative_route_same_product" }),
  advisories: [],
};

const notRequested: AttemptResolution = {
  kind: "valid_not_requested",
  built: { kind: "elimination", route: "e2", productSpeciesIds: ["sp-alkene"] },
  cause: namedCause({ id: "valid_transformation_not_requested" }),
  advisories: [],
};

const invalid: AttemptResolution = {
  kind: "invalid",
  cause: namedCause({ id: "arrow_endpoints_not_adjacent", subjects: [{ kind: "arrow", arrowId: "a1" }] }),
  advisories: [],
};

const all = [correct, alternative, notRequested, invalid] as const;

describe("the four result types", () => {
  it("carries the route taken on an alternative route, per CLAUDE.md result type two", () => {
    // Students reach right answers by legitimate other paths, and grading that as "not
    // the requested transformation" is unfair and generates support mail.
    expect(alternative.routeTaken).toBe("sn1");
    expect(alternative.routeRequested).toBe("sn2");
  });

  it("carries what was actually built on valid_not_requested, per result type three", () => {
    expect(notRequested.built.kind).toBe("elimination");
    expect(notRequested.built.route).toBe("e2");
    expect(notRequested.built.productSpeciesIds).toEqual(["sp-alkene"]);
  });

  it("gives every outcome a named cause, including the correct one", () => {
    // A student who gets it right is told which route they were recognised as taking,
    // which is worth as much as the mark.
    for (const resolution of all) {
      expect(resolution.cause.id.length).toBeGreaterThan(0);
    }
  });
});

describe("isChemicallyValid", () => {
  it("is true for the three sound outcomes and false only for invalid", () => {
    expect(isChemicallyValid(correct)).toBe(true);
    expect(isChemicallyValid(alternative)).toBe(true);
    expect(isChemicallyValid(notRequested)).toBe(true);
    expect(isChemicallyValid(invalid)).toBe(false);
  });
});

describe("reachesRequestedProduct", () => {
  it("is true for both correct outcomes", () => {
    expect(reachesRequestedProduct(correct)).toBe(true);
    expect(reachesRequestedProduct(alternative)).toBe(true);
  });

  it("is false for a sound but different transformation", () => {
    // Sound chemistry that does not reach the requested product. Separating this from
    // isChemicallyValid is the whole reason there are four outcomes and not two.
    expect(reachesRequestedProduct(notRequested)).toBe(false);
    expect(reachesRequestedProduct(invalid)).toBe(false);
  });
});

describe("resolutionCauses", () => {
  it("puts the primary cause first, then the advisories in order", () => {
    const graded: AttemptResolution = {
      kind: "correct",
      route: "sn2",
      cause: namedCause({ id: "matches_requested_route" }),
      advisories: [
        namedCause({ id: "sn2_center_strongly_hindered", relatedRoute: "carbocation_rearrangement" }),
        namedCause({ id: "leaving_group_too_poor" }),
      ],
    };
    expect(resolutionCauses(graded).map((cause) => cause.id)).toEqual([
      "matches_requested_route",
      "sn2_center_strongly_hindered",
      "leaving_group_too_poor",
    ]);
  });

  it("is just the primary cause when there are no advisories", () => {
    expect(resolutionCauses(invalid).map((cause) => cause.id)).toEqual([
      "arrow_endpoints_not_adjacent",
    ]);
  });
});

describe("primaryCauseIsConsistent", () => {
  it("accepts each outcome's own success cause", () => {
    expect(primaryCauseIsConsistent(correct)).toBe(true);
    expect(primaryCauseIsConsistent(alternative)).toBe(true);
    expect(primaryCauseIsConsistent(notRequested)).toBe(true);
    expect(primaryCauseIsConsistent(invalid)).toBe(true);
  });

  it("rejects a blocking cause on a correct answer", () => {
    // Which would tell a student they were right and then explain why they were wrong.
    const contradictory: AttemptResolution = {
      kind: "correct",
      route: "sn2",
      cause: namedCause({ id: "valence_exceeded" }),
      advisories: [],
    };
    expect(primaryCauseIsConsistent(contradictory)).toBe(false);
  });

  it("rejects a success cause on an invalid attempt", () => {
    const contradictory: AttemptResolution = {
      kind: "invalid",
      cause: namedCause({ id: "matches_requested_route" }),
      advisories: [],
    };
    expect(primaryCauseIsConsistent(contradictory)).toBe(false);
  });

  it("rejects one outcome's success cause used on another outcome", () => {
    const swapped: AttemptResolution = {
      kind: "correct",
      route: "sn2",
      cause: namedCause({ id: "alternative_route_same_product" }),
      advisories: [],
    };
    expect(primaryCauseIsConsistent(swapped)).toBe(false);
  });

  it("accepts an advisory cause as the primary cause where the registry allows it", () => {
    const advisoryPrimary: AttemptResolution = {
      kind: "correct",
      route: "sn2",
      cause: namedCause({ id: "sn2_center_strongly_hindered" }),
      advisories: [],
    };
    expect(primaryCauseIsConsistent(advisoryPrimary)).toBe(true);
  });
});

describe("blockingAdvisories", () => {
  it("is empty when every advisory is advisory", () => {
    const graded: AttemptResolution = {
      kind: "correct",
      route: "sn2",
      cause: namedCause({ id: "matches_requested_route" }),
      advisories: [namedCause({ id: "sn2_center_strongly_hindered" })],
    };
    expect(blockingAdvisories(graded)).toEqual([]);
  });

  it("names an advisory that is really a blocking cause", () => {
    // Impossible chemistry is not advice.
    const smuggled: AttemptResolution = {
      kind: "correct",
      route: "sn2",
      cause: namedCause({ id: "matches_requested_route" }),
      advisories: [
        namedCause({ id: "sn2_center_strongly_hindered" }),
        namedCause({ id: "valence_exceeded" }),
      ],
    };
    expect(blockingAdvisories(smuggled).map((cause) => cause.id)).toEqual(["valence_exceeded"]);
  });

  it("ignores the primary cause, however blocking it is", () => {
    expect(blockingAdvisories(invalid)).toEqual([]);
  });

  it("does not treat an informational cause as blocking", () => {
    const informational: AttemptResolution = {
      kind: "correct",
      route: "sn2",
      cause: namedCause({ id: "matches_requested_route" }),
      advisories: [namedCause({ id: "matches_requested_route" })],
    };
    expect(blockingAdvisories(informational)).toEqual([]);
  });
});

describe("distinctCauseCount", () => {
  it("is zero over an empty list", () => {
    expect(distinctCauseCount([])).toBe(0);
  });

  it("counts a cause once however many resolutions carry it", () => {
    expect(distinctCauseCount([invalid, invalid, invalid])).toBe(1);
  });

  it("counts advisories as well as primary causes", () => {
    // The feedback axis measures distinct named causes reachable. An advisory that only
    // ever rides along is still a distinct thing a student was told.
    const graded: AttemptResolution = {
      kind: "correct",
      route: "sn2",
      cause: namedCause({ id: "matches_requested_route" }),
      advisories: [namedCause({ id: "sn2_center_strongly_hindered" })],
    };
    expect(distinctCauseCount([graded])).toBe(2);
  });

  it("counts across resolutions", () => {
    expect(distinctCauseCount([...all])).toBe(4);
  });
});

describe("countByKind", () => {
  it("reports zero for every kind over an empty list rather than omitting keys", () => {
    expect(countByKind([])).toEqual({
      correct: 0,
      correct_alternative_route: 0,
      valid_not_requested: 0,
      invalid: 0,
    });
  });

  it("counts one of each", () => {
    expect(countByKind([...all])).toEqual({
      correct: 1,
      correct_alternative_route: 1,
      valid_not_requested: 1,
      invalid: 1,
    });
  });

  it("accumulates repeats", () => {
    expect(countByKind([invalid, invalid, correct])).toEqual({
      correct: 1,
      correct_alternative_route: 0,
      valid_not_requested: 0,
      invalid: 2,
    });
  });

  it("sums to the number of resolutions given", () => {
    const counts = countByKind([...all, invalid]);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(5);
  });
});
