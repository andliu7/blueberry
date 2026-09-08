/**
 * The answer reaction table, against docs/MASCOT.md and the tone rule.
 *
 * Three claims a diff could quietly break:
 *
 * 1. Each reaction is the (state, mood, behaviour) row MASCOT.md's "Answer
 *    reactions" table names, and every name still exists in its registry.
 * 2. A sad face never holds past one second. That is the tone rule, and it is
 *    a number here, so it is testable.
 * 3. The combo milestones escalate: more repeats at 5 than at 3, more at 8
 *    than at 5, and a non milestone correct answer is squash then bounce.
 */

import { describe, expect, it } from "vitest";
import { BEHAVIOURS } from "../mascot/berryBehaviour";
import { MOOD_SHAPE } from "../mascot/berryMood";
import { BERRY_STATES } from "../mascot/berryState";
import {
  CHARRED_AT_MISSES,
  COMBO_MILESTONES,
  SAD_HOLD_MS,
  SETTLED_AFTER_MISS,
  comboLine,
  isComboMilestone,
  reactionFor,
} from "../mascot/berryReaction";

const every = (cases: readonly ReturnType<typeof reactionFor>[]) => {
  for (const reaction of cases) {
    expect(BERRY_STATES).toContain(reaction.state);
    expect(Object.keys(MOOD_SHAPE)).toContain(reaction.mood);
    expect(Object.keys(BEHAVIOURS)).toContain(reaction.behaviour);
    for (const link of reaction.chain) expect(Object.keys(BEHAVIOURS)).toContain(link);
  }
};

describe("reactionFor", () => {
  it("correct is neutral, happy, squash then bounce, with sparkles", () => {
    const r = reactionFor("correct", { correctRun: 1, missRun: 0 });
    expect(r).toMatchObject({ state: "neutral", mood: "happy", behaviour: "squash", chain: ["bounce"], sparkles: true, combo: null });
  });

  it("wrong is neutral, sad, squash, and the sad face holds under one second", () => {
    const r = reactionFor("wrong", { correctRun: 0, missRun: 1 });
    expect(r).toMatchObject({ state: "neutral", mood: "sad", behaviour: "squash", sparkles: false });
    expect(r.holdMs).not.toBeNull();
    expect(r.holdMs as number).toBeLessThan(1000);
    expect(SAD_HOLD_MS).toBeLessThan(1000);
  });

  it("near miss is thinking plus leanIn", () => {
    expect(reactionFor("nearMiss", { correctRun: 0, missRun: 0 })).toMatchObject({ state: "neutral", mood: "thinking", behaviour: "leanIn" });
  });

  it("the third consecutive miss chars the berry: charred plus sad plus stressed, still under a second", () => {
    const second = reactionFor("wrong", { correctRun: 0, missRun: CHARRED_AT_MISSES - 1 });
    expect(second.state).toBe("neutral");
    const third = reactionFor("wrong", { correctRun: 0, missRun: CHARRED_AT_MISSES });
    expect(third).toMatchObject({ state: "charred", mood: "sad", behaviour: "stressed" });
    expect(third.holdMs as number).toBeLessThan(1000);
  });

  it("the settled face after a miss is the hint offer row: curious plus leanIn", () => {
    expect(SETTLED_AFTER_MISS).toEqual({ mood: "curious", behaviour: "leanIn" });
  });

  it("combos fire at 3, 5 and 8 and escalate", () => {
    expect(COMBO_MILESTONES).toEqual([3, 5, 8]);
    expect(isComboMilestone(4)).toBe(false);
    const at3 = reactionFor("correct", { correctRun: 3, missRun: 0 });
    const at5 = reactionFor("correct", { correctRun: 5, missRun: 0 });
    const at8 = reactionFor("correct", { correctRun: 8, missRun: 0 });
    for (const r of [at3, at5, at8]) {
      expect(r.mood).toBe("excited");
      expect(r.behaviour).toBe("bounce");
      expect(r.chain.every((link) => link === "bounce")).toBe(true);
    }
    expect(at3.combo).toBe(3);
    expect(at5.chain.length).toBeGreaterThan(at3.chain.length);
    expect(at8.chain.length).toBeGreaterThan(at5.chain.length);
    expect(reactionFor("correct", { correctRun: 4, missRun: 0 }).combo).toBeNull();
  });

  it("every name it returns exists in its registry", () => {
    every([
      reactionFor("correct", { correctRun: 1, missRun: 0 }),
      reactionFor("correct", { correctRun: 3, missRun: 0 }),
      reactionFor("correct", { correctRun: 8, missRun: 0 }),
      reactionFor("wrong", { correctRun: 0, missRun: 1 }),
      reactionFor("wrong", { correctRun: 0, missRun: 3 }),
      reactionFor("nearMiss", { correctRun: 0, missRun: 0 }),
    ]);
  });

  it("chained behaviours can all finish, so the chain never stalls on an ambient loop", () => {
    for (const run of [1, 3, 5, 8]) {
      const r = reactionFor("correct", { correctRun: run, missRun: 0 });
      expect(BEHAVIOURS[r.behaviour].returnTo).toBeDefined();
      for (const link of r.chain) expect(BEHAVIOURS[link].returnTo).toBeDefined();
    }
  });
});

describe("comboLine", () => {
  it("names the count and the topic, and never scolds", () => {
    for (const [count, word] of [
      [3, "Three"],
      [5, "Five"],
      [8, "Eight"],
    ] as const) {
      const line = comboLine(count, "Gas laws");
      expect(line).toContain(word);
      expect(line).toContain("Gas laws");
      expect(line).not.toMatch(/should have|\?/);
    }
    expect(comboLine(3, "  ")).toContain("this topic");
  });
});
