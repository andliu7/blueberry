/**
 * Unit 4 (nucleophilic aromatic substitution and benzyne) draft pools (src/game/content/u4/pools.ts).
 *
 * WHAT IS PINNED, mirroring u2Pools.test.ts: the pool contract in
 * content/u1/types.ts (every entry a placeholder, unique ids, an explanation
 * and a provenance on every entry), the easy MCQ authoring rules run
 * unchanged, the exact size of every node, the drawing invariants, and that
 * every node with a pool can actually reach it (a lesson plays its MCQs, and
 * its ladder or board on their own steps). Since the 23 Oct audit (top-25
 * #14) the activation ladder plays in u4-snar and the route board in
 * u4-benzyne; the halogen ladder left in U4_UNWIRED is pinned well formed
 * and, honestly, unplayed. The checkpoint plays every spine lesson (#15).
 *
 * WHAT IS NOT. The chemistry. scripts/u4_pools.py derives it (an acceptor
 * test, ring path relations, a Meisenheimer resonance walk, aryne edits and
 * Gasteiger charges, all through RDKit, with every plain name read back by OPSIN) and refuses to write
 * the file when an authored key disagrees.
 */

import { describe, expect, it } from "vitest";

import { CONCEPTS } from "@blueberry/curriculum";
import { mcqAuthoringViolations } from "../beats/mcq/authoring";
import { figuresOf, mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";
import { lessonMcqBeats, lessonPoolItems, planLesson } from "../beats/template";
import { isExamRun, lessonPool, poolHomeOf, practicePool } from "../beats/practice/pools";
import type { McqBeat } from "../beats/types";
import { U1_POOLS, mergePools } from "../content/u1";
import type { PoolEntry } from "../content/u1/types";
import { U4_OPTION_TILES, U4_POOLS, U4_SORT_FIGURES, U4_UNWIRED, U4_VISUALS } from "../content/u4";
import { checkpointNodeId, pathwayNode } from "../demo/pathwayMap";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

/** Six lessons of MCQs: the three SNAr spine nodes and the three benzyne side quests. */
// u4-snar and u4-benzyne each gained one entry on 23 Oct: the ladder and the board audit top-25 #14 wires in.
const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  "u4-snar": 9,
  "u4-meisenheimer": 7,
  "u4-lg-order": 6,
  "u4-benzyne": 8,
  "u4-isotope": 6,
  "u4-dow": 6,
};

/**
 * Nodes whose map link is a trainer surface rather than their own lesson beat (audit 23 Oct, top-25 #6):
 * u4-meisenheimer pushes the one ring-to-oxygen step, and the full seq-snar is u4-lg-order's capstone only.
 */
const TRAINER_LINKED: Readonly<Record<string, { readonly kind: string; readonly id: string }>> = {
  "u4-meisenheimer": { kind: "resonance", id: "res-meisenheimer" },
  "u4-lg-order": { kind: "sequence", id: "seq-snar" },
};

/** The one non-MCQ entry each lesson carries, and the plan step that plays it (top-25 #14). */
const WIRED: Readonly<Record<string, { readonly id: string; readonly kind: "sort" | "match"; readonly step: string }>> = {
  "u4-snar": { id: "u4-act-ladder", kind: "sort", step: "poolSort" },
  "u4-benzyne": { id: "u4-exam-match-route", kind: "match", step: "poolMatch" },
};

const LESSON_NODES = Object.keys(EXPECTED_SIZES);

/** Lesson entries and the unwired ladders and boards: every contract below holds for both. */
const entries: readonly (readonly [string, PoolEntry])[] = [...Object.entries(U4_POOLS), ...Object.entries(U4_UNWIRED)].flatMap(
  ([node, pool]) => pool.map((entry) => [node, entry] as const),
);

const mcqs: readonly McqBeat[] = entries.flatMap(([, entry]) => (entry.item.kind === "mcq" ? [entry.item.beat] : []));

function idAndNode(entry: PoolEntry): { readonly id: string; readonly node: string } {
  switch (entry.item.kind) {
    case "mcq":
      return { id: entry.item.beat.id, node: entry.item.beat.node };
    case "sort":
      return { id: entry.item.content.beat.id, node: entry.item.content.beat.node };
    case "match":
      return { id: entry.item.board.beatId, node: entry.item.board.node };
    case "draw": // pool kind added by U1-P3 (2026-10-17); no unit pool here writes one yet
      return { id: entry.item.beat.id, node: entry.item.beat.node };
  }
}

function conceptIdsOf(entry: PoolEntry): readonly string[] {
  if (entry.item.kind === "mcq") return entry.item.beat.conceptIds;
  if (entry.item.kind === "sort") return entry.item.content.beat.conceptIds;
  return [];
}

function everyFigure(): readonly { readonly where: string; readonly figure: Figure }[] {
  const out: { where: string; figure: Figure }[] = [];
  for (const [id, visual] of Object.entries(U4_VISUALS)) {
    for (const { where, figure } of figuresOf(visual)) out.push({ where: `${id} ${where}`, figure });
  }
  for (const [id, tiles] of Object.entries(U4_OPTION_TILES)) {
    for (const [option, tile] of Object.entries(tiles)) out.push({ where: `${id}::${option}`, figure: tile.figure });
  }
  for (const [id, cards] of Object.entries(U4_SORT_FIGURES)) {
    for (const [card, tile] of Object.entries(cards)) out.push({ where: `${id}::${card}`, figure: tile.figure });
  }
  return out;
}

describe("u4 draft pools", () => {
  it("covers exactly the authored Unit 4 nodes, at the authored sizes", () => {
    const sizes = Object.fromEntries(Object.entries(U4_POOLS).map(([node, pool]) => [node, pool.length]));
    expect(sizes).toEqual(EXPECTED_SIZES);
    expect(Object.keys(U4_UNWIRED)).toEqual(["u4-exam"]);
    expect(U4_UNWIRED["u4-exam"]?.length).toBe(1);
  });

  it("marks every entry as a placeholder", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [, entry] of entries) expect(entry.placeholder, entry.id).toBe(true);
  });

  it("uses each id once, and keys every beat to the pool it sits in", () => {
    const seen = new Set<string>();
    for (const [node, entry] of entries) {
      expect(seen.has(entry.id), `${entry.id} appears twice`).toBe(false);
      seen.add(entry.id);
      expect(entry.id.startsWith("u4-"), entry.id).toBe(true);
      const beat = idAndNode(entry);
      expect(beat.id, entry.id).toBe(entry.id);
      expect(beat.node, entry.id).toBe(node);
    }
  });

  it("carries an explanation and a provenance naming the script and the OpenStax check on every entry", () => {
    for (const [, entry] of entries) {
      expect(entry.explanation.trim(), entry.id).not.toBe("");
      expect(entry.provenance, entry.id).toContain("scripts/u4_pools.py");
      expect(entry.provenance, entry.id).toMatch(/OpenStax Organic Chemistry 16\.\d+ \(CC BY-NC-SA\), read as a check only/);
    }
  });

  it("passes the easy MCQ authoring rules, unchanged", () => {
    expect(mcqs.length).toBeGreaterThan(0);
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
  });

  it("keeps every lesson node to MCQs plus at most its one wired ladder or board, with at least one graded question", () => {
    for (const node of LESSON_NODES) {
      const pool = U4_POOLS[node] ?? [];
      const wired = WIRED[node];
      for (const entry of pool) expect(entry.item.kind, entry.id).toBe(entry.id === wired?.id ? wired.kind : "mcq");
      if (wired !== undefined) expect(pool.some((entry) => entry.id === wired.id), `${node} lost ${wired.id}`).toBe(true);
      const graded = pool.filter((entry) => entry.item.kind === "mcq" && entry.item.beat.levels.some((level) => level > 0));
      expect(graded.length, node).toBeGreaterThan(0);
    }
  });

  it("does not park the answer in one position across the set", () => {
    const counts = new Map<number, number>();
    for (const beat of mcqs) {
      const index = beat.options.findIndex((option) => option.id === beat.correctOptionId);
      counts.set(index, (counts.get(index) ?? 0) + 1);
    }
    for (const [index, count] of counts) {
      expect(count, `index ${index} holds ${count} of ${mcqs.length}`).toBeLessThanOrEqual(mcqs.length / 2);
    }
  });

  it("files every item under CONCEPTS ids", () => {
    const known = new Set(Object.keys(CONCEPTS));
    for (const [, entry] of entries) {
      const ids = conceptIdsOf(entry);
      if (entry.item.kind !== "match") expect(ids.length, entry.id).toBeGreaterThan(0);
      for (const id of ids) expect(known.has(id), `${entry.id} ${id}`).toBe(true);
    }
  });

  it("has no em dash anywhere", () => {
    const all = JSON.stringify([U4_POOLS, U4_VISUALS, U4_OPTION_TILES, U4_SORT_FIGURES]);
    expect(all.includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it("merges with Unit 1 with no node or id collision", () => {
    expect(() => mergePools(U1_POOLS, U4_POOLS, U4_UNWIRED)).not.toThrow();
  });
});

describe("u4 pools are reachable", () => {
  it("keys every lesson pool to a real Unit 4 map node", () => {
    for (const node of LESSON_NODES) expect(pathwayNode(node)?.id, node).toBe(node);
  });

  it("plays every lesson pool entry inside that node's lesson: MCQs as quick questions, the ladder or board on its own step", () => {
    for (const node of LESSON_NODES) {
      const ids = new Set([
        ...lessonMcqBeats(node).map((beat) => beat.id),
        ...lessonPoolItems(node, "sort").map((entry) => entry.id),
        ...lessonPoolItems(node, "match").map((entry) => entry.id),
      ]);
      for (const entry of lessonPool(node)) expect(ids.has(entry.id), `${node} drops ${entry.id}`).toBe(true);
      expect(lessonPool(node).length, node).toBe(EXPECTED_SIZES[node]);
      const kinds = (planLesson(node)?.steps ?? []).map((step) => step.beat.kind);
      expect(kinds.includes("mcq") || kinds.includes("meet"), `${node} plan ${kinds.join(",")}`).toBe(true);
      const wired = WIRED[node];
      if (wired !== undefined) expect(kinds, `${node} plan ${kinds.join(",")}`).toContain(wired.step);
    }
  });

  it("opens the lesson from the map for every node whose link is not a kept trainer", () => {
    for (const node of LESSON_NODES) {
      const link = pathwayNode(node)?.playable;
      const trainer = TRAINER_LINKED[node];
      if (trainer !== undefined) {
        expect(link, `${node} lost its trainer link`).toEqual(trainer);
      } else {
        expect(link, node).toEqual({ kind: "beat", id: node });
      }
    }
  });

  it("plays every spine lesson's graded entries on the Unit 4 checkpoint, interleaved, scored as a whole set", () => {
    const check = checkpointNodeId("u4");
    const exam = practicePool(check);
    const spine = ["u4-snar", "u4-meisenheimer", "u4-lg-order"];
    const graded = (node: string) =>
      (U4_POOLS[node] ?? []).filter((entry) => entry.item.kind !== "mcq" || entry.item.beat.levels.some((level) => level > 0));
    expect(exam.map((entry) => entry.id).sort()).toEqual(spine.flatMap((node) => graded(node).map((entry) => entry.id)).sort());
    // Interleaved: the first three questions come from the three lessons, in teaching order.
    expect(exam.slice(0, 3).map((entry) => poolHomeOf(entry.id))).toEqual(spine);
    expect(isExamRun(check)).toBe(true);
    expect(planLesson(check)?.steps.map((step) => step.beat.kind)).toEqual(["practice"]);
  });

  it("keeps the halogen ladder left in U4_UNWIRED away from every student", () => {
    const played = new Set(
      [...LESSON_NODES.flatMap((node) => [...lessonPool(node), ...practicePool(node)]), ...practicePool(checkpointNodeId("u4"))].map((entry) => entry.id),
    );
    for (const entry of U4_UNWIRED["u4-exam"] ?? []) expect(played.has(entry.id), entry.id).toBe(false);
  });
});

describe("u4 sort ladders and match boards", () => {
  const sorts = entries.flatMap(([, entry]) => (entry.item.kind === "sort" ? [entry.item.content] : []));
  const boards = entries.flatMap(([, entry]) => (entry.item.kind === "match" ? [entry.item.board] : []));

  it("exist, so these blocks cannot pass vacuously", () => {
    expect(sorts.length).toBeGreaterThan(0);
    expect(boards.length).toBeGreaterThan(0);
  });

  it("render the order the judge grades against, with a reason on every card", () => {
    for (const content of sorts) {
      expect(content.beat.order, content.beat.id).toEqual(content.spec.correctOrder);
      for (const item of content.beat.items) expect(item.why?.trim(), `${content.beat.id}::${item.id}`).toBeTruthy();
    }
  });

  it("draw every sort card", () => {
    for (const content of sorts) {
      const drawn = U4_SORT_FIGURES[content.beat.id];
      expect(drawn, content.beat.id).toBeDefined();
      expect(Object.keys(drawn ?? {}).sort()).toEqual(content.beat.items.map((item) => item.id).sort());
    }
  });

  it("explain every pairing on every board", () => {
    for (const board of boards) {
      expect(Object.keys(board.whyByPrompt).length, board.beatId).toBe(board.answer.prompts.length);
      for (const why of Object.values(board.whyByPrompt)) expect(why.trim(), board.beatId).not.toBe("");
    }
  });
});

describe("u4 drawings", () => {
  it("give every MCQ a registered question drawing, and every tiled MCQ a full set of distinct, named options", () => {
    for (const beat of mcqs) {
      expect(mcqVisualFor(beat.id), `${beat.id} would reach a student as prose`).not.toBeNull();
      const tiles = U4_OPTION_TILES[beat.id];
      if (tiles !== undefined) {
        const optionIds = beat.options.map((option) => option.id);
        expect(mcqOptionTiles(beat.id, optionIds), beat.id).not.toBeNull();
        expect(Object.keys(tiles).sort(), beat.id).toEqual([...optionIds].sort());
        const drawn = Object.values(tiles).map((tile) => JSON.stringify(tile.figure));
        expect(new Set(drawn).size, `${beat.id} draws two options the same`).toBe(drawn.length);
        for (const tile of Object.values(tiles)) expect(tile.name, beat.id).toBeTruthy();
      }
    }
  });

  it("keys no drawing to a beat that does not exist", () => {
    const ids = new Set(mcqs.map((beat) => beat.id));
    for (const key of [...Object.keys(U4_VISUALS), ...Object.keys(U4_OPTION_TILES)]) expect(ids.has(key), key).toBe(true);
  });

  it("draws something in every figure, inside the viewBox, with no zero length bond", () => {
    const figures = everyFigure();
    expect(figures.length).toBeGreaterThan(0);
    for (const { where, figure } of figures) {
      const marks = (figure.bonds?.length ?? 0) + (figure.labels?.length ?? 0);
      expect(marks, `${where} is empty`).toBeGreaterThan(0);
      for (const bond of figure.bonds ?? []) {
        for (const x of [bond.x1, bond.x2]) {
          expect(x, where).toBeGreaterThanOrEqual(0);
          expect(x, where).toBeLessThanOrEqual(FIGURE_WIDTH);
        }
        for (const y of [bond.y1, bond.y2]) {
          expect(y, where).toBeGreaterThanOrEqual(0);
          expect(y, where).toBeLessThanOrEqual(FIGURE_HEIGHT);
        }
        expect(Math.hypot(bond.x2 - bond.x1, bond.y2 - bond.y1), where).toBeGreaterThan(1);
      }
      for (const ring of figure.rings ?? []) {
        expect(ring.x - ring.r, where).toBeGreaterThanOrEqual(0);
        expect(ring.x + ring.r, where).toBeLessThanOrEqual(FIGURE_WIDTH);
        expect(ring.y - ring.r, where).toBeGreaterThanOrEqual(0);
        expect(ring.y + ring.r, where).toBeLessThanOrEqual(FIGURE_HEIGHT);
      }
    }
  });

  it("never captions the question drawing with the right option's text", () => {
    for (const beat of mcqs) {
      const right = beat.options.find((option) => option.id === beat.correctOptionId)?.text.toLowerCase() ?? "";
      const visual = U4_VISUALS[beat.id];
      const captions =
        visual === undefined ? [] : visual.kind === "pair" ? [visual.a.name, visual.b.name] : visual.kind === "structure" ? [visual.name] : [];
      for (const caption of captions) {
        expect((caption ?? "").toLowerCase().includes(right), `${beat.id}: caption "${caption}" names the answer`).toBe(false);
      }
    }
  });
});
