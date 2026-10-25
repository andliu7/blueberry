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
  CONFETTI_COLOURS,
  comboLine,
  comboOverlayFor,
  confettiPieces,
  isComboMilestone,
  reactionFor,
} from "../mascot/berryReaction";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMBO_CONFETTI, HINT_RING, LONE_PAIR, REDUCED_PUFF } from "../mascot/bloomMotion";

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

/*
 * Added 2026-10-24 for documentation/BLOOM-STATES-SPEC.md, section B. New
 * cases only: everything above is the shipped table and stays as it is.
 */
describe("wrongAgain, the hint offer", () => {
  it("a second miss on the same item leans in, curious, with no sad hold, and offers the hint", () => {
    const r = reactionFor("wrongAgain", { correctRun: 0, missRun: 2 });
    expect(r).toMatchObject({ state: "neutral", mood: "curious", behaviour: "leanIn", sparkles: false, hint: true });
    expect(r.mood).not.toBe("sad");
    expect(r.holdMs).toBeNull();
    expect(r.chain).toEqual([]);
  });

  it("charred still wins at three misses, and the hint is not offered on the oxidized beat", () => {
    const r = reactionFor("wrongAgain", { correctRun: 0, missRun: CHARRED_AT_MISSES });
    expect(r).toMatchObject({ state: "charred", mood: "sad", behaviour: "stressed", hint: false });
    expect(r.holdMs as number).toBeLessThan(1000);
  });

  it("no other outcome offers the hint", () => {
    for (const r of [
      reactionFor("correct", { correctRun: 1, missRun: 0 }),
      reactionFor("correct", { correctRun: 5, missRun: 0 }),
      reactionFor("wrong", { correctRun: 0, missRun: 1 }),
      reactionFor("nearMiss", { correctRun: 0, missRun: 0 }),
    ]) {
      expect(r.hint).toBe(false);
    }
  });

  it("every name it returns exists in its registry", () => {
    every([reactionFor("wrongAgain", { correctRun: 0, missRun: 2 }), reactionFor("wrongAgain", { correctRun: 0, missRun: 3 })]);
  });
});

describe("comboOverlayFor", () => {
  it("draws 3, 6 and 6 sparkles at 3, 5 and 8, and confetti only at 8", () => {
    expect(comboOverlayFor(3)).toEqual({ sparkles: 3, confetti: 0 });
    expect(comboOverlayFor(5)).toEqual({ sparkles: 6, confetti: 0 });
    expect(comboOverlayFor(8)).toEqual({ sparkles: 6, confetti: COMBO_CONFETTI.pieces });
    expect(COMBO_CONFETTI.pieces).toBe(24);
  });

  it("draws nothing for a broken combo, a non milestone, or past the cap", () => {
    expect(comboOverlayFor(null)).toBeNull();
    expect(comboOverlayFor(0)).toBeNull();
    expect(comboOverlayFor(4)).toBeNull();
    expect(comboOverlayFor(9)).toBeNull();
    expect(comboOverlayFor(16)).toBeNull();
  });

  it("matches the combo a reaction reports, so a stage can read reaction.combo directly", () => {
    for (const run of [3, 5, 8]) {
      expect(comboOverlayFor(reactionFor("correct", { correctRun: run, missRun: 0 }).combo)).not.toBeNull();
    }
    expect(comboOverlayFor(reactionFor("correct", { correctRun: 4, missRun: 0 }).combo)).toBeNull();
  });
});

describe("confettiPieces", () => {
  it("is deterministic, lands beside the face rather than on it, and stays near the berry", () => {
    const a = confettiPieces(24);
    expect(a).toEqual(confettiPieces(24));
    expect(a).toHaveLength(24);
    for (const p of a) {
      expect(Math.abs(p.x)).toBeGreaterThanOrEqual(0.3);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(0.75);
      expect(p.peakY).toBeLessThan(0);
      expect(p.peakY).toBeGreaterThanOrEqual(-0.55);
      expect(p.fallY).toBeGreaterThan(0);
      expect(p.fallY).toBeLessThanOrEqual(0.45);
      expect(p.colour).toBeGreaterThanOrEqual(0);
      expect(p.colour).toBeLessThan(CONFETTI_COLOURS);
    }
    expect(a.filter((p) => p.x < 0)).toHaveLength(12);
    expect(confettiPieces(0)).toEqual([]);
  });
});

describe("bloom-answers.css", () => {
  const css = readFileSync(resolve(__dirname, "../mascot/bloom-answers.css"), "utf8");

  it("runs on the shared constants", () => {
    expect(css).toContain(`bloom-thought ${LONE_PAIR.loopMs}ms`);
    expect(css).toContain(`animation-delay: ${LONE_PAIR.staggerMs}ms`);
    expect(css).toContain(`opacity: ${LONE_PAIR.opacityMin}`);
    expect(css).toContain(`translateY(-${LONE_PAIR.bobPct}%)`);
    expect(css).toContain(`bloom-confetti ${COMBO_CONFETTI.durationMs}ms`);
    expect(css).toContain(`bloom-hint-ring ${HINT_RING.durationMs}ms`);
    expect(css).toContain(`opacity: ${HINT_RING.opacityFrom}`);
    expect(css).toContain(`scale(${HINT_RING.scaleTo})`);
    expect(css).toContain(`bloom-puff-a ${REDUCED_PUFF.durationMs}ms`);
    expect(css).toContain(`${REDUCED_PUFF.peakAt * 100}% {
    transform: scale(${REDUCED_PUFF.peakScale})`);
    expect(css).toContain(`brightness(${REDUCED_PUFF.brightnessFrom})`);
    expect(css).toContain("--bloom-ease-fall");
  });

  it("has a still frame for every overlay under all three reduced motion triggers", () => {
    for (const trigger of ['.bloom-stage[data-reduced="true"]', 'html[data-motion="reduced"]', "@media (prefers-reduced-motion: reduce)"]) {
      expect(css).toContain(trigger);
    }
    const media = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const sel of [".bloom-stage-body[data-puff]", ".bloom-lone-pair-dot", ".bloom-confetti", ".bloom-hint-ring"]) {
      expect(media).toContain(sel);
    }
  });
});
