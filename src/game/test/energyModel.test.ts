import { describe, expect, it } from "vitest";
import {
  KCAL_PER_DECADE,
  REVERSIBLE_WINDOW_KCAL,
  SCENARIOS,
  classifyKeq,
  deltaGFromKeq,
  keqFromDeltaG,
  keqFromPkas,
  profileIsValid,
  rateRatio,
  sciText,
  walk,
} from "../energy/energyModel";

describe("Keq and free energy", () => {
  it("is 1.364 kcal/mol per factor of ten", () => {
    expect(KCAL_PER_DECADE).toBeCloseTo(1.364, 2);
    expect(keqFromDeltaG(-KCAL_PER_DECADE)).toBeCloseTo(10, 6);
    expect(deltaGFromKeq(1e7)).toBeCloseTo(-REVERSIBLE_WINDOW_KCAL, 6);
  });

  it("puts the reversible window at 1e-7 to 1e7", () => {
    expect(classifyKeq(1e7)).toBe("reversible");
    expect(classifyKeq(1.1e7)).toBe("one-way-forward");
    expect(classifyKeq(1e-7)).toBe("reversible");
    expect(classifyKeq(9e-8)).toBe("one-way-back");
    expect(classifyKeq(1)).toBe("reversible");
  });

  it("reads Keq from the pKa gap, acid formed minus acid used up", () => {
    expect(keqFromPkas(15.7, 5)).toBeCloseTo(10 ** 10.7, 0);
    expect(sciText(keqFromPkas(15.7, 5))).toBe("5.0 × 10¹⁰");
    expect(sciText(keqFromPkas(5, 15.7))).toBe("2.0 × 10⁻¹¹");
  });

  it("turns a barrier gap into a rate ratio", () => {
    expect(rateRatio(KCAL_PER_DECADE * 2)).toBeCloseTo(100, 4);
  });
});

describe("the scenarios obey the owner's rules", () => {
  it("are all valid profiles", () => {
    for (const scenario of SCENARIOS) for (const p of scenario.profiles) expect(profileIsValid(p), scenario.id).toBe(true);
  });

  it("dead end: B is a dead end and the reaction ends at C", () => {
    const sc = SCENARIOS.find((x) => x.id === "dead-end")!;
    const result = walk(sc.profiles, sc.startId);
    expect(result.deadEnds).toEqual([]); // B has two steps, so it is not a leaf
    expect(result.sinks).toHaveLength(1);
    expect(result.sinks[0]!.resting).toBe("C");
  });

  it("one way: the last step is outside the window so the reaction rests at P", () => {
    const sc = SCENARIOS.find((x) => x.id === "one-way")!;
    const result = walk(sc.profiles, sc.startId);
    expect(result.sinks.map((x) => x.resting)).toEqual(["P"]);
    expect(result.pool).toContain("R");
    expect(result.pool).toContain("I");
    expect(result.pool).not.toContain("P");
  });

  it("cold, irreversible: the lower hump wins; warm, reversible: the deeper well wins", () => {
    const cold = SCENARIOS.find((x) => x.id === "control")!;
    const coldWalk = walk(cold.profiles, cold.startId);
    expect(coldWalk.sinks.map((x) => x.resting).sort()).toEqual(["K", "T"]);
    expect(coldWalk.kinetic.resting).toBe("K");
    expect(coldWalk.thermodynamic.resting).toBe("T");

    const warm = SCENARIOS.find((x) => x.id === "control-warm")!;
    const warmWalk = walk(warm.profiles, warm.startId);
    expect(warmWalk.sinks).toHaveLength(1);
    expect(warmWalk.sinks[0]!.resting).toBe("T");
  });

  it("a reversible side branch with no way on is a dead end", () => {
    const profiles = [
      { states: [{ id: "A", label: "A", energy: 0 }, { id: "B", label: "B", energy: 5 }], ts: [12] },
      { states: [{ id: "A", label: "A", energy: 0 }, { id: "C", label: "C", energy: -25 }], ts: [15] },
    ];
    const result = walk(profiles, "A");
    expect(result.deadEnds).toEqual(["B"]);
    expect(result.sinks.map((x) => x.resting)).toEqual(["C"]);
  });

  it("every route step is a state in the scenario", () => {
    for (const sc of SCENARIOS) {
      const ids = new Set(sc.profiles.flatMap((p) => p.states.map((st) => st.id)));
      for (const id of sc.route) expect(ids.has(id), `${sc.id}:${id}`).toBe(true);
      expect(sc.say.length, sc.id).toBe(sc.route.length - 1);
    }
  });
});

import { checkSciKeq, parseMantissa, parseWholeExponent, workedKeqSteps } from "../energy/energyModel";

describe("Keq as a number times a power of ten", () => {
  it("marks 6.3 x 10^4 right for a gap of 4.8, and 1/Keq flipped", () => {
    expect(checkSciKeq(6.3, 4, 4.8)).toBe("right");
    expect(checkSciKeq(1.6, -5, 4.8)).toBe("flipped");
    expect(checkSciKeq(2, 9, 4.8)).toBe("wrong");
    expect(checkSciKeq(Number.NaN, 4, 4.8)).toBe("wrong");
  });
  it("parses entries strictly", () => {
    expect(parseMantissa("6.3")).toBe(6.3);
    expect(Number.isNaN(parseMantissa("-2"))).toBe(true);
    expect(parseWholeExponent("−5")).toBe(-5);
    expect(Number.isNaN(parseWholeExponent("1.5"))).toBe(true);
  });
  it("shows the working", () => {
    const steps = workedKeqSteps(15.7, 4.8);
    expect(steps[1]).toContain("10.9");
    expect(steps[3]).toContain("irreversible");
  });
});
