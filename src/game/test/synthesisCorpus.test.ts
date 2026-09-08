/**
 * The corpus itself: is the authored content real, traceable, and in the voice
 * CLAUDE.md specifies.
 *
 * WHY A TEST AND NOT A REVIEW NOTE. Two of the checks below are the kind that
 * a person reads past. A missing source file turns an auditable route into a
 * route somebody has to take on trust, and an em dash is banned in this
 * repository by a rule that is easy to break and impossible to see. Both are
 * mechanical, so both are tests. The judgement half of the voice, whether the
 * sentence would annoy a smart friend, stays a human gate: this file only
 * catches the constructions CLAUDE.md names outright.
 */

import { describe, expect, it } from "vitest";
import { SYNTHESIS_GAPS, synthesisGapsForNode } from "../beats/synthesis/corpus";
import {
  gapsForLevel,
  synthesisBeats,
  synthesisLevelRuleViolations,
} from "../beats/synthesis/beats";
import { gapQuestion } from "../beats/synthesis/cards";
import { explainSynthesisResult, gradeSynthesisGap } from "../beats/synthesis/grade";
import { GAP_KINDS, type SynthesisGapProblem } from "../beats/synthesis/problem";
import { DEFAULT_LEVELS } from "../beats/types";

/** The documents this corpus is allowed to have come from. */
const KNOWN_SOURCES = new Set([
  "Synthesis Practice Problems_KEY.pdf",
  "Additional Enolate Synthesis Problems_KEY.pdf",
  "Orgo2_Reagent_Reference.pdf",
  "Orgo_Pathway_Map_Full.pdf",
]);

/** The three spine nodes this piece was asked to cover. */
const TARGET_NODES = ["u3-sequencing", "u9-retro", "u14-orthogonal"];

function authoredStrings(problem: SynthesisGapProblem): readonly string[] {
  const strings: string[] = [problem.prompt, problem.why, problem.start, problem.target];
  if (problem.brief !== undefined) strings.push(problem.brief);
  for (const step of problem.steps) {
    if (step.over !== null) strings.push(step.over);
    if (step.produces !== null) strings.push(step.produces);
    if (step.note !== undefined) strings.push(step.note);
  }
  for (const option of [...problem.bank, ...problem.reasons]) {
    strings.push(option.text);
    if (option.why !== undefined) strings.push(option.why);
    if (option.builds !== undefined) strings.push(option.builds);
  }
  if (problem.typed !== null) {
    strings.push(problem.typed.placeholder, ...problem.typed.alternativeLabels);
  }
  return strings;
}

describe("the synthesis gap corpus", () => {
  it("carries at least six routes", () => {
    expect(SYNTHESIS_GAPS.length).toBeGreaterThanOrEqual(6);
  });

  it("gives every route a source document that exists in the reference folder", () => {
    for (const problem of SYNTHESIS_GAPS) {
      expect(KNOWN_SOURCES.has(problem.source.file), `${problem.id} source`).toBe(true);
      expect(problem.source.locator.trim(), `${problem.id} locator`).not.toBe("");
    }
  });

  it("covers the three spine nodes this beat was built for", () => {
    for (const node of TARGET_NODES) {
      expect(synthesisGapsForNode(node).length, node).toBeGreaterThan(0);
    }
  });

  it("exercises all three gap kinds, so all three curriculum checkers are reached", () => {
    const kinds = new Set(SYNTHESIS_GAPS.map((problem) => problem.gapKind));
    for (const kind of GAP_KINDS) {
      expect(kinds.has(kind), kind).toBe(true);
    }
  });

  it("gives every route a unique id", () => {
    const ids = new Set(SYNTHESIS_GAPS.map((problem) => problem.id));
    expect(ids.size).toBe(SYNTHESIS_GAPS.length);
  });

  it("gives every wrong chip something authored to say", () => {
    for (const problem of SYNTHESIS_GAPS) {
      for (const option of problem.bank) {
        if (option.id === problem.correctOptionId) continue;
        expect(
          option.why !== undefined || option.builds !== undefined,
          `${problem.id} chip ${option.id}`,
        ).toBe(true);
      }
    }
  });

  it("offers at least three chips on every board, so a guess is not a coin toss", () => {
    for (const problem of SYNTHESIS_GAPS) {
      expect(problem.bank.length, problem.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the corpus as beats", () => {
  it("passes the level rule in beats/types.ts", () => {
    expect(synthesisLevelRuleViolations()).toEqual([]);
  });

  it("declares only levels a synthesis beat is allowed to serve", () => {
    for (const beat of synthesisBeats()) {
      for (const level of beat.levels) {
        expect(DEFAULT_LEVELS.synthesis.includes(level), `${beat.id} level ${level}`).toBe(true);
      }
    }
  });

  it("puts every route on the L2 board and only the produce-able ones at L3", () => {
    expect(gapsForLevel(SYNTHESIS_GAPS, 2).length).toBe(SYNTHESIS_GAPS.length);
    const atThree = gapsForLevel(SYNTHESIS_GAPS, 3);
    expect(atThree.length).toBeGreaterThan(0);
    for (const problem of atThree) {
      expect(problem.gapKind, problem.id).not.toBe("product");
      expect(problem.typed, problem.id).not.toBeNull();
    }
  });

  it("keeps exactly one slot open on every beat", () => {
    for (const beat of synthesisBeats()) {
      const open = beat.slots.filter((slot) => slot.accepts !== undefined);
      expect(open.length, beat.id).toBe(1);
    }
  });
});

describe("the authored voice", () => {
  const BANNED = [
    { pattern: /—/, why: "em dash, banned in this repository" },
    { pattern: /–/, why: "en dash used as punctuation" },
    { pattern: /\byou should\b/i, why: "scolding construction" },
    { pattern: /\bobviously\b/i, why: "condescension" },
    { pattern: /\bsimply\b/i, why: "condescension" },
    { pattern: /\bof course\b/i, why: "condescension" },
  ];

  it("keeps every authored string clear of the constructions CLAUDE.md bans", () => {
    for (const problem of SYNTHESIS_GAPS) {
      for (const text of authoredStrings(problem)) {
        for (const { pattern, why } of BANNED) {
          expect(pattern.test(text), `${problem.id}: ${why} in "${text}"`).toBe(false);
        }
      }
    }
  });

  it("never asks the student a rhetorical question in a feedback headline", () => {
    for (const problem of SYNTHESIS_GAPS) {
      const wrong = problem.bank.find((option) => option.id !== problem.correctOptionId);
      if (wrong === undefined) continue;
      const result = gradeSynthesisGap({
        problem,
        submission: {
          mode: "picked",
          optionId: wrong.id,
          reasonId: problem.reasons[0]?.id ?? null,
        },
        level: 2,
        elapsedMs: 1000,
        now: new Date("2026-08-27T10:00:00.000Z"),
      });
      const explained = explainSynthesisResult(problem, result);
      expect(explained.headline.includes("?"), `${problem.id} headline`).toBe(false);
      expect(explained.headline.trim(), `${problem.id} headline`).not.toBe("");
      expect(explained.body.trim(), `${problem.id} body`).not.toBe("");
      expect(explained.why.trim(), `${problem.id} why`).not.toBe("");
    }
  });

  it("asks a card question built from the row rather than authored twice", () => {
    for (const problem of SYNTHESIS_GAPS) {
      const question = gapQuestion(problem);
      expect(question, problem.id).toContain(":");
      expect(question.length, problem.id).toBeGreaterThan(20);
    }
  });
});
