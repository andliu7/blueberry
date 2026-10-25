/**
 * Owner rule, 24 Oct (STATUS C1): a side quest counts on quizzes and exams
 * only when the student's syllabus covers it; default no. This pins the pool
 * half on the REAL pathway map (syllabus/syllabusQuizzes.ts): a covered side
 * quest lends problems to its unit's pool-played checkpoint, to the stage quiz
 * after it and to the review concept check after it, every run keeps its
 * length, and with nothing covered every pool is exactly as authored.
 */
import { afterEach, describe, expect, it } from "vitest";
import { PATHWAY_UNITS, checkpointNodeId, type PathwayNode, type PathwayUnit } from "../demo/pathwayMap";
import { challengePool, poolHomeOf, practicePool } from "../beats/practice/pools";
import { U1_POOLS, mergePools } from "../content/u1";
import { U2_POOLS } from "../content/u2";
import { U3_POOLS } from "../content/u3";
import { U4_POOLS } from "../content/u4";
import { U5_POOLS } from "../content/u5";
import { U6_POOLS } from "../content/u6";
import { U7_POOLS } from "../content/u7";
import { U8_POOLS } from "../content/u8";
import { U9_POOLS } from "../content/u9";
import { U10_POOLS } from "../content/u10";
import { U0_POOLS } from "../content/u0";
import { REVIEW_CHECKPOINTS, reviewCheckpointFor } from "../tabs/pathway/reviewCheckpoints";
import { reviewPool } from "../tabs/pathway/reviewPool";
import { syllabusStore, type SyllabusPlan } from "../syllabus/syllabusPlan";
import { SIDE_QUEST_SHARE, sideQuestProblems, sideQuestStop, sideQuestsFor } from "../syllabus/syllabusQuizzes";

const none: ReadonlySet<string> = new Set();
const ALL_UNIT_POOLS = mergePools(U1_POOLS, U2_POOLS, U3_POOLS, U4_POOLS, U5_POOLS, U6_POOLS, U7_POOLS, U8_POOLS, U9_POOLS, U10_POOLS, U0_POOLS);
const unit = (id: string) => PATHWAY_UNITS.find((entry) => entry.id === id)!;
const node = (id: string) => PATHWAY_UNITS.flatMap((entry) => entry.nodes).find((entry) => entry.id === id)!;
const sideQuests = (entry: PathwayUnit): readonly PathwayNode[] => entry.nodes.filter((one) => one.kind === "branch" && one.playable !== undefined && one.mentionOnly !== true);
/** Side quests with a graded problem to lend: the ones a pool quiz can ask. */
const lending = (entry: PathwayUnit) => sideQuests(entry).filter((one) => sideQuestProblems(one.id, ALL_UNIT_POOLS).length > 0);
const homes = (pool: readonly { id: string }[]) => pool.map((entry) => poolHomeOf(entry.id));
const quizIds = [
  ...PATHWAY_UNITS.map((entry) => checkpointNodeId(entry.id)),
  ...PATHWAY_UNITS.flatMap((entry) => entry.nodes).filter((one) => one.role === "quiz" || one.role === "practice").map((one) => one.id),
];

afterEach(() => syllabusStore.replace(null));

describe("with nothing covered", () => {
  it("every run pool is the pool with no syllabus, and asks no side quest it did not ask before", () => {
    const allSideQuests = new Set(PATHWAY_UNITS.flatMap(sideQuests).map((one) => one.id));
    for (const id of quizIds) {
      const pool = practicePool(id, undefined, none);
      expect(pool, id).toEqual(practicePool(id));
      // A side quest's own run (u1-nbs-practice) asks itself; nothing else asks a side quest.
      expect(homes(pool).filter((home) => home !== id && home !== null && allSideQuests.has(home)), id).toEqual([]);
    }
  });

  it("the review concept check is the reviewed lessons only", () => {
    for (const review of REVIEW_CHECKPOINTS) {
      const pool = reviewPool(review, undefined, 0, none);
      expect(pool).toEqual(reviewPool(review));
      expect(new Set(pool.map((one) => one.source))).toEqual(new Set(review.reviews));
    }
  });

  it("a covered side quest the student also marked not covered counts for nothing", () => {
    const plan: SyllabusPlan = { version: 1, updatedAt: 1, weeks: [], unitOrder: ["u4"], sectionOrder: {}, notCovered: ["u4-benzyne"], sideQuests: ["u4-benzyne"], exams: [] };
    syllabusStore.replace(plan);
    expect(practicePool(checkpointNodeId("u4"))).toEqual(practicePool(checkpointNodeId("u4"), undefined, none));
  });
});

describe("a covered side quest on its unit's pool-played checkpoint", () => {
  // Units whose checkpoint plays a pool (EXAM_SOURCES in beats/practice/pools.ts); the rest are checkpointPlan's derived mix.
  const pooled = PATHWAY_UNITS.filter((entry) => practicePool(checkpointNodeId(entry.id), undefined, none).length > 0);

  it("covers the real units that play one, Unit 4 among them", () => {
    expect(pooled.map((entry) => entry.id)).toEqual(expect.arrayContaining(["u1", "u4", "u6"]));
  });

  it("every lending side quest, covered alone, is asked on it, and the exam keeps its length", () => {
    const checked = pooled.flatMap((entry) => lending(entry).map((one) => [entry.id, one.id] as const));
    expect(checked.map(([, id]) => id)).toEqual(expect.arrayContaining(["u4-benzyne", "u4-dow", "u1-nbs"]));
    for (const [unitId, id] of checked) {
      const check = checkpointNodeId(unitId);
      const pool = practicePool(check, undefined, new Set([id]));
      expect(homes(pool), id).toContain(id);
      expect(pool.length, id).toBe(practicePool(check, undefined, none).length);
    }
  });

  it("covering every side quest of a unit at once asks each, at most SIDE_QUEST_SHARE problems each", () => {
    for (const entry of pooled) {
      const all = new Set(lending(entry).map((one) => one.id));
      const pool = homes(practicePool(checkpointNodeId(entry.id), undefined, all));
      for (const id of all) {
        expect(pool, id).toContain(id);
        expect(pool.filter((home) => home === id).length, id).toBeLessThanOrEqual(SIDE_QUEST_SHARE);
      }
    }
  });

  it("reads the saved plan by default", () => {
    syllabusStore.replace({ version: 1, updatedAt: 1, weeks: [], unitOrder: ["u4"], sectionOrder: {}, notCovered: [], sideQuests: ["u4-benzyne"], exams: [] });
    expect(homes(practicePool(checkpointNodeId("u4")))).toContain("u4-benzyne");
  });
});

describe("a covered side quest on the concept checks of its unit", () => {
  it("joins the first stage quiz or review stop after the point it hangs off", () => {
    expect(sideQuestStop(unit("u1"), node("u1-rank-radical"))).toBe("u1-quiz-a");
    expect(sideQuestStop(unit("u1"), node("u1-nbs"))).toBe("u1-quiz-b");
    expect(sideQuestStop(unit("u1"), node("u1-nbs-practice"))).toBe("u1-review-d");
    expect(sideQuestStop(unit("u1"), node("u1-quiz-c"))).toBe("u1-review-d");
  });

  it("every lending Unit 1 side quest, covered alone, is in at least one concept check, which keeps its length", () => {
    for (const one of lending(unit("u1"))) {
      const covered = new Set([one.id]);
      const stop = sideQuestStop(unit("u1"), one);
      expect(stop, one.id).not.toBeNull();
      const review = reviewCheckpointFor(stop!);
      if (review !== null) {
        const pool = reviewPool(review, undefined, 0, covered);
        expect(pool.map((entry) => entry.source), one.id).toContain(one.id);
        expect(pool.length).toBe(reviewPool(review, undefined, 0, none).length);
      } else {
        const pool = practicePool(stop!, undefined, covered);
        expect(homes(pool), one.id).toContain(one.id);
        expect(pool.length).toBe(practicePool(stop!, undefined, none).length);
        // Challenge never asks a lent problem twice.
        const challenge = challengePool(stop!).map((entry) => entry.id);
        syllabusStore.replace({ version: 1, updatedAt: 1, weeks: [], unitOrder: ["u1"], sectionOrder: {}, notCovered: [], sideQuests: [one.id], exams: [] });
        const covering = challengePool(stop!).map((entry) => entry.id);
        expect(new Set(covering).size, one.id).toBe(covering.length);
        // And still asks every Challenge-only problem it asked before (u1-rank-radical on u1-quiz-a).
        const homeOfLent = challenge.filter((id) => poolHomeOf(id) === one.id);
        expect(covering).toEqual(expect.arrayContaining(homeOfLent));
        syllabusStore.replace(null);
      }
    }
  });

  it("a review run of its clear length still samples every reviewed lesson", () => {
    for (const review of REVIEW_CHECKPOINTS) {
      const all = new Set(sideQuests(unit(review.unitId)).map((one) => one.id));
      const pool = reviewPool(review, undefined, 0, all);
      expect(new Set(pool.slice(0, review.reviews.length).map((one) => one.source))).toEqual(new Set(review.reviews));
    }
  });

  it("Units 4, 9 and 10 have no stage quiz or review stop, so benzyne, Stork and Hofmann join only the checkpoint and the tests", () => {
    for (const id of ["u4-benzyne", "u9-stork", "u10-hofmann-e"]) {
      const at = PATHWAY_UNITS.find((entry) => entry.nodes.some((one) => one.id === id))!;
      expect(sideQuestStop(at, node(id)), id).toBeNull();
      expect(sideQuestsFor(checkpointNodeId(at.id), new Set([id])), id).toEqual([id]);
    }
  });
});
