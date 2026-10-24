/**
 * The wiring between Unit 1's pools (content/u1) and the game: the merge,
 * which nodes play the in-a-row run, the map's links, and the drawings. The
 * run's own rules are practiceRun.test.ts. Fixture pools here are inline and
 * tiny; the real pools are only read to check they are wired, never authored.
 */
import { describe, expect, it } from "vitest";

import { PATHWAY_UNITS, checkpointNodeId, hasChallengeRun, unitCheckpointNode } from "../demo/pathwayMap";
import { U1_POOLS, U1_SORT_FIGURES, mergePools } from "../content/u1";
import type { PoolEntry, UnitPools } from "../content/u1/types";
import { challengePool, interleave, lessonPool, mayOfferCard, practicePool } from "../beats/practice/pools";
import { STAGE_CD_EXAM_IDS, STAGE_CD_POOLS } from "../content/u1/stage-cd";
import { STAGE_AB_POOLS } from "../content/u1/stage-ab";
import { STAGE_CD_ACTIVE } from "../content/u1/stage-cd.active";
import { CONCEPTS } from "@blueberry/curriculum";
import { challengeable, lessonMcqBeats, nodeHasBeat, planLesson } from "../beats/template";
import { mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";

const u1 = PATHWAY_UNITS.find((unit) => unit.id === "u1")!;

function fixture(id: string, node: string): PoolEntry {
  return {
    id,
    item: {
      kind: "mcq",
      beat: {
        kind: "mcq",
        id,
        node,
        conceptIds: [],
        levels: [1],
        prompt: "Pick one.",
        correctOptionId: "a",
        options: [
          { id: "a", text: "A", why: "Right." },
          { id: "b", text: "B", why: "Not this one." },
        ],
      },
    },
    explanation: "Fixture.",
    provenance: "test fixture",
    placeholder: true,
  };
}

describe("merging the stage files", () => {
  it("joins disjoint stage files", () => {
    const merged = mergePools({ "u1-rank-cation": [fixture("f1", "u1-rank-cation")] }, { "u1-mo": [fixture("f2", "u1-mo")] });
    expect(Object.keys(merged).sort()).toEqual(["u1-mo", "u1-rank-cation"]);
  });

  it("refuses a node written by two files, and an entry id used twice", () => {
    const a: UnitPools = { "u1-mo": [fixture("f1", "u1-mo")] };
    expect(() => mergePools(a, { "u1-mo": [fixture("f2", "u1-mo")] })).toThrow(/two stage files/);
    expect(() => mergePools(a, { "u1-da-3d": [fixture("f1", "u1-da-3d")] })).toThrow(/used twice/);
  });
});

describe("which nodes play the in-a-row run", () => {
  const pools: UnitPools = {
    "u1-rank-cation": [fixture("f1", "u1-rank-cation")],
    "u1-quiz-a": [fixture("f2", "u1-quiz-a")],
    "u1-x2": [fixture("f3", "u1-x2")],
    "u1-dienes": [fixture("f4", "u1-dienes")],
  };

  it("runs a practice node's and a stage quiz's own pool", () => {
    expect(practicePool("u1-rank-cation", pools).map((entry) => entry.id)).toEqual(["f1"]);
    expect(practicePool("u1-quiz-a", pools).map((entry) => entry.id)).toEqual(["f2"]);
    expect(lessonPool("u1-rank-cation", pools)).toEqual([]);
  });

  it("keeps a trainer node and a video node on their lessons, their pools joining the lesson", () => {
    expect(practicePool("u1-x2", pools)).toEqual([]);
    expect(lessonPool("u1-x2", pools).map((entry) => entry.id)).toEqual(["f3"]);
    expect(practicePool("u1-dienes", pools)).toEqual([]);
    expect(lessonPool("u1-dienes", pools).map((entry) => entry.id)).toEqual(["f4"]);
  });

  it("offers no flashcard from a draft: a card's back must be reviewed copy", () => {
    expect(mayOfferCard(fixture("f1", "u1-mo"))).toBe(false);
  });
});

describe("the real pools, wired", () => {
  it("plans a run node as one practice step, with a Challenge on the plan and the map alike", () => {
    let runs = 0;
    for (const node of u1.nodes) {
      if (practicePool(node.id).length === 0) continue;
      runs += 1;
      expect(planLesson(node.id)?.steps, node.id).toEqual([{ slot: "recognise", beat: { kind: "practice", node: node.id } }]);
      expect(challengeable(node.id), node.id).toBe(true);
      expect(hasChallengeRun(node), node.id).toBe(true);
    }
    expect(runs).toBeGreaterThan(0);
  });

  it("links a Unit 1 node to its lesson exactly when it has something to play, so content never waits as coming soon", () => {
    for (const node of u1.nodes) {
      if (node.mentionOnly === true) continue;
      const kind = node.playable?.kind;
      if (kind === "reaction" || kind === "sequence" || kind === "resonance") continue;
      expect(kind === "beat", node.id).toBe(nodeHasBeat(node.id));
    }
  });

  it("feeds a video node's pool MCQs into its lesson's quick questions", () => {
    for (const node of u1.nodes) {
      const pooled = lessonPool(node.id).filter((entry) => entry.item.kind === "mcq");
      const ids = new Set(lessonMcqBeats(node.id).map((beat) => beat.id));
      for (const entry of pooled) expect(ids.has(entry.id), entry.id).toBe(true);
    }
  });

  it("keys every pool to a Unit 1 node, or to the exam's draw", () => {
    const ids = new Set(u1.nodes.map((node) => node.id));
    for (const key of Object.keys(U1_POOLS)) expect(ids.has(key) || key === "u1-exam", key).toBe(true);
  });

  it("keeps every entry a draft with its explanation and provenance", () => {
    for (const entries of Object.values(U1_POOLS)) {
      for (const entry of entries) {
        expect(entry.placeholder, entry.id).toBe(true);
        expect(entry.explanation.length, entry.id).toBeGreaterThan(0);
        expect(entry.provenance.length, entry.id).toBeGreaterThan(0);
      }
    }
  });

  it("draws every pool MCQ, and draws every option of a tiled one", () => {
    for (const entries of Object.values(U1_POOLS)) {
      for (const entry of entries) {
        if (entry.item.kind !== "mcq") continue;
        const beat = entry.item.beat;
        expect(beat.id, "an entry and its beat share one id").toBe(entry.id);
        expect(mcqVisualFor(beat.id), `${beat.id} would reach a student as prose`).not.toBeNull();
        const tiles = mcqOptionTiles(beat.id, beat.options.map((option) => option.id));
        if (tiles === null) continue;
        for (const option of beat.options) expect(tiles[option.id]?.name, `${beat.id}::${option.id}`).toBeDefined();
      }
    }
  });
});

describe("the unit exam on u1-check", () => {
  const exam = practicePool(checkpointNodeId("u1"));
  const ids = new Set(exam.map((entry) => entry.id));
  const poolIds = (node: string) => (U1_POOLS[node] ?? []).map((entry) => entry.id);

  it("draws stages A and B from their quizzes and stage D from the ids stage-cd sets aside, each problem once", () => {
    const expected = [...poolIds("u1-quiz-a"), ...poolIds("u1-quiz-b"), ...STAGE_CD_EXAM_IDS];
    expect(STAGE_CD_EXAM_IDS.length).toBeGreaterThan(0);
    expect([...ids].sort()).toEqual([...expected].sort());
    expect(exam.length).toBe(expected.length);
  });

  it("takes the stages in turn, so the first three problems are A, B and D", () => {
    expect(exam.slice(0, 3).map((entry) => entry.id)).toEqual([
      poolIds("u1-quiz-a")[0],
      poolIds("u1-quiz-b")[0],
      STAGE_CD_EXAM_IDS[0],
    ]);
  });

  it("never draws stage C or the radical node: they appear only in Challenge", () => {
    for (const node of ["u1-nbs", "u1-nbs-practice", "u1-quiz-c", "u1-rank-radical"]) {
      for (const id of poolIds(node)) expect(ids.has(id), `${id} from ${node}`).toBe(false);
    }
  });

  it("plays as the checkpoint's one practice step, and the checkpoint keeps no Challenge", () => {
    const check = checkpointNodeId("u1");
    expect(planLesson(check)?.steps).toEqual([{ slot: "recognise", beat: { kind: "practice", node: check } }]);
    expect(challengeable(check)).toBe(false);
    expect(hasChallengeRun(unitCheckpointNode(u1))).toBe(false);
    expect(unitCheckpointNode(u1).blurb).toBe(u1.examBlurb);
  });

  it("leaves every other unit's checkpoint on its derived mix", () => {
    // CHANGED 2026-10-17: Unit 2 draft authored, and its checkpoint plays an exam pool too (u2Wiring.test.ts).
    // The skip of u1 alone became an exact set: these and only these units' checkpoints have an exam pool.
    const withExam = PATHWAY_UNITS.filter((unit) => practicePool(checkpointNodeId(unit.id)).length > 0).map((unit) => unit.id);
    // CHANGED 2026-10-17 (round 2): the exact list went red whenever another draft lane added an exam. The rule it
    // stood for: a checkpoint plays an exam pool exactly when its unit says so in examBlurb (what the sheet shows).
    expect(withExam).toEqual(PATHWAY_UNITS.filter((unit) => unit.examBlurb !== undefined).map((unit) => unit.id));
    // CHANGED 2026-10-17 (round 3): back to the exact set the brief asked for. The examBlurb rule above can be
    // satisfied by any lane that writes a blurb, so it cannot catch a stray exam pool; this line can. A lane that
    // adds a unit exam adds its id here, in the open, for the owner to see.
    // CHANGED 2026-10-23: Unit 4's check became a unit exam (content audit top-25 #15), added here in the open.
    expect(withExam).toEqual(["u1", "u2", "u4"]);
    for (const unit of PATHWAY_UNITS) {
      if (withExam.includes(unit.id)) continue;
      expect(practicePool(checkpointNodeId(unit.id)), unit.id).toEqual([]);
      for (const step of planLesson(checkpointNodeId(unit.id))?.steps ?? []) expect(step.beat.kind, unit.id).not.toBe("practice");
    }
  });
});

describe("radical items reach a quiz only through Challenge", () => {
  const radical = new Set((U1_POOLS["u1-rank-radical"] ?? []).map((entry) => entry.id));

  it("keeps them out of every Practice run except the radical node's own", () => {
    expect(radical.size).toBeGreaterThan(0);
    for (const node of u1.nodes) {
      if (node.id === "u1-rank-radical") continue;
      for (const entry of practicePool(node.id)) expect(radical.has(entry.id), `${node.id} ${entry.id}`).toBe(false);
      for (const entry of lessonPool(node.id)) expect(radical.has(entry.id), `${node.id} ${entry.id}`).toBe(false);
    }
  });

  it("adds them to the stage A quiz's Challenge, taken in turn with its own problems", () => {
    const own = practicePool("u1-quiz-a");
    const set = challengePool("u1-quiz-a");
    expect(set.length).toBe(own.length + radical.size);
    expect(set[0]?.id).toBe(own[0]?.id);
    expect(radical.has(set[1]!.id)).toBe(true);
    expect(set.filter((entry) => radical.has(entry.id)).length).toBe(radical.size);
  });

  it("gives every other run node a Challenge over exactly its own pool", () => {
    for (const node of u1.nodes) {
      if (node.id === "u1-quiz-a" || practicePool(node.id).length === 0) continue;
      expect(challengePool(node.id), node.id).toEqual(practicePool(node.id));
    }
    expect(challengePool("u1-allylic")).toEqual([]);
  });

  it("interleaves lists of different lengths without dropping or repeating an item", () => {
    expect(interleave([1, 2, 3], [10], [20, 21])).toEqual([1, 10, 20, 2, 21, 3]);
    expect(interleave()).toEqual([]);
  });
});

describe("the sort ladders' drawings", () => {
  const ladders = Object.values(U1_POOLS)
    .flat()
    .flatMap((entry) => (entry.item.kind === "sort" ? [{ id: entry.id, beat: entry.item.content.beat }] : []));

  it("draws every card of every pool ladder, so a ladder never reaches a student as formulas", () => {
    expect(ladders.length).toBeGreaterThan(0);
    for (const { id, beat } of ladders) {
      const figures = U1_SORT_FIGURES[id];
      expect(figures, id).toBeDefined();
      for (const item of beat.items) {
        // A one-carbon card (the methyl ion) is a label alone; every other card has bonds.
        const figure = figures?.[item.id]?.figure;
        expect((figure?.bonds?.length ?? 0) + (figure?.labels?.length ?? 0), `${id}::${item.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("keys every drawing to a real ladder and card", () => {
    const byId = new Map(ladders.map((ladder) => [ladder.id, new Set(ladder.beat.items.map((item) => item.id))]));
    for (const [id, cards] of Object.entries(U1_SORT_FIGURES)) {
      expect(byId.has(id), id).toBe(true);
      for (const card of Object.keys(cards)) expect(byId.get(id)?.has(card), `${id}::${card}`).toBe(true);
    }
  });
});

describe("the concept ids and sort criteria Unit 1 had been borrowing", () => {
  const beats = Object.values(U1_POOLS)
    .flat()
    // CHANGED 2026-10-17 (U1-P3 round 2): "Draw it" items are checked too, now that
    // the radical node has one; before this they were skipped as null.
    .map((entry) => ({
      entry,
      beat:
        entry.item.kind === "mcq" || entry.item.kind === "draw"
          ? entry.item.beat
          : entry.item.kind === "sort"
            ? entry.item.content.beat
            : null,
    }));
  const raw = new Map(
    [
      ...Object.values(STAGE_AB_POOLS).flat(),
      ...Object.values(STAGE_CD_POOLS).flat(),
      // The generated active items (U1-P3) join U1_POOLS from their own stage file.
      ...Object.values(STAGE_CD_ACTIVE).flat().map((added) => added.entry),
    ].map((entry) => [entry.id, entry] as const),
  );

  it("files every pool item under concept ids the curriculum registers", () => {
    const known = new Set(Object.keys(CONCEPTS));
    for (const { entry, beat } of beats) for (const id of beat?.conceptIds ?? []) expect(known.has(id), `${entry.id} ${id}`).toBe(true);
  });

  it("files every radical item under radical_stability, and only the radical node's", () => {
    for (const { entry, beat } of beats) {
      const radical = (U1_POOLS["u1-rank-radical"] ?? []).some((item) => item.id === entry.id);
      expect(beat?.conceptIds.includes("radical_stability") ?? false, entry.id).toBe(radical);
    }
  });

  it("ranks no Unit 1 ladder by basicity, and keeps each carbanion ladder's authored order", () => {
    // The orders the ladders had under `basicity` ascending, before the move into
    // scripts/u1_pools_ab.py. Least basic first is most stable first: the same
    // order, read the other way up.
    const authored: Readonly<Record<string, readonly string[]>> = {
      "u1-ani-ladder-alkyl": ["me", "et", "ipr", "tbu"],
      "u1-ani-ladder-s": ["sp", "sp2", "sp3", "sp3t"],
      "u1-ani-ladder-res": ["penta", "allyl", "me", "et"],
      "u1-qa-ladder-anion": ["sp", "sp2", "me", "et"],
      // 2026-10-17 (U1-P3): was an MCQ under this id; converted to a ladder, most stable first.
      "u1-ani-ring": ["ene", "cy", "me"],
    };
    let moved = 0;
    for (const { entry } of beats) {
      if (entry.item.kind !== "sort") continue;
      const beat = entry.item.content.beat;
      expect(beat.criterion, entry.id).not.toBe("basicity");
      if (beat.criterion !== "carbanion_stability") continue;
      moved += 1;
      expect(beat.direction).toBe("descending");
      expect(beat.order, entry.id).toEqual(authored[entry.id]);
      expect(beat.conceptIds).toContain("carbanion_stability");
      expect(beat.conceptIds).not.toContain("conjugate_base_stability_argument");
    }
    expect(moved).toBe(5);
  });

  it("moves Diels-Alder shape and stereo items off the EWG rubric", () => {
    for (const node of ["u1-dienes", "u1-da-stereo", "u1-da-3d"]) {
      for (const entry of U1_POOLS[node] ?? []) {
        if (entry.item.kind !== "mcq") continue;
        expect(entry.item.beat.conceptIds, entry.id).toContain("diels_alder_geometry");
        expect(entry.item.beat.conceptIds, entry.id).not.toContain("ewg_edg_rubric");
      }
    }
  });

  it("changes nothing but concept ids and the ladder criterion: every other field is the stage file's", () => {
    for (const { entry } of beats) {
      const before = raw.get(entry.id)!;
      expect(entry.explanation).toBe(before.explanation);
      if (entry.item.kind === "mcq" && before.item.kind === "mcq") {
        expect({ ...entry.item.beat, conceptIds: [] }).toEqual({ ...before.item.beat, conceptIds: [] });
      }
    }
  });
});
