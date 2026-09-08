/**
 * Reagent sets, ordered synthesis, and the rule that the direction field is
 * metadata rather than a second comparison.
 */

import { describe, expect, it } from "vitest";
import {
  checkReagents,
  createReagentsAnswer,
  normaliseReagent,
  reagentStateMatches,
  type ReagentState,
} from "../src/answers/reagents.ts";

function steps(...groups: readonly (readonly string[])[]): ReagentState {
  return { kind: "reagents", steps: groups.map((reagents) => ({ reagents: [...reagents] })) };
}

describe("reagent sets", () => {
  const answer = createReagentsAnswer({
    mode: "set",
    steps: [{ reagents: ["Br2"] }],
    equivalents: [["Br2", "bromine"]],
  });

  it("matches regardless of order inside the flask", () => {
    const twoReagents = createReagentsAnswer({
      mode: "set",
      steps: [{ reagents: ["HNO3", "H2SO4"] }],
    });
    expect(checkReagents(twoReagents, steps(["H2SO4", "HNO3"]))).toEqual({ outcome: "correct" });
  });

  it("accepts an authored equivalent spelling", () => {
    expect(checkReagents(answer, steps(["bromine"]))).toEqual({ outcome: "correct" });
    expect(checkReagents(answer, steps([" Br2 "]))).toEqual({ outcome: "correct" });
  });

  it("names a missing reagent", () => {
    const pair = createReagentsAnswer({ mode: "set", steps: [{ reagents: ["HNO3", "H2SO4"] }] });
    expect(checkReagents(pair, steps(["HNO3"]))).toMatchObject({
      cause: "reagent_set_incomplete",
    });
  });

  it("names an extra reagent", () => {
    expect(checkReagents(answer, steps(["Br2", "H2O"]))).toMatchObject({
      cause: "reagent_set_has_extra_reagent",
    });
  });

  it("falls back to the generic cause when both are wrong", () => {
    expect(checkReagents(answer, steps(["HBr"]))).toMatchObject({
      cause: "reagent_set_does_not_match",
    });
  });

  it("keeps case, because CO and Co are different substances", () => {
    expect(normaliseReagent("  Br2  ")).toBe("Br2");
    expect(checkReagents(answer, steps(["br2"]))).toMatchObject({ outcome: "wrong" });
  });

  it("refuses a set answer with more than one step", () => {
    expect(() =>
      createReagentsAnswer({ mode: "set", steps: [{ reagents: ["A"] }, { reagents: ["B"] }] }),
    ).toThrow(/one unordered flask/);
  });
});

describe("ordered synthesis", () => {
  const answer = createReagentsAnswer({
    mode: "sequence",
    steps: [{ reagents: ["HNO3", "H2SO4"] }, { reagents: ["Br2", "FeBr3"] }],
    equivalents: [["FeBr3", "AlBr3"]],
  });

  it("accepts the authored order", () => {
    expect(checkReagents(answer, steps(["HNO3", "H2SO4"], ["Br2", "FeBr3"]))).toEqual({
      outcome: "correct",
    });
  });

  it("accepts an equivalent reagent inside a step", () => {
    expect(checkReagents(answer, steps(["HNO3", "H2SO4"], ["Br2", "AlBr3"]))).toEqual({
      outcome: "correct",
    });
  });

  it("names the right steps in the wrong order", () => {
    expect(checkReagents(answer, steps(["Br2", "FeBr3"], ["HNO3", "H2SO4"]))).toMatchObject({
      cause: "synthesis_steps_out_of_order",
    });
  });

  it("names a step count that does not match", () => {
    expect(checkReagents(answer, steps(["HNO3", "H2SO4", "Br2", "FeBr3"]))).toMatchObject({
      cause: "synthesis_step_count_wrong",
    });
  });

  it("accepts an authored alternative route", () => {
    const withAlternative = createReagentsAnswer({
      mode: "sequence",
      steps: [{ reagents: ["NaNH2"] }, { reagents: ["CH3CH2Br"] }],
      acceptedAlternatives: [[{ reagents: ["NaH"] }, { reagents: ["CH3CH2I"] }]],
    });
    expect(checkReagents(withAlternative, steps(["NaH"], ["CH3CH2I"]))).toEqual({
      outcome: "correct",
    });
  });

  it("reports nothing submitted as an incomplete set rather than crashing", () => {
    expect(checkReagents(answer, { kind: "reagents", steps: [] })).toMatchObject({
      cause: "reagent_set_incomplete",
    });
  });
});

describe("direction is metadata", () => {
  it("grades a retrosynthesis exactly as it grades a synthesis", () => {
    const forward = createReagentsAnswer({
      mode: "sequence",
      direction: "forward",
      steps: [{ reagents: ["NaNH2"] }, { reagents: ["CH3CH2Br"] }],
    });
    const backward = createReagentsAnswer({
      mode: "sequence",
      direction: "retrosynthesis",
      steps: [{ reagents: ["NaNH2"] }, { reagents: ["CH3CH2Br"] }],
    });
    const submission = steps(["NaNH2"], ["CH3CH2Br"]);
    expect(checkReagents(forward, submission)).toEqual(checkReagents(backward, submission));

    const wrongOrder = steps(["CH3CH2Br"], ["NaNH2"]);
    expect(checkReagents(forward, wrongOrder)).toEqual(checkReagents(backward, wrongOrder));
  });
});

describe("distractor matching on state", () => {
  it("compares a set without order and a sequence with it", () => {
    const target = steps(["Br2", "H2O"]);
    expect(reagentStateMatches(target, steps(["H2O", "Br2"]), [], "set")).toBe(true);

    const ordered = steps(["A"], ["B"]);
    expect(reagentStateMatches(ordered, steps(["A"], ["B"]), [], "sequence")).toBe(true);
    expect(reagentStateMatches(ordered, steps(["B"], ["A"]), [], "sequence")).toBe(false);
  });

  it("applies the problem's equivalence groups", () => {
    expect(reagentStateMatches(steps(["Br2"]), steps(["bromine"]), [["Br2", "bromine"]], "set")).toBe(
      true,
    );
  });
});
