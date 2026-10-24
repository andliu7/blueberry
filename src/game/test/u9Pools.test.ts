/**
 * Unit 9 (enols and enolates, alpha-carbon chemistry) draft pools (src/game/content/u9/pools.ts).
 *
 * WHAT IS PINNED, mirroring u8Pools.test.ts: the pool contract in
 * content/u1/types.ts (every entry a placeholder, unique ids, an explanation
 * and a provenance on every entry), the easy MCQ authoring rules run
 * unchanged, the exact size of every node, the drawing invariants, and that
 * every node with a pool can actually reach it: a lesson plays its MCQs, and
 * the ladder and the two match boards fill their lesson's order and connect
 * slots.
 *
 * CONCEPT IDS. CONCEPTS holds only cross-cutting ideas (pKa viability,
 * kinetic against thermodynamic control, resonance), so Unit 9 borrows TOPICS
 * ids as stand-ins for the rest, as Units 2, 6, 7 and 8 do. Any other id must
 * be a CONCEPTS id.
 *
 * WHAT IS NOT. The chemistry. scripts/u9_pools.py derives it (graph edits for
 * enols, halogenation, aldol, Claisen, alkylation, decarboxylation, conjugate
 * addition, enamines, Mannich and Reformatsky; pKa from the course table;
 * atom balance for byproducts; every name read back by OPSIN) and refuses to
 * write the file when an authored key disagrees.
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
import { U9_OPTION_TILES, U9_POOLS, U9_SORT_FIGURES, U9_VISUALS } from "../content/u9";
import { PATHWAY_UNITS, checkpointNodeId, pathwayNode } from "../demo/pathwayMap";
import { roadOf } from "../tabs/pathway/unitShape";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  "u9-tautomer": 6,
  "u9-pka": 6,
  "u9-enolate-res": 6,
  "u9-kvt-enolate": 6,
  "u9-halo-acid": 6,
  "u9-halo-base": 6,
  "u9-aldol": 6,
  "u9-aldol-cond": 7,
  "u9-crossed": 6,
  "u9-intra": 6,
  "u9-claisen": 6,
  "u9-dieckmann": 6,
  "u9-crossed-claisen": 6,
  "u9-alkylation": 6,
  "u9-malonic": 7,
  "u9-acetoacetic": 6,
  "u9-michael": 6,
  "u9-cuprate": 7,
  "u9-robinson": 6,
  "u9-retro": 6,
  "u9-haloform": 6,
  "u9-stork": 6,
  "u9-mannich": 6,
  "u9-knoevenagel": 6,
  "u9-reformatsky": 6,
  "u9-directed": 6,
};

const LESSON_NODES = Object.keys(EXPECTED_SIZES);

/** Nodes whose map link was a trainer before this draft. Their link is kept; the lesson embeds the trainer. */
const TRAINER_LINKED = [
  "u9-tautomer", "u9-halo-acid", "u9-halo-base", "u9-aldol", "u9-aldol-cond", "u9-crossed",
  "u9-intra", "u9-claisen", "u9-dieckmann", "u9-crossed-claisen", "u9-alkylation", "u9-malonic", "u9-acetoacetic",
  "u9-michael", "u9-cuprate", "u9-robinson",
];

/**
 * Nodes whose map link is a resonance surface. CHANGED 2026-10-24, audit 23 Oct top-25 #23: u9-enolate-res
 * was a kept trainer linked to seq-aldol, six lessons before the aldol is taught; it now pushes the enolate's
 * own two resonance forms and no aldol.
 */
const RESONANCE_LINKED: Readonly<Record<string, string>> = {
  "u9-enolate-res": "res-enolate",
};

const TOPIC_STAND_INS = [
  "enols_and_enolates", "aldol_and_claisen", "alpha_alkylation", "conjugate_addition", "multistep_synthesis",
  "nucleophilic_addition_nitrogen",
];

/** Lessons whose pool holds a ladder or a match board, and the step it must fill. */
const POOL_STEPS: Readonly<Record<string, string>> = {
  "u9-pka": "poolSort",
  "u9-halo-base": "poolMatch",
  "u9-cuprate": "poolMatch",
};

/** Every lesson entry: the contracts below hold for each. */
const entries: readonly (readonly [string, PoolEntry])[] = Object.entries(U9_POOLS).flatMap(
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
    case "draw":
      return { id: entry.item.beat.id, node: entry.item.beat.node };
  }
}

function everyFigure(): readonly { readonly where: string; readonly figure: Figure }[] {
  const out: { where: string; figure: Figure }[] = [];
  for (const [id, visual] of Object.entries(U9_VISUALS)) {
    for (const { where, figure } of figuresOf(visual)) out.push({ where: `${id} ${where}`, figure });
  }
  for (const [id, tiles] of Object.entries(U9_OPTION_TILES)) {
    for (const [option, tile] of Object.entries(tiles)) out.push({ where: `${id}::${option}`, figure: tile.figure });
  }
  for (const [id, cards] of Object.entries(U9_SORT_FIGURES)) {
    for (const [card, tile] of Object.entries(cards)) out.push({ where: `${id}::${card}`, figure: tile.figure });
  }
  return out;
}

describe("u9 draft pools", () => {
  it("covers exactly the authored Unit 9 nodes, at the authored sizes", () => {
    const sizes = Object.fromEntries(Object.entries(U9_POOLS).map(([node, pool]) => [node, pool.length]));
    expect(sizes).toEqual(EXPECTED_SIZES);
  });

  it("drafts a pool for every Unit 9 map node", () => {
    const unit = PATHWAY_UNITS.find((entry) => entry.id === "u9");
    expect(unit).toBeDefined();
    expect(unit!.nodes.map((node) => node.id).sort()).toEqual([...LESSON_NODES].sort());
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
      expect(entry.id.startsWith("u9-"), entry.id).toBe(true);
      const beat = idAndNode(entry);
      expect(beat.id, entry.id).toBe(entry.id);
      expect(beat.node, entry.id).toBe(node);
    }
  });

  it("carries an explanation and a provenance naming the script and the textbook check still owed", () => {
    for (const [, entry] of entries) {
      expect(entry.explanation.trim(), entry.id).not.toBe("");
      expect(entry.provenance, entry.id).toContain("scripts/u9_pools.py");
      expect(entry.provenance, entry.id).toMatch(/OpenStax Organic Chemistry ch\. \d+/);
    }
  });

  it("passes the easy MCQ authoring rules, unchanged", () => {
    expect(mcqs.length).toBeGreaterThan(0);
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
  });

  it("gives every lesson node at least one graded MCQ", () => {
    for (const node of LESSON_NODES) {
      const graded = (U9_POOLS[node] ?? []).filter((entry) => entry.item.kind === "mcq" && entry.item.beat.levels.some((level) => level > 0));
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
    const all = JSON.stringify([U9_POOLS, U9_VISUALS, U9_OPTION_TILES, U9_SORT_FIGURES]);
    expect(all.includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it("merges with Unit 1 with no node or id collision", () => {
    expect(() => mergePools(U1_POOLS, U9_POOLS)).not.toThrow();
  });
});

describe("u9 pools are reachable", () => {
  it("keys every lesson pool to a real Unit 9 map node", () => {
    for (const node of LESSON_NODES) expect(pathwayNode(node)?.id, node).toBe(node);
  });

  it("opens the lesson from the map for every node whose link is not a kept trainer", () => {
    for (const node of LESSON_NODES) {
      const link = pathwayNode(node)?.playable;
      if (TRAINER_LINKED.includes(node)) {
        expect(link?.kind === "sequence" || link?.kind === "reaction", `${node} lost its trainer link`).toBe(true);
      } else if (node in RESONANCE_LINKED) {
        expect(link, node).toEqual({ kind: "resonance", id: RESONANCE_LINKED[node] });
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

  it("plays the resonance surface, and no mechanism, in every resonance-linked lesson", () => {
    for (const node of Object.keys(RESONANCE_LINKED)) {
      const kinds = (planLesson(node)?.steps ?? []).map((step) => step.beat.kind);
      expect(kinds, node).toContain("resonance");
      expect(kinds, node).not.toContain("mechanism");
    }
  });

  it("hangs the new side quests at most two to a lesson (pathwayBranchDensity's rule, Unit 9 only)", () => {
    const unit = PATHWAY_UNITS.find((entry) => entry.id === "u9");
    expect(unit).toBeDefined();
    for (const stop of roadOf(unit!)) {
      const items = stop.sides.length + (stop.sidesSoon.length > 0 ? 1 : 0);
      expect(items, `u9/${stop.node.id} side lane`).toBeLessThanOrEqual(2);
    }
  });

  it("leaves the Unit 9 checkpoint on its derived mix", () => {
    expect(practicePool(checkpointNodeId("u9"))).toEqual([]);
  });
});

describe("u9 boards and ladders", () => {
  const boards = entries.flatMap(([, entry]) => (entry.item.kind === "match" ? [entry.item.board] : []));
  const ladders = entries.flatMap(([, entry]) => (entry.item.kind === "sort" ? [entry.item.content] : []));

  it("exist, so this block cannot pass vacuously", () => {
    expect(boards.length).toBe(2);
    expect(ladders.length).toBe(1);
  });

  it("explain every pairing on every board", () => {
    for (const board of boards) {
      expect(Object.keys(board.whyByPrompt).length, board.beatId).toBe(board.answer.prompts.length);
      for (const why of Object.values(board.whyByPrompt)) expect(why.trim(), board.beatId).not.toBe("");
    }
  });

  it("draws every card of every ladder", () => {
    for (const content of ladders) {
      const drawn = U9_SORT_FIGURES[content.beat.id] ?? {};
      expect(Object.keys(drawn).sort(), content.beat.id).toEqual(content.beat.items.map((item) => item.id).sort());
    }
  });
});

describe("u9 drawings", () => {
  it("give every MCQ a registered question drawing, and every tiled MCQ a full set of distinct, named options", () => {
    for (const beat of mcqs) {
      expect(mcqVisualFor(beat.id), `${beat.id} would reach a student as prose`).not.toBeNull();
      const tiles = U9_OPTION_TILES[beat.id];
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
    for (const key of [...Object.keys(U9_VISUALS), ...Object.keys(U9_OPTION_TILES)]) expect(ids.has(key), key).toBe(true);
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
      const visual = U9_VISUALS[beat.id];
      const captions =
        visual === undefined ? [] : visual.kind === "pair" ? [visual.a.name, visual.b.name] : visual.kind === "structure" ? [visual.name] : [];
      for (const caption of captions) {
        expect((caption ?? "").toLowerCase().includes(right), `${beat.id}: caption "${caption}" names the answer`).toBe(false);
      }
    }
  });
});
