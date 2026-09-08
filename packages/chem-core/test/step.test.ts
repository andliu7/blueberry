import { describe, expect, it } from "vitest";

import { createArrow, fromLonePair, toBondBetween } from "../src/arrows.ts";
import { createPathway, createStep, finalState, initialState } from "../src/step.ts";
import { atom, member, species, state } from "./helpers.ts";

const before = () => state("st-0", [member(species("sp1", [atom("c1", "C", { implicitHydrogens: 4 })]))]);
const after = () => state("st-1", [member(species("sp1", [atom("c1", "C", { implicitHydrogens: 3 })]))]);

function step(id: string, from = before(), to = after()) {
  return createStep({
    id,
    from,
    to,
    identity: { elementaryStep: "proton_transfer", reactionCenters: ["c1"] },
  });
}

describe("createStep", () => {
  it("keeps the two states as given, and does not mutate `from`", () => {
    const from = before();
    const to = after();
    const built = step("s1", from, to);
    expect(built.from).toBe(from);
    expect(built.to).toBe(to);
    expect(from.members[0]?.species.atoms[0]?.implicitHydrogens).toBe(4);
  });

  it("defaults arrows to an empty frozen list", () => {
    const built = step("s1");
    expect(built.arrows).toEqual([]);
    expect(Object.isFrozen(built.arrows)).toBe(true);
  });

  it("keeps the arrows it was given", () => {
    const arrow = createArrow({
      id: "a1",
      source: fromLonePair("c1"),
      sink: toBondBetween("c1", "c2"),
    });
    const built = createStep({
      id: "s1",
      from: before(),
      to: after(),
      arrows: [arrow],
      identity: { elementaryStep: "nucleophilic_attack", reactionCenters: ["c1"] },
    });
    expect(built.arrows).toEqual([arrow]);
  });

  it("copies the arrow list rather than aliasing the caller's array", () => {
    const arrows = [
      createArrow({ id: "a1", source: fromLonePair("c1"), sink: toBondBetween("c1", "c2") }),
    ];
    const built = createStep({
      id: "s1",
      from: before(),
      to: after(),
      arrows,
      identity: { elementaryStep: "nucleophilic_attack", reactionCenters: ["c1"] },
    });
    arrows.length = 0;
    expect(built.arrows).toHaveLength(1);
  });

  it("carries axis one, the identity, separately from anything a student did", () => {
    const built = createStep({
      id: "s1",
      from: before(),
      to: after(),
      identity: {
        elementaryStep: "leaving_group_departure",
        route: "sn1",
        reactionCenters: ["c1", "cl1"],
      },
    });
    expect(built.identity.elementaryStep).toBe("leaving_group_departure");
    expect(built.identity.route).toBe("sn1");
    expect(built.identity.reactionCenters).toEqual(["c1", "cl1"]);
  });

  it("omits route rather than storing undefined, because a lone proton transfer has none", () => {
    expect("route" in step("s1").identity).toBe(false);
  });

  it("freezes the step and its identity", () => {
    const built = step("s1");
    expect(Object.isFrozen(built)).toBe(true);
    expect(Object.isFrozen(built.identity)).toBe(true);
    expect(Object.isFrozen(built.identity.reactionCenters)).toBe(true);
  });
});

describe("createPathway", () => {
  it("keeps its id, route, and steps", () => {
    const pathway = createPathway({ id: "p1", route: "sn2", steps: [step("s1")] });
    expect(pathway.id).toBe("p1");
    expect(pathway.route).toBe("sn2");
    expect(pathway.steps).toHaveLength(1);
  });

  it("omits annotations rather than storing undefined", () => {
    expect("annotations" in createPathway({ id: "p1", route: "sn2", steps: [] })).toBe(false);
  });

  it("carries authored annotations, which the engine must never compute", () => {
    // CLAUDE.md: the SN1 racemisation ratio is an authoring annotation, never a computed
    // assertion. This field is where a human's claim is recorded with its justification.
    const pathway = createPathway({
      id: "p1",
      route: "sn1",
      steps: [],
      annotations: [
        {
          kind: "racemisation_ratio",
          value: "roughly 60 percent inversion excess",
          justification: "measured for this substrate in aqueous acetone",
        },
      ],
    });
    expect(pathway.annotations).toHaveLength(1);
    expect(pathway.annotations?.[0]?.kind).toBe("racemisation_ratio");
    expect(pathway.annotations?.[0]?.justification.length).toBeGreaterThan(0);
  });

  it("copies the step list rather than aliasing it", () => {
    const steps = [step("s1")];
    const pathway = createPathway({ id: "p1", route: "sn2", steps });
    steps.length = 0;
    expect(pathway.steps).toHaveLength(1);
  });

  it("freezes the pathway and its steps", () => {
    const pathway = createPathway({ id: "p1", route: "sn2", steps: [step("s1")] });
    expect(Object.isFrozen(pathway)).toBe(true);
    expect(Object.isFrozen(pathway.steps)).toBe(true);
  });
});

describe("initialState and finalState", () => {
  it("are the first step's from and the last step's to", () => {
    const from = before();
    const to = after();
    const middle = state("st-mid", from.members.map((m) => m));
    const pathway = createPathway({
      id: "p1",
      route: "sn1",
      steps: [step("s1", from, middle), step("s2", middle, to)],
    });
    expect(initialState(pathway)).toBe(from);
    expect(finalState(pathway)).toBe(to);
  });

  it("are the same step's two states in a one step pathway", () => {
    const pathway = createPathway({ id: "p1", route: "sn2", steps: [step("s1")] });
    expect(initialState(pathway)?.id).toBe("st-0");
    expect(finalState(pathway)?.id).toBe("st-1");
  });

  it("are undefined for a pathway with no steps rather than throwing", () => {
    const empty = createPathway({ id: "p1", route: "sn2", steps: [] });
    expect(initialState(empty)).toBeUndefined();
    expect(finalState(empty)).toBeUndefined();
  });
});
