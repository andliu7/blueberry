/**
 * Unit 2's draft pools, wired into the game (2026-10-17, Unit 2 draft lane).
 *
 * Mirrors "the real pools, wired" in u1Pools.test.ts and u1LessonReach.test.ts
 * for Unit 2: every node plans a lesson, the practice nodes play the in-a-row
 * run with a Challenge, the two video nodes open on the meet step and never
 * replay a question, the checkpoint plays exactly the exam ids interleaved,
 * and nothing drafted becomes a flashcard. The pools themselves (chemistry,
 * drawings, provenance) are pinned by u2Pools.test.ts.
 */
import { describe, expect, it } from "vitest";

import { PATHWAY_UNITS, checkpointNodeId, hasChallengeRun } from "../demo/pathwayMap";
import { U2_EXAM_IDS, U2_POOLS } from "../content/u2";
import { challengePool, isDraftCard, lessonPool, mayOfferCard, practicePool } from "../beats/practice/pools";
import { mcqCardId } from "../beats/mcq/card";
import { isCheckpointUnit } from "../tabs/pathway/unitShape";
import { challengeable, lessonHasDraft, lessonMcqBeats, lessonMeetBeats, planLesson } from "../beats/template";
import { startMcqSession } from "../beats/mcq/session";
import { figuresOf, mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";

const u2 = PATHWAY_UNITS.find((unit) => unit.id === "u2")!;
// CHANGED 2026-10-17 (round 2): Charged comes before Annulenes on the map (the cation ladder and azulene lean on it).
const RUN_NODES = ["u2-charged", "u2-annulene", "u2-hetero", "u2-nomen"];
const LESSON_NODES = ["u2-huckel", "u2-nmr"];
const kinds = (node: string) => planLesson(node)?.steps.map((step) => step.beat.kind) ?? [];
const allEntries = Object.values(U2_POOLS).flat();

describe("every Unit 2 node is playable", () => {
  // Added 2026-10-17 (round 2): an all-gate unit drew its lessons as timed checkpoint questions that opened
  // only with the unit before. Unit 2 is a lesson unit now: five spine lessons and one side quest.
  it("is a lesson unit: five spine lessons in teaching order, then the side quest", () => {
    expect(isCheckpointUnit(u2)).toBe(false);
    expect(u2.nodes.map((node) => node.kind)).toEqual(["spine", "spine", "spine", "spine", "spine", "branch"]);
    expect(u2.nodes.map((node) => node.role)).toEqual(["video", "practice", "practice", "practice", "video", "practice"]);
  });

  it("links all six rows to their own beat, and each plans a lesson", () => {
    expect(u2.nodes.map((node) => node.id)).toEqual([...LESSON_NODES.slice(0, 1), ...RUN_NODES.slice(0, 3), "u2-nmr", "u2-nomen"]);
    for (const node of u2.nodes) {
      expect(node.playable, node.id).toEqual({ kind: "beat", id: node.id });
      expect(planLesson(node.id), node.id).not.toBeNull();
    }
  });

  it("plays the three practice rows and the nomenclature side quest as one practice run, with a Challenge", () => {
    for (const id of RUN_NODES) {
      const node = u2.nodes.find((one) => one.id === id)!;
      expect(planLesson(id)?.steps, id).toEqual([{ slot: "recognise", beat: { kind: "practice", node: id } }]);
      expect(practicePool(id), id).toEqual(U2_POOLS[id]);
      expect(challengePool(id).length, id).toBeGreaterThanOrEqual(practicePool(id).length);
      expect(challengeable(id), id).toBe(true);
      expect(hasChallengeRun(node), id).toBe(true);
    }
  });

  // CHANGED 2026-10-17 (round 2): the lessons were meet + mcq only. Hückel now connects (a match board) and
  // produces (a drawing); NMR connects.
  it("opens the two video rows on the meet step, then the graded questions, and never plays a question twice", () => {
    expect(kinds("u2-huckel")).toEqual(["meet", "mcq", "poolMatch", "draw"]);
    expect(kinds("u2-nmr")).toEqual(["meet", "mcq", "poolMatch"]);
    for (const id of LESSON_NODES) {
      expect(practicePool(id), id).toEqual([]);
      const meet = lessonMeetBeats(id).map((beat) => beat.id);
      const rung1 = startMcqSession(lessonMcqBeats(id), 1).beats.map((beat) => beat.id);
      expect(meet.length, id).toBeGreaterThan(0);
      expect(rung1.length, id).toBeGreaterThan(0);
      for (const beat of meet) expect(rung1, `${id} replays ${beat}`).not.toContain(beat);
      // Every pool MCQ of the lesson reaches the student in one of the two steps.
      for (const entry of lessonPool(id)) {
        if (entry.item.kind === "mcq") expect([...meet, ...rung1], entry.id).toContain(entry.id);
      }
    }
  });

  it("marks both lessons as drafts", () => {
    for (const id of LESSON_NODES) expect(lessonHasDraft(id), id).toBe(true);
  });
});

describe("the Unit 2 checkpoint", () => {
  const check = checkpointNodeId("u2");
  const ids = practicePool(check).map((entry) => entry.id);

  it("plays one practice step over exactly the exam ids, each once", () => {
    expect(planLesson(check)?.steps).toEqual([{ slot: "recognise", beat: { kind: "practice", node: check } }]);
    expect(ids.length).toBe(U2_EXAM_IDS.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...U2_EXAM_IDS].sort());
    expect(challengeable(check)).toBe(false);
  });

  it("interleaves the topics: the first five problems come from five different lessons", () => {
    const home = (id: string) => Object.keys(U2_POOLS).find((node) => (U2_POOLS[node] ?? []).some((entry) => entry.id === id));
    expect(new Set(ids.slice(0, 5).map(home)).size).toBe(5);
  });

  it("never draws from the nomenclature side quest", () => {
    const nomen = new Set((U2_POOLS["u2-nomen"] ?? []).map((entry) => entry.id));
    for (const id of ids) expect(nomen.has(id), id).toBe(false);
  });
});

describe("drafts stay drafts", () => {
  it("keeps every Unit 2 entry a placeholder that never becomes a flashcard", () => {
    expect(allEntries.length).toBeGreaterThan(0);
    for (const entry of allEntries) {
      expect(entry.placeholder, entry.id).toBe(true);
      expect(mayOfferCard(entry), entry.id).toBe(false);
    }
  });

  // Added 2026-10-17 (round 2): mayOfferCard had no caller in the app, so a missed draft MCQ was offered as a
  // flashcard on the lesson-complete screen. BeatRunner now asks isDraftCard before it offers one.
  it("refuses the card BeatRunner would offer for every missed Unit 2 MCQ", () => {
    const mcqEntries = allEntries.filter((entry) => entry.item.kind === "mcq");
    expect(mcqEntries.length).toBeGreaterThan(0);
    for (const entry of mcqEntries) {
      if (entry.item.kind === "mcq") expect(isDraftCard(mcqCardId(entry.item.beat.id)), entry.id).toBe(true);
    }
    expect(isDraftCard(mcqCardId("not-a-pool-beat"))).toBe(false);
  });

  it("draws every Unit 2 MCQ, and every option of a tiled one", () => {
    for (const entry of allEntries) {
      if (entry.item.kind !== "mcq") continue;
      const beat = entry.item.beat;
      const visual = mcqVisualFor(beat.id);
      expect(visual, `${beat.id} would reach a student as prose`).not.toBeNull();
      expect(figuresOf(visual!).length, beat.id).toBeGreaterThan(0);
      const tiles = mcqOptionTiles(beat.id, beat.options.map((option) => option.id));
      if (tiles === null) continue;
      for (const option of beat.options) expect(tiles[option.id]?.name, `${beat.id}::${option.id}`).toBeDefined();
    }
  });
});
