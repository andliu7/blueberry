/**
 * Unit 6 (spectroscopy and structure determination) draft pools (src/game/content/u6/pools.ts).
 *
 * WHAT IS PINNED, mirroring u4Pools.test.ts: the pool contract in
 * content/u1/types.ts (every entry a placeholder, unique ids, an explanation
 * and a provenance on every entry), the easy MCQ authoring rules run
 * unchanged, the exact size of every node, the drawing invariants, and that
 * every node with a pool can actually reach it (a lesson plays its MCQs).
 * The splitting board plays in u6-hnmr (audit 23 Oct, top-25 #14); the one
 * board left in U6_UNWIRED is pinned well formed and, honestly, unplayed.
 * u6-ir is pinned with NO lesson pool and NO map link: its IR questions sit
 * in U6_IR_HELD (cited band numbers, audit top-25 #9) and nothing reads them
 * until the owner signs the numbers off. The Unit 6 checkpoint plays a set
 * drawn from the four lessons with a pool (top-25 #15).
 *
 * CONCEPT IDS. CONCEPTS has no spectroscopy concept, so Unit 6 borrows three
 * TOPICS ids as stand-ins, as Unit 2 does for NMR, and the held IR questions
 * a fourth, spectroscopy_ir. Any other id must be a CONCEPTS id.
 *
 * WHAT IS NOT. The chemistry. scripts/u6_pools.py derives it (degrees of
 * unsaturation two ways, RDKit equivalence classes, n + 1 counts, graph
 * distances, isotope clusters from RDKit's abundance table, conjugation
 * flags; every name read back by OPSIN) and refuses to write the file when an
 * authored key disagrees.
 */

import { describe, expect, it } from "vitest";

import { CONCEPTS, TOPICS } from "@blueberry/curriculum";
import { mcqAuthoringViolations } from "../beats/mcq/authoring";
import { figuresOf, mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";
import { lessonMcqBeats, lessonRecogniseBeats, planLesson } from "../beats/template";
import { isExamRun, lessonPool, practicePool } from "../beats/practice/pools";
import type { McqBeat } from "../beats/types";
import { U1_POOLS, mergePools } from "../content/u1";
import type { PoolEntry } from "../content/u1/types";
import { U6_IR_HELD, U6_OPTION_TILES, U6_POOLS, U6_UNWIRED, U6_VISUALS } from "../content/u6";
import { checkpointNodeId, pathwayNode } from "../demo/pathwayMap";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

/**
 * Six lessons. u6-ir is left out on purpose. u6-hnmr went from 9 to 12 on 23 Oct
 * (audit: the chloroethane triplet and quartet items, and the splitting board).
 */
const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  "u6-dou": 8,
  "u6-hnmr": 12,
  "u6-cnmr": 8,
  "u6-ms": 8,
  "u6-2d": 6,
  "u6-uv": 6,
};

const LESSON_NODES = Object.keys(EXPECTED_SIZES);

const TOPIC_STAND_INS = ["degrees_of_unsaturation", "spectroscopy_nmr", "structure_determination", "spectroscopy_ir"];

/** The one pool board a lesson plays (top-25 #14). Every other lesson entry is an MCQ. */
const LESSON_BOARDS: Readonly<Record<string, string>> = { "u6-hnmr": "u6-exam-match-split" };

/** Lesson entries, the unwired board and the held IR questions: every contract below holds for all three. */
const entries: readonly (readonly [string, PoolEntry])[] = [
  ...Object.entries(U6_POOLS),
  ...Object.entries(U6_UNWIRED),
  ...Object.entries(U6_IR_HELD),
].flatMap(([node, pool]) => pool.map((entry) => [node, entry] as const));

const mcqs: readonly McqBeat[] = entries.flatMap(([, entry]) => (entry.item.kind === "mcq" ? [entry.item.beat] : []));

function idAndNode(entry: PoolEntry): { readonly id: string; readonly node: string } {
  switch (entry.item.kind) {
    case "mcq":
      return { id: entry.item.beat.id, node: entry.item.beat.node };
    case "sort":
      return { id: entry.item.content.beat.id, node: entry.item.content.beat.node };
    case "match":
      return { id: entry.item.board.beatId, node: entry.item.board.node };
    case "draw":
      return { id: entry.item.beat.id, node: entry.item.beat.node };
  }
}

function everyFigure(): readonly { readonly where: string; readonly figure: Figure }[] {
  const out: { where: string; figure: Figure }[] = [];
  for (const [id, visual] of Object.entries(U6_VISUALS)) {
    for (const { where, figure } of figuresOf(visual)) out.push({ where: `${id} ${where}`, figure });
  }
  for (const [id, tiles] of Object.entries(U6_OPTION_TILES)) {
    for (const [option, tile] of Object.entries(tiles)) out.push({ where: `${id}::${option}`, figure: tile.figure });
  }
  return out;
}

describe("u6 draft pools", () => {
  it("covers exactly the authored Unit 6 nodes, at the authored sizes", () => {
    const sizes = Object.fromEntries(Object.entries(U6_POOLS).map(([node, pool]) => [node, pool.length]));
    expect(sizes).toEqual(EXPECTED_SIZES);
    expect(Object.keys(U6_UNWIRED)).toEqual(["u6-exam"]);
    expect(U6_UNWIRED["u6-exam"]?.length).toBe(1);
    expect(Object.keys(U6_IR_HELD)).toEqual(["u6-ir"]);
    expect(U6_IR_HELD["u6-ir"]?.length).toBe(6);
  });

  it("leaves u6-ir without a lesson pool and without a map link, so it still reads Coming soon", () => {
    expect(U6_POOLS["u6-ir"]).toBeUndefined();
    expect(lessonPool("u6-ir")).toEqual([]);
    expect(pathwayNode("u6-ir")?.playable).toBeUndefined();
  });

  it("cites the band numbers on every held IR question and marks it held for sign-off", () => {
    for (const entry of U6_IR_HELD["u6-ir"] ?? []) {
      expect(entry.provenance, entry.id).toContain("OpenStax Organic Chemistry ch. 12 (sections 12.8 and 20.8, CC BY-NC-SA)");
      expect(entry.provenance, entry.id).toContain("Held: the owner signs off the numbers");
    }
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
      expect(entry.id.startsWith("u6-"), entry.id).toBe(true);
      const beat = idAndNode(entry);
      expect(beat.id, entry.id).toBe(entry.id);
      expect(beat.node, entry.id).toBe(node);
    }
  });

  it("carries an explanation and a provenance naming the script and the textbook check still owed", () => {
    for (const [, entry] of entries) {
      expect(entry.explanation.trim(), entry.id).not.toBe("");
      expect(entry.provenance, entry.id).toContain("scripts/u6_pools.py");
      expect(entry.provenance, entry.id).toMatch(/OpenStax Organic Chemistry ch\. \d+/);
    }
  });

  it("passes the easy MCQ authoring rules, unchanged", () => {
    expect(mcqs.length).toBeGreaterThan(0);
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
  });

  it("keeps every lesson node to MCQs, bar its one named board, with at least one graded question", () => {
    for (const node of LESSON_NODES) {
      const pool = U6_POOLS[node] ?? [];
      for (const entry of pool) expect(entry.item.kind, entry.id).toBe(entry.id === LESSON_BOARDS[node] ? "match" : "mcq");
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

  it("files every item under CONCEPTS ids, plus only the three named topic stand-ins", () => {
    for (const id of TOPIC_STAND_INS) expect(Object.keys(TOPICS), id).toContain(id);
    const known = new Set([...Object.keys(CONCEPTS), ...TOPIC_STAND_INS]);
    for (const beat of mcqs) {
      expect(beat.conceptIds.length, beat.id).toBeGreaterThan(0);
      for (const id of beat.conceptIds) expect(known.has(id), `${beat.id} ${id}`).toBe(true);
    }
  });

  it("has no em dash anywhere", () => {
    const all = JSON.stringify([U6_POOLS, U6_UNWIRED, U6_VISUALS, U6_OPTION_TILES]);
    expect(all.includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it("merges with Unit 1 with no node or id collision", () => {
    expect(() => mergePools(U1_POOLS, U6_POOLS, U6_UNWIRED, U6_IR_HELD)).not.toThrow();
  });
});

describe("u6 pools are reachable", () => {
  it("keys every lesson pool to a real Unit 6 map node that opens its lesson", () => {
    for (const node of LESSON_NODES) {
      expect(pathwayNode(node)?.id, node).toBe(node);
      expect(pathwayNode(node)?.playable, node).toEqual({ kind: "beat", id: node });
    }
  });

  it("plays every lesson pool's MCQs inside that node's lesson", () => {
    for (const node of LESSON_NODES) {
      const ids = new Set(lessonMcqBeats(node).map((beat) => beat.id));
      const kinds = (planLesson(node)?.steps ?? []).map((step) => step.beat.kind);
      for (const entry of lessonPool(node)) {
        if (entry.item.kind === "match") expect(kinds, `${node} drops ${entry.id}`).toContain("poolMatch");
        else expect(ids.has(entry.id), `${node} drops ${entry.id}`).toBe(true);
      }
      expect(lessonPool(node).length, node).toBe(EXPECTED_SIZES[node]);
      expect(kinds.includes("mcq") || kinds.includes("meet"), `${node} plan ${kinds.join(",")}`).toBe(true);
    }
  });

  it("plays the chloroethane triplet and quartet before the septet and sextet", () => {
    const order = lessonRecogniseBeats("u6-hnmr").map((beat) => beat.id);
    for (const basic of ["u6-hnmr-triplet", "u6-hnmr-quartet"]) {
      expect(order.indexOf(basic), basic).toBeGreaterThanOrEqual(0);
      expect(order.indexOf(basic), basic).toBeLessThan(order.indexOf("u6-hnmr-septet"));
      expect(order.indexOf(basic), basic).toBeLessThan(order.indexOf("u6-hnmr-sextet"));
    }
  });

  it("plays the Unit 6 checkpoint as a whole set drawn from all four lessons, with no IR item and no unwired board", () => {
    const check = checkpointNodeId("u6");
    const pool = practicePool(check);
    expect(isExamRun(check)).toBe(true);
    const homeOf = (entry: PoolEntry) => LESSON_NODES.find((node) => (U6_POOLS[node] ?? []).includes(entry)) ?? "elsewhere";
    expect([...new Set(pool.map(homeOf))].sort()).toEqual(["u6-cnmr", "u6-dou", "u6-hnmr", "u6-ms"]);
    // Interleaved, not in blocks: the first four questions already sample every lesson.
    expect(new Set(pool.slice(0, 4).map(homeOf)).size).toBe(4);
    const ids = new Set(pool.map((entry) => entry.id));
    for (const entry of [...(U6_IR_HELD["u6-ir"] ?? []), ...(U6_UNWIRED["u6-exam"] ?? [])]) expect(ids.has(entry.id), entry.id).toBe(false);
    expect(JSON.stringify(planLesson(check))).not.toContain("u6-ir");
    for (const entry of pool) {
      if (entry.item.kind === "mcq") expect(entry.item.beat.levels.some((level) => level > 0), entry.id).toBe(true);
    }
  });

  it("plays the held IR questions and the unwired board nowhere", () => {
    const sources = [...LESSON_NODES, "u6-ir", checkpointNodeId("u6")];
    const played = new Set(sources.flatMap((node) => [...lessonPool(node), ...practicePool(node)].map((entry) => entry.id)));
    for (const entry of [...(U6_IR_HELD["u6-ir"] ?? []), ...(U6_UNWIRED["u6-exam"] ?? [])]) expect(played.has(entry.id), entry.id).toBe(false);
  });
});

describe("u6 match boards", () => {
  const boards = entries.flatMap(([, entry]) => (entry.item.kind === "match" ? [entry.item.board] : []));

  it("exist, so this block cannot pass vacuously", () => {
    expect(boards.length).toBe(2);
  });

  it("explain every pairing on every board", () => {
    for (const board of boards) {
      expect(Object.keys(board.whyByPrompt).length, board.beatId).toBe(board.answer.prompts.length);
      for (const why of Object.values(board.whyByPrompt)) expect(why.trim(), board.beatId).not.toBe("");
    }
  });
});

describe("u6 drawings", () => {
  it("give every MCQ a registered question drawing, and every tiled MCQ a full set of distinct, named options", () => {
    for (const beat of mcqs) {
      expect(mcqVisualFor(beat.id), `${beat.id} would reach a student as prose`).not.toBeNull();
      const tiles = U6_OPTION_TILES[beat.id];
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
    for (const key of [...Object.keys(U6_VISUALS), ...Object.keys(U6_OPTION_TILES)]) expect(ids.has(key), key).toBe(true);
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
      const visual = U6_VISUALS[beat.id];
      const captions =
        visual === undefined ? [] : visual.kind === "pair" ? [visual.a.name, visual.b.name] : visual.kind === "structure" ? [visual.name] : [];
      for (const caption of captions) {
        expect((caption ?? "").toLowerCase().includes(right), `${beat.id}: caption "${caption}" names the answer`).toBe(false);
      }
    }
  });
});
