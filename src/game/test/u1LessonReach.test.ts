/**
 * Every Unit 1 question is reachable (U1-P1, 2026-10-16).
 *
 * The playthrough audit (scratchpad/u1-audit.md) found three holes, and each
 * test below pins one shut:
 *
 * 1. THE MEET STEP PLAYS FIRST. L0 "Meet it" questions were authored but never
 *    played, because the runner always plays rung 1. u1-kvt showed one question
 *    ("Warm that same flask") about a cold flask nobody had seen.
 * 2. THE FOUR TRAINER NODES OPEN THEIR LESSON. The map linked u1-allylic,
 *    u1-12v14, u1-x2 and u1-da straight into the trainer, so their 21 pool
 *    MCQs were never shown. Their link is a beat now, and the lesson still ends
 *    on the same trainer.
 * 3. NO STEP IS EMPTY. A step whose questions are all at another rung showed
 *    "Nothing here yet" and dead-ended the lesson.
 */
import { describe, expect, it } from "vitest";

import { lessonMeetBeats, lessonMcqBeats, planLesson } from "../beats/template";
import { startMcqSession } from "../beats/mcq/session";
import { lessonPool, practicePool } from "../beats/practice/pools";
import { PATHWAY_UNITS, pathwayNode } from "../demo/pathwayMap";
import { LESSON_TRAINERS } from "../content/u1/lessonTrainers";

const kinds = (node: string) => planLesson(node)?.steps.map((step) => step.beat.kind) ?? [];

describe("the meet step plays the L0 questions before anything is graded", () => {
  it("opens u1-kvt on the cold flask, then asks about warming that same flask", () => {
    // 2026-10-17 (U1-P3): u1-kvt gained a "Draw it" step, the warm product drawn after the questions.
    expect(kinds("u1-kvt")).toEqual(["meet", "mcq", "draw"]);
    const meet = lessonMeetBeats("u1-kvt").map((beat) => beat.id);
    expect(meet).toContain("mcq-kvt-cold");
    expect(meet).not.toContain("mcq-kvt-warm");
    const rung1 = startMcqSession(lessonMcqBeats("u1-kvt"), 1).beats.map((beat) => beat.id);
    expect(rung1).toContain("mcq-kvt-warm");
  });

  it("puts the meet step first in every plan that has one", () => {
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) {
        const at = kinds(node.id).indexOf("meet");
        if (at !== -1) expect(at, node.id).toBe(0);
      }
    }
  });

  it("never plays a question twice in one lesson: an L0-and-L1 question waits for rung 1", () => {
    for (const beat of lessonMeetBeats("u1-da")) expect(beat.levels).not.toContain(1);
    expect(lessonMeetBeats("u1-da")).toEqual([]);
  });
});

describe("the four trainer nodes open their lesson from the map", () => {
  const FOUR = {
    "u1-allylic": ["meet", "resonance"],
    "u1-12v14": ["meet", "mechanism"],
    "u1-x2": ["meet", "mcq", "mechanism"],
    "u1-da": ["mcq", "mechanism"],
  } as const;

  it("links each of them to its own lesson", () => {
    for (const id of Object.keys(FOUR)) {
      expect(pathwayNode(id)?.playable, id).toEqual({ kind: "beat", id });
    }
  });

  it("plays its questions first and the same trainer the map used to open", () => {
    for (const [id, expected] of Object.entries(FOUR)) {
      expect(kinds(id), id).toEqual(expected);
      const last = planLesson(id)!.steps.at(-1)!.beat;
      const trainer = LESSON_TRAINERS[id]!;
      if (last.kind === "resonance") expect({ kind: "resonance", id: last.resonanceId }).toEqual(trainer);
      else if (last.kind === "mechanism") expect(last.play).toEqual(trainer);
      else throw new Error(`${id} does not end on the trainer`);
    }
  });

  it("keeps u1-x2 a lesson, not an in-a-row run, with its pool in the lesson", () => {
    expect(practicePool("u1-x2")).toEqual([]);
    // 12 questions plus the "Draw it" item (U1-P3), which plays before the Br2 sequence.
    expect(lessonPool("u1-x2").length).toBe(13);
  });
});

describe("no Unit 1 step is empty", () => {
  it("gives every meet step and every quick-question step something to play at its rung", () => {
    const unit = PATHWAY_UNITS.find((one) => one.id === "u1")!;
    for (const node of unit.nodes) {
      for (const step of planLesson(node.id)?.steps ?? []) {
        if (step.beat.kind === "meet") {
          expect(startMcqSession(lessonMeetBeats(node.id), 0).beats.length, `${node.id} meet`).toBeGreaterThan(0);
        }
        if (step.beat.kind === "mcq") {
          expect(startMcqSession(lessonMcqBeats(node.id), 1).beats.length, `${node.id} mcq`).toBeGreaterThan(0);
        }
      }
    }
  });
});
