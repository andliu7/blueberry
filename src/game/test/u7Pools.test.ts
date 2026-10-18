/**
 * Unit 7 (aldehydes and ketones: nucleophilic addition) draft pools (src/game/content/u7/pools.ts).
 *
 * WHAT IS PINNED, mirroring u5Pools.test.ts and u6Pools.test.ts: the pool
 * contract in content/u1/types.ts (every entry a placeholder, unique ids, an
 * explanation and a provenance on every entry), the easy MCQ authoring rules
 * run unchanged, the exact size of every node, the drawing invariants, and
 * that every node with a pool can actually reach it: a lesson plays its MCQs,
 * and the two ladders and two match boards fill their lesson's order and
 * connect slots. u7-bisulfite is pinned EMPTY: which carbonyls form the
 * adduct and which atom of bisulfite bonds are conventions RDKit cannot
 * check, so it has no pool and keeps no map link (see the u7 owner report).
 *
 * CONCEPT IDS. CONCEPTS holds only cross-cutting ideas (oxidation state,
 * protecting groups, EWG/EDG), so Unit 7 borrows its own TOPICS ids as
 * stand-ins for the rest, as Units 2 and 6 do. Any other id must be a
 * CONCEPTS id.
 *
 * WHAT IS NOT. The chemistry. scripts/u7_pools.py derives it (graph edits for
 * addition, condensation, hydrolysis, reduction, 1,4-addition,
 * Baeyer-Villiger and Cannizzaro; atom balance for byproducts; every name
 * read back by OPSIN) and refuses to write the file when an authored key
 * disagrees.
 */

import { describe, expect, it } from "vitest";

import { CONCEPTS, TOPICS } from "@blueberry/curriculum";
import { mcqAuthoringViolations } from "../beats/mcq/authoring";
import { figuresOf, mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";
import { lessonMcqBeats, planLesson } from "../beats/template";
import { lessonPool, practicePool } from "../beats/practice/pools";
import type { McqBeat } from "../beats/types";
import { U1_POOLS, mergePools } from "../content/u1";
import type { PoolEntry } from "../content/u1/types";
import { U7_OPTION_TILES, U7_POOLS, U7_SORT_FIGURES, U7_VISUALS } from "../content/u7";
import { PATHWAY_UNITS, checkpointNodeId, pathwayNode } from "../demo/pathwayMap";
import { roadOf } from "../tabs/pathway/unitShape";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  "u7-mechanism": 6,
  "u7-hydration": 6,
  "u7-acetal": 7,
  "u7-protect": 6,
  "u7-imine": 7,
  "u7-enamine": 6,
  "u7-grignard": 7,
  "u7-hydride": 6,
  "u7-wittig": 6,
  "u7-12v14": 6,
  "u7-to-ch2": 6,
  "u7-cyanohydrin": 6,
  "u7-thioacetal": 6,
  "u7-derivative-tests": 6,
  "u7-hwe": 6,
  "u7-bv": 6,
  "u7-ald-to-acid": 6,
  "u7-cannizzaro": 6,
  "u7-mpv": 6,
};

const LESSON_NODES = Object.keys(EXPECTED_SIZES);

/** Nodes whose map link was a trainer before this draft. Their link is kept; the lesson embeds the trainer. */
const TRAINER_LINKED = [
  "u7-mechanism", "u7-hydration", "u7-acetal", "u7-imine", "u7-enamine", "u7-grignard",
  "u7-hydride", "u7-wittig", "u7-12v14", "u7-to-ch2", "u7-cyanohydrin",
];

const TOPIC_STAND_INS = [
  "carbonyl_chemistry", "nucleophilic_addition_carbon", "nucleophilic_addition_oxygen",
  "nucleophilic_addition_nitrogen", "conjugate_addition", "prochirality_re_si",
];

/** Lessons whose pool holds a ladder or a match board, and the step it must fill. */
const POOL_STEPS: Readonly<Record<string, string>> = {
  "u7-hydride": "poolSort",
  "u7-ald-to-acid": "poolSort",
  "u7-grignard": "poolMatch",
  "u7-derivative-tests": "poolMatch",
};

const entries: readonly (readonly [string, PoolEntry])[] = Object.entries(U7_POOLS).flatMap(([node, pool]) =>
  pool.map((entry) => [node, entry] as const),
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
    case "draw":
      return { id: entry.item.beat.id, node: entry.item.beat.node };
  }
}

function everyFigure(): readonly { readonly where: string; readonly figure: Figure }[] {
  const out: { where: string; figure: Figure }[] = [];
  for (const [id, visual] of Object.entries(U7_VISUALS)) {
    for (const { where, figure } of figuresOf(visual)) out.push({ where: `${id} ${where}`, figure });
  }
  for (const [id, tiles] of Object.entries(U7_OPTION_TILES)) {
    for (const [option, tile] of Object.entries(tiles)) out.push({ where: `${id}::${option}`, figure: tile.figure });
  }
  for (const [id, cards] of Object.entries(U7_SORT_FIGURES)) {
    for (const [card, tile] of Object.entries(cards)) out.push({ where: `${id}::${card}`, figure: tile.figure });
  }
  return out;
}

describe("u7 draft pools", () => {
  it("covers exactly the authored Unit 7 nodes, at the authored sizes", () => {
    const sizes = Object.fromEntries(Object.entries(U7_POOLS).map(([node, pool]) => [node, pool.length]));
    expect(sizes).toEqual(EXPECTED_SIZES);
  });

  it("leaves u7-bisulfite without a pool and without a map link", () => {
    expect(U7_POOLS["u7-bisulfite"]).toBeUndefined();
    expect(pathwayNode("u7-bisulfite")?.playable).toBeUndefined();
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
      expect(entry.id.startsWith("u7-"), entry.id).toBe(true);
      const beat = idAndNode(entry);
      expect(beat.id, entry.id).toBe(entry.id);
      expect(beat.node, entry.id).toBe(node);
    }
  });

  it("carries an explanation and a provenance naming the script and the textbook check still owed", () => {
    for (const [, entry] of entries) {
      expect(entry.explanation.trim(), entry.id).not.toBe("");
      expect(entry.provenance, entry.id).toContain("scripts/u7_pools.py");
      expect(entry.provenance, entry.id).toMatch(/OpenStax Organic Chemistry ch\. \d+/);
    }
  });

  it("passes the easy MCQ authoring rules, unchanged", () => {
    expect(mcqs.length).toBeGreaterThan(0);
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
  });

  it("gives every lesson node at least one graded MCQ", () => {
    for (const node of LESSON_NODES) {
      const graded = (U7_POOLS[node] ?? []).filter((entry) => entry.item.kind === "mcq" && entry.item.beat.levels.some((level) => level > 0));
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

  it("files every item under CONCEPTS ids, plus only the named topic stand-ins", () => {
    for (const id of TOPIC_STAND_INS) expect(Object.keys(TOPICS), id).toContain(id);
    const known = new Set([...Object.keys(CONCEPTS), ...TOPIC_STAND_INS]);
    for (const beat of mcqs) {
      expect(beat.conceptIds.length, beat.id).toBeGreaterThan(0);
      for (const id of beat.conceptIds) expect(known.has(id), `${beat.id} ${id}`).toBe(true);
    }
  });

  it("has no em dash anywhere", () => {
    const all = JSON.stringify([U7_POOLS, U7_VISUALS, U7_OPTION_TILES, U7_SORT_FIGURES]);
    expect(all.includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it("merges with Unit 1 with no node or id collision", () => {
    expect(() => mergePools(U1_POOLS, U7_POOLS)).not.toThrow();
  });
});

describe("u7 pools are reachable", () => {
  it("keys every lesson pool to a real Unit 7 map node", () => {
    for (const node of LESSON_NODES) expect(pathwayNode(node)?.id, node).toBe(node);
  });

  it("opens the lesson from the map for every node whose link is not a kept trainer", () => {
    for (const node of LESSON_NODES) {
      const link = pathwayNode(node)?.playable;
      if (TRAINER_LINKED.includes(node)) {
        expect(link?.kind === "sequence" || link?.kind === "reaction", `${node} lost its trainer link`).toBe(true);
      } else {
        expect(link, node).toEqual({ kind: "beat", id: node });
      }
    }
  });

  it("plays every lesson pool's MCQs inside that node's lesson", () => {
    for (const node of LESSON_NODES) {
      expect(lessonPool(node).length, node).toBe(EXPECTED_SIZES[node]);
      const ids = new Set(lessonMcqBeats(node).map((beat) => beat.id));
      for (const entry of lessonPool(node)) {
        if (entry.item.kind === "mcq") expect(ids.has(entry.id), `${node} drops ${entry.id}`).toBe(true);
      }
      const kinds = (planLesson(node)?.steps ?? []).map((step) => step.beat.kind);
      expect(kinds.includes("mcq") || kinds.includes("meet"), `${node} plan ${kinds.join(",")}`).toBe(true);
    }
  });

  it("plays each lesson's ladder or match board in its own step", () => {
    for (const [node, kind] of Object.entries(POOL_STEPS)) {
      const kinds = (planLesson(node)?.steps ?? []).map((step) => step.beat.kind);
      expect(kinds, node).toContain(kind);
    }
  });

  it("embeds the kept trainer in every trainer-linked lesson", () => {
    for (const node of TRAINER_LINKED) {
      const kinds = (planLesson(node)?.steps ?? []).map((step) => step.beat.kind);
      expect(kinds, node).toContain("mechanism");
    }
  });

  it("hangs the new side quests at most two to a lesson (pathwayBranchDensity's rule, Unit 7 only)", () => {
    const unit = PATHWAY_UNITS.find((entry) => entry.id === "u7");
    expect(unit).toBeDefined();
    for (const stop of roadOf(unit!)) {
      const items = stop.sides.length + (stop.sidesSoon.length > 0 ? 1 : 0);
      expect(items, `u7/${stop.node.id} side lane`).toBeLessThanOrEqual(2);
    }
  });

  it("leaves the Unit 7 checkpoint on its derived mix", () => {
    expect(practicePool(checkpointNodeId("u7"))).toEqual([]);
  });
});

describe("u7 boards and ladders", () => {
  const boards = entries.flatMap(([, entry]) => (entry.item.kind === "match" ? [entry.item.board] : []));
  const ladders = entries.flatMap(([, entry]) => (entry.item.kind === "sort" ? [entry.item.content] : []));

  it("exist, so this block cannot pass vacuously", () => {
    expect(boards.length).toBe(2);
    expect(ladders.length).toBe(2);
  });

  it("explain every pairing on every board", () => {
    for (const board of boards) {
      expect(Object.keys(board.whyByPrompt).length, board.beatId).toBe(board.answer.prompts.length);
      for (const why of Object.values(board.whyByPrompt)) expect(why.trim(), board.beatId).not.toBe("");
    }
  });

  it("draws every card of every ladder", () => {
    for (const content of ladders) {
      const drawn = U7_SORT_FIGURES[content.beat.id] ?? {};
      expect(Object.keys(drawn).sort(), content.beat.id).toEqual(content.beat.items.map((item) => item.id).sort());
    }
  });
});

describe("u7 drawings", () => {
  it("give every MCQ a registered question drawing, and every tiled MCQ a full set of distinct, named options", () => {
    for (const beat of mcqs) {
      expect(mcqVisualFor(beat.id), `${beat.id} would reach a student as prose`).not.toBeNull();
      const tiles = U7_OPTION_TILES[beat.id];
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
    for (const key of [...Object.keys(U7_VISUALS), ...Object.keys(U7_OPTION_TILES)]) expect(ids.has(key), key).toBe(true);
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
    }
  });

  it("never captions the question drawing with the right option's text", () => {
    for (const beat of mcqs) {
      const right = beat.options.find((option) => option.id === beat.correctOptionId)?.text.toLowerCase() ?? "";
      const visual = U7_VISUALS[beat.id];
      const captions =
        visual === undefined ? [] : visual.kind === "pair" ? [visual.a.name, visual.b.name] : visual.kind === "structure" ? [visual.name] : [];
      for (const caption of captions) {
        expect((caption ?? "").toLowerCase().includes(right), `${beat.id}: caption "${caption}" names the answer`).toBe(false);
      }
    }
  });
});
