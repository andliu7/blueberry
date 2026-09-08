import { describe, expect, it } from "vitest";

import {
  CAUSES,
  allCauseIds,
  causeAppliesTo,
  causeCount,
  causeDefinition,
  causeIdsByCategory,
  causeIdsBySeverity,
  namedCause,
  type CauseCategory,
  type CauseId,
  type CauseSeverity,
  type ResolutionKind,
} from "../src/causes.ts";

const CATEGORIES: readonly CauseCategory[] = [
  "success",
  "valence",
  "conservation",
  "electron_flow",
  "stereochemistry",
  "sterics",
  "reactivity",
  "route",
];

const SEVERITIES: readonly CauseSeverity[] = ["blocking", "advisory", "informational"];

const KINDS: readonly ResolutionKind[] = [
  "correct",
  "correct_alternative_route",
  "valid_not_requested",
  "invalid",
];

describe("the cause registry is countable by construction", () => {
  it("counts exactly the keys of CAUSES", () => {
    expect(causeCount()).toBe(Object.keys(CAUSES).length);
    expect(causeCount()).toBe(allCauseIds().length);
  });

  it("reaches the Phase 1 floor of 12 distinct named causes", () => {
    // BUILD-PROMPT.md Phase 1 exit: at least 12 distinct named failure causes reachable.
    // Written as a floor, never as an equality, so authoring a new cause does not fail a
    // test and tempt somebody to delete the cause instead of updating the number.
    expect(causeCount()).toBeGreaterThanOrEqual(12);
  });

  it("has no duplicate ids", () => {
    const ids = allCauseIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns a frozen list, so a caller cannot shorten the registry it just read", () => {
    expect(Object.isFrozen(allCauseIds())).toBe(true);
    expect(Object.isFrozen(CAUSES)).toBe(true);
  });
});

describe("every cause definition is complete", () => {
  it("gives every cause a whole definition", () => {
    const ids = allCauseIds();
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
    const definition = causeDefinition(id);

    // The key and the id agree. A definition filed under the wrong key would be looked
    // up by one name and reported under another.
    expect(definition.id).toBe(id);
    expect(CATEGORIES).toContain(definition.category);
    expect(SEVERITIES).toContain(definition.severity);

    // Engine facing copy. CLAUDE.md: a cause without copy is an incomplete cause, and
    // chem-core's own summary and teaches are what a log line and a validator report
    // print. An empty one is the yellow triangle with extra steps.
    expect(definition.summary.trim().length).toBeGreaterThan(0);
    expect(definition.teaches.trim().length).toBeGreaterThan(0);
    expect(definition.summary).not.toBe(definition.teaches);

    // appliesTo is the contract that stops a blocking cause landing on a correct answer.
    expect(definition.appliesTo.length).toBeGreaterThan(0);
    for (const kind of definition.appliesTo) {
      expect(KINDS).toContain(kind);
    }
    expect(new Set(definition.appliesTo).size).toBe(definition.appliesTo.length);
    }
  });

  it("gives every definition an object that cannot be edited at runtime", () => {
    for (const id of allCauseIds()) {
      expect(Object.isFrozen(causeDefinition(id))).toBe(true);
    }
  });

  it("throws on an id that is not in the registry", () => {
    expect(() => causeDefinition("not_a_cause" as CauseId)).toThrow(/not_a_cause/);
  });
});

describe("severity and resolution kind are consistent", () => {
  it("only lets a blocking cause be the primary cause of an invalid attempt", () => {
    for (const id of causeIdsBySeverity("blocking")) {
      expect(causeDefinition(id).appliesTo).toEqual(["invalid"]);
    }
  });

  it("never lets an informational cause sit on an invalid attempt", () => {
    for (const id of causeIdsBySeverity("informational")) {
      expect(causeDefinition(id).appliesTo).not.toContain("invalid");
    }
  });

  it("lets advisory causes sit on a correct answer, which is graded chemistry", () => {
    // CLAUDE.md: neopentyl SN2 is strongly disfavoured and NOT blocked, because the
    // methyl shift is the lesson. That is only expressible if an advisory cause can ride
    // along on an outcome that is not "invalid".
    const advisory = causeIdsBySeverity("advisory");
    expect(advisory.length).toBeGreaterThan(0);
    for (const id of advisory) {
      expect(causeDefinition(id).appliesTo).toContain("correct");
    }
    expect(causeDefinition("sn2_center_strongly_hindered").severity).toBe("advisory");
    expect(causeAppliesTo("sn2_center_strongly_hindered", "correct")).toBe(true);
  });

  it("keeps SN2 inversion a hard assertion", () => {
    // CLAUDE.md, graded chemistry: "SN2 inverts. This one is a hard assertion."
    expect(causeDefinition("sn2_did_not_invert").severity).toBe("blocking");
    expect(causeAppliesTo("sn2_did_not_invert", "correct")).toBe(false);
    expect(causeAppliesTo("sn2_did_not_invert", "invalid")).toBe(true);
  });

  it("keeps the SN1 single configuration note advisory rather than blocking", () => {
    // CLAUDE.md: the ratio is an authoring annotation, never a computed assertion, so
    // showing one configuration is a note and not a refusal.
    expect(
      causeDefinition("stereochemistry_asserted_as_single_product_at_sn1_center").severity,
    ).toBe("advisory");
  });

  it("keeps syn periplanar E2 advisory, because it is real in locked systems", () => {
    expect(causeDefinition("e2_syn_periplanar_unjustified").severity).toBe("advisory");
    expect(causeDefinition("e2_not_periplanar").severity).toBe("blocking");
  });
});

describe("grouping helpers partition the registry", () => {
  it("assigns every cause to exactly one category, and the categories cover it", () => {
    const grouped = CATEGORIES.flatMap((category) => causeIdsByCategory(category));
    expect(grouped.slice().sort()).toEqual(allCauseIds().slice().sort());
  });

  it("assigns every cause to exactly one severity, and the severities cover it", () => {
    const grouped = SEVERITIES.flatMap((severity) => causeIdsBySeverity(severity));
    expect(grouped.slice().sort()).toEqual(allCauseIds().slice().sort());
  });

  it("filters by the field it is named after", () => {
    for (const id of causeIdsByCategory("electron_flow")) {
      expect(causeDefinition(id).category).toBe("electron_flow");
    }
    for (const id of causeIdsBySeverity("advisory")) {
      expect(causeDefinition(id).severity).toBe("advisory");
    }
    expect(causeIdsByCategory("success")).toContain("matches_requested_route");
    expect(causeIdsByCategory("success")).not.toContain("valence_exceeded");
  });

  it("returns an empty list for a category with no members rather than throwing", () => {
    expect(causeIdsByCategory("not_a_category" as CauseCategory)).toEqual([]);
    expect(causeIdsBySeverity("not_a_severity" as CauseSeverity)).toEqual([]);
  });
});

describe("causeAppliesTo", () => {
  it("agrees with the definition for every id and kind pair", () => {
    for (const id of allCauseIds()) {
      for (const kind of KINDS) {
        expect(causeAppliesTo(id, kind)).toBe(causeDefinition(id).appliesTo.includes(kind));
      }
    }
  });

  it("is false for a kind no cause declares", () => {
    expect(causeAppliesTo("matches_requested_route", "invalid")).toBe(false);
    expect(causeAppliesTo("valence_exceeded", "correct")).toBe(false);
  });
});

describe("namedCause", () => {
  it("defaults subjects to an empty frozen list", () => {
    const cause = namedCause({ id: "mass_not_conserved" });
    expect(cause.id).toBe("mass_not_conserved");
    expect(cause.subjects).toEqual([]);
    expect(Object.isFrozen(cause)).toBe(true);
    expect(Object.isFrozen(cause.subjects)).toBe(true);
  });

  it("omits relatedRoute rather than setting it undefined", () => {
    const cause = namedCause({ id: "mass_not_conserved" });
    expect("relatedRoute" in cause).toBe(false);
  });

  it("carries the competing pathway when one is named", () => {
    // CLAUDE.md: the engine says "strongly disfavored, competing pathway likely" and
    // NAMES the competing pathway. That name is this field.
    const cause = namedCause({
      id: "sn2_center_strongly_hindered",
      relatedRoute: "carbocation_rearrangement",
    });
    expect(cause.relatedRoute).toBe("carbocation_rearrangement");
  });

  it("copies the subjects it was given instead of aliasing the caller's array", () => {
    const subjects = [{ kind: "atom", atomId: "c1" } as const];
    const cause = namedCause({ id: "valence_exceeded", subjects });
    expect(cause.subjects).toEqual(subjects);
    expect(cause.subjects).not.toBe(subjects);
  });

  it("keeps every subject shape the union allows", () => {
    const cause = namedCause({
      id: "arrow_endpoints_not_adjacent",
      subjects: [
        { kind: "atom", atomId: "c1" },
        { kind: "bond", bondId: "b1" },
        { kind: "atomPair", atomIds: ["c1", "cl1"] },
        { kind: "species", speciesId: "sp1" },
        { kind: "arrow", arrowId: "a1" },
        { kind: "step", stepId: "s1" },
      ],
    });
    expect(cause.subjects).toHaveLength(6);
    expect(cause.subjects.map((subject) => subject.kind)).toEqual([
      "atom",
      "bond",
      "atomPair",
      "species",
      "arrow",
      "step",
    ]);
  });
});
