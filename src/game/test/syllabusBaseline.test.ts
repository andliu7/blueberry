/**
 * Owner rule, 24 Oct (STATUS C1): with nothing on the syllabus, nothing
 * changes. syllabusQuizzes.test.ts compares a pool with nothing covered to the
 * same call with its default, which is the same code path. This compares it
 * to a second copy of the pool modules loaded with the side quest layer
 * (syllabus/syllabusQuizzes.ts) replaced by a no-op, which is the pre-C1
 * practicePool and reviewPool: every run pool, every review window and every
 * Challenge set must come out equal, entry for entry.
 */
import { describe, expect, it, vi } from "vitest";
import { PATHWAY_UNITS, checkpointNodeId } from "../demo/pathwayMap";
import { challengePool, practicePool } from "../beats/practice/pools";
import { REVIEW_CHECKPOINTS } from "../tabs/pathway/reviewCheckpoints";
import { reviewPool } from "../tabs/pathway/reviewPool";

const none: ReadonlySet<string> = new Set();
const runIds = [...PATHWAY_UNITS.map((unit) => checkpointNodeId(unit.id)), ...PATHWAY_UNITS.flatMap((unit) => unit.nodes).map((node) => node.id)];

/** The pool modules again, with every side quest hook doing nothing. */
async function withoutSideQuestLayer() {
  vi.resetModules();
  vi.doMock("../syllabus/syllabusQuizzes", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../syllabus/syllabusQuizzes")>()),
    sideQuestsFor: () => [],
    sideQuestProblems: () => [],
    withSideQuests: <T,>(own: readonly T[]) => own,
  }));
  const pools = await import("../beats/practice/pools");
  const review = await import("../tabs/pathway/reviewPool");
  vi.doUnmock("../syllabus/syllabusQuizzes");
  return { pools, review };
}

describe("with nothing covered, against the pools with no side quest layer", () => {
  it("every node's run pool and Challenge set is entry for entry the same", async () => {
    const { pools } = await withoutSideQuestLayer();
    let nonEmpty = 0;
    for (const id of runIds) {
      const pool = practicePool(id, undefined, none);
      if (pool.length > 0) nonEmpty += 1;
      expect(pool, id).toEqual(pools.practicePool(id, undefined, none));
      expect(challengePool(id), id).toEqual(pools.challengePool(id));
    }
    expect(nonEmpty).toBeGreaterThan(10);
    // The copy really has no layer: with Benzyne covered only the live pool asks it.
    const u4 = checkpointNodeId("u4");
    const covered = new Set(["u4-benzyne"]);
    expect(practicePool(u4, undefined, covered)).not.toEqual(pools.practicePool(u4, undefined, covered));
  });

  it("every review concept check window is entry for entry the same", async () => {
    const { review } = await withoutSideQuestLayer();
    expect(REVIEW_CHECKPOINTS.length).toBeGreaterThan(0);
    for (const stop of REVIEW_CHECKPOINTS) {
      for (let attempt = 0; attempt < 4; attempt++) expect(reviewPool(stop, undefined, attempt, none), stop.id).toEqual(review.reviewPool(stop, undefined, attempt, none));
    }
  });
});
