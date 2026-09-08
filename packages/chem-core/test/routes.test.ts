import { describe, expect, it } from "vitest";

import { allMechanismRoutes, routeLabel, type MechanismRoute } from "../src/routes.ts";

describe("the route registry", () => {
  it("is frozen and non empty", () => {
    expect(Object.isFrozen(allMechanismRoutes())).toBe(true);
    expect(allMechanismRoutes().length).toBeGreaterThan(0);
  });

  it("covers the four families the Phase 1 corpus spans", () => {
    // BUILD-PROMPT.md Phase 1 exit names substitution, elimination, addition, and
    // carbonyl chemistry. A route missing here cannot be named by
    // correct_alternative_route, so the corpus could not describe its own answer.
    for (const route of [
      "sn1",
      "sn2",
      "e1",
      "e2",
      "electrophilic_addition_alkene",
      "nucleophilic_addition_carbonyl",
      "nucleophilic_acyl_substitution",
    ] as const) {
      expect(allMechanismRoutes()).toContain(route);
    }
  });

  it("has no duplicates", () => {
    const routes = allMechanismRoutes();
    expect(new Set(routes).size).toBe(routes.length);
  });
});

describe("routeLabel", () => {
  it("gives every route a non empty human readable label", () => {
    const routes = allMechanismRoutes();
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const label = routeLabel(route);
      expect(typeof label).toBe("string");
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives every route a distinct label", () => {
    // Feedback names the competing pathway by label. Two routes sharing a label makes
    // "a different route wins here" unreadable.
    const labels = allMechanismRoutes().map((route) => routeLabel(route));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("uses the capitalisation a textbook uses", () => {
    // The union member is snake case for the machine; the label is what a student reads.
    // If these were the same string the feedback copy would say "sn2".
    expect(routeLabel("sn1")).toBe("SN1");
    expect(routeLabel("sn2")).toBe("SN2");
    expect(routeLabel("e2")).toBe("E2");
    expect(routeLabel("e1cb")).toBe("E1cb");
    expect(routeLabel("acid_base_proton_transfer")).toBe("acid base proton transfer");
  });

  it("returns undefined for a route that is not in the table rather than a wrong label", () => {
    expect(routeLabel("not_a_route" as MechanismRoute)).toBeUndefined();
  });
});
