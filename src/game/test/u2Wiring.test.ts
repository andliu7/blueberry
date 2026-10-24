/**
 * Unit 2's draft pools, wired into the game (2026-10-17, Unit 2 draft lane).
 *
 * Mirrors "the real pools, wired" in u1Pools.test.ts and u1LessonReach.test.ts
 * for Unit 2: every node plans a lesson, the nomenclature problem set plays the
 * in-a-row run with a Challenge, the five lessons open on the meet step, play
 * every authored item exactly once and never replay a question, the checkpoint plays exactly the exam ids interleaved,
 * and nothing drafted becomes a flashcard. The pools themselves (chemistry,
 * drawings, provenance) are pinned by u2Pools.test.ts.
 */
import { describe, expect, it } from "vitest";

import { PATHWAY_UNITS, checkpointNodeId, hasChallengeRun } from "../demo/pathwayMap";
import { U2_EXAM_IDS, U2_POOLS } from "../content/u2";
import { challengePool, isDraftCard, isExamRun, lessonPool, mayOfferCard, poolHomeOf, practicePool } from "../beats/practice/pools";
import { answerProblem, cleared, endSaid, examPassMark, examPassed, firstTimeRight, startPracticeRun, stopRun, type PracticeRunState } from "../beats/practice/run";
import { mcqCardId } from "../beats/mcq/card";
import { isCheckpointUnit } from "../tabs/pathway/unitShape";
import { challengeable, lessonHasDraft, lessonMcqBeats, lessonMeetBeats, lessonPoolItems, planLesson } from "../beats/template";
import { startMcqSession } from "../beats/mcq/session";
import { figuresOf, mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";

const u2 = PATHWAY_UNITS.find((unit) => unit.id === "u2")!;
// CHANGED 2026-10-17 (round 2): Charged comes before Annulenes on the map (the cation ladder and azulene lean on it).
// CHANGED 2026-10-17 (round 4): Charged, Annulenes and Heterocycles are seven-slot lessons now (owner rule: every
// lesson node plays the seven-slot lesson), so the in-a-row run is the nomenclature problem set alone.
const RUN_NODES = ["u2-nomen"];
const LESSON_NODES = ["u2-huckel", "u2-charged", "u2-annulene", "u2-hetero", "u2-nmr"];
const kinds = (node: string) => planLesson(node)?.steps.map((step) => step.beat.kind) ?? [];
const allEntries = Object.values(U2_POOLS).flat();

describe("every Unit 2 node is playable", () => {
  // CHANGED 2026-10-17 (round 3): round 2 made the five rows spine, which moved the owner's inventory pin.
  // The brief keeps them gates; an all-gate unit is a checkpoint unit whose playable gates run before the check.
  // Spine vs gate is listed for the owner.
  it("keeps the briefed kinds: five playable gates in teaching order, then the side quest", () => {
    expect(isCheckpointUnit(u2)).toBe(true);
    expect(u2.nodes.map((node) => node.kind)).toEqual(["gate", "gate", "gate", "gate", "gate", "branch"]);
    // CHANGED 2026-10-17 (round 4): was video, practice, practice, practice, video, practice.
    expect(u2.nodes.map((node) => node.role)).toEqual(["video", "video", "video", "video", "video", "practice"]);
  });

  it("links all six rows to their own beat, and each plans a lesson", () => {
    expect(u2.nodes.map((node) => node.id)).toEqual(["u2-huckel", "u2-charged", "u2-annulene", "u2-hetero", "u2-nmr", "u2-nomen"]);
    for (const node of u2.nodes) {
      expect(node.playable, node.id).toEqual({ kind: "beat", id: node.id });
      expect(planLesson(node.id), node.id).not.toBeNull();
    }
  });

  it("plays the nomenclature side quest as one practice run, with a Challenge", () => {
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
  // CHANGED 2026-10-17 (round 4): five lessons, was two. The three former runs open on their new worked examples.
  it("opens every lesson on the meet step, then the graded questions, and never plays a question twice", () => {
    expect(kinds("u2-huckel")).toEqual(["meet", "mcq", "poolMatch", "draw"]);
    expect(kinds("u2-charged")).toEqual(["meet", "mcq", "poolSort", "draw"]);
    expect(kinds("u2-annulene")).toEqual(["meet", "mcq", "poolMatch", "poolSort"]);
    expect(kinds("u2-hetero")).toEqual(["meet", "mcq", "poolMatch", "draw"]);
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

  it("marks every lesson as a draft", () => {
    for (const id of LESSON_NODES) expect(lessonHasDraft(id), id).toBe(true);
  });

  // Added 2026-10-17 (round 4): the critic found 11 authored items (all three Frost circles among them) that a
  // clean in-a-row run never reached. A lesson plays its whole pool: every entry lands in exactly one step.
  it("plays every authored item of every lesson exactly once", () => {
    for (const id of LESSON_NODES) {
      const mcqIds = [...lessonMeetBeats(id), ...startMcqSession(lessonMcqBeats(id), 1).beats].map((beat) => beat.id);
      const others = (["sort", "match", "draw"] as const).flatMap((kind) => lessonPoolItems(id, kind).map((entry) => entry.id));
      const played = [...mcqIds.filter((one) => (U2_POOLS[id] ?? []).some((entry) => entry.id === one)), ...others];
      expect([...played].sort(), id).toEqual((U2_POOLS[id] ?? []).map((entry) => entry.id).sort());
      expect(new Set(played).size, id).toBe(played.length);
      expect(challengeable(id), id).toBe(true);
    }
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

// Added 2026-10-17 (round 3): the critic cleared the 14-question exam after 4 answers by pressing STOP HERE,
// because the checkpoint played the in-a-row rule. It plays as a whole exam now (run.ts exam mode).
describe("the Unit 2 checkpoint is a whole exam", () => {
  const check = checkpointNodeId("u2");
  const ids = practicePool(check).map((entry) => entry.id);
  const play = (answers: (id: string, seen: number) => boolean): PracticeRunState => {
    let state = startPracticeRun(ids, false, isExamRun(check));
    const seen = new Map<string, number>();
    for (let guard = 0; !state.finished && guard < 100; guard += 1) {
      const id = state.queue[0]!;
      seen.set(id, (seen.get(id) ?? 0) + 1);
      state = answerProblem(state, answers(id, seen.get(id)!));
    }
    return state;
  };

  // CHANGED 2026-10-23 (content audit top-25 #2, owner delegated): Unit 1's checkpoint is a whole exam now too.
  it("is an exam run, as Unit 1's checkpoint is; every lesson node is not", () => {
    expect(isExamRun(check)).toBe(true);
    expect(isExamRun(checkpointNodeId("u1"))).toBe(true);
    for (const node of u2.nodes) expect(isExamRun(node.id), node.id).toBe(false);
  });

  it("cannot be cleared early: four right and a stop banks nothing", () => {
    let state = startPracticeRun(ids, false, true);
    for (let i = 0; i < 4; i += 1) state = answerProblem(state, true);
    expect(cleared(state)).toBe(false);
    state = stopRun(state);
    expect(cleared(state)).toBe(false);
    expect(examPassed(state)).toBe(false);
  });

  it("does not stop at ten in a row: a flawless run plays every exam id once and passes", () => {
    const state = play(() => true);
    expect(state.answered).toBe(U2_EXAM_IDS.length);
    expect(firstTimeRight(state)).toBe(U2_EXAM_IDS.length);
    expect(cleared(state)).toBe(true);
    expect(endSaid(state)).toContain("checkpoint passed");
  });

  it("brings a miss back once and judges on first-try answers", () => {
    const mark = examPassMark(ids.length);
    const missCount = ids.length - mark;
    // Exactly at the mark: misses fixed on the second try still pass.
    const missed = new Set(ids.slice(0, missCount));
    const atMark = play((id, seen) => !missed.has(id) || seen > 1);
    expect(atMark.answered).toBe(ids.length + missCount);
    expect(firstTimeRight(atMark)).toBe(mark);
    expect(cleared(atMark)).toBe(true);
    // One more first-try miss fails, even though every miss is fixed on the replay.
    const oneMore = new Set(ids.slice(0, missCount + 1));
    const below = play((id, seen) => !oneMore.has(id) || seen > 1);
    expect(firstTimeRight(below)).toBe(mark - 1);
    expect(cleared(below)).toBe(false);
    expect(endSaid(below)).toContain("passes it");
  });

  it("can report every exam problem by the lesson it came from", () => {
    for (const id of ids) expect(["u2-huckel", "u2-charged", "u2-annulene", "u2-hetero", "u2-nmr"], id).toContain(poolHomeOf(id));
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
