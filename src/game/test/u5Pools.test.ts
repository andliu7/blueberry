/**
 * Unit 5 (alcohols, diols, ethers and epoxides) draft pools (src/game/content/u5/pools.ts).
 *
 * WHAT IS PINNED, mirroring u4Pools.test.ts: the pool contract in
 * content/u1/types.ts (every entry a placeholder, unique ids, an explanation
 * and a provenance on every entry), the easy MCQ authoring rules run
 * unchanged, the exact size of every node, the drawing invariants, and that
 * every node with a pool can actually reach it (a lesson plays its MCQs).
 * The drafted ladders and board (U5_UNWIRED) are pinned well formed and,
 * honestly, unplayed: no surface reads them until the owner decides where.
 * u5-sharpless is pinned as having no pool and no link, because its one
 * teachable answer (which face chiral DET picks) is a mnemonic RDKit cannot derive.
 *
 * WHAT IS NOT. The chemistry. scripts/u5_pools.py derives it (graph edits,
 * 3D placement read back for stereo, mass balance, OPSIN read-back of every
 * name) and refuses to write the file when an authored key disagrees.
 */

import { describe, expect, it } from "vitest";

import { CONCEPTS } from "@blueberry/curriculum";
import { mcqAuthoringViolations } from "../beats/mcq/authoring";
import { figuresOf, mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";
import { lessonMcqBeats, planLesson } from "../beats/template";
import { lessonPool, practicePool } from "../beats/practice/pools";
import type { McqBeat } from "../beats/types";
import { U1_POOLS, mergePools } from "../content/u1";
import type { PoolEntry } from "../content/u1/types";
import { U5_OPTION_TILES, U5_POOLS, U5_SORT_FIGURES, U5_UNWIRED, U5_VISUALS } from "../content/u5";
import { checkpointNodeId, pathwayNode } from "../demo/pathwayMap";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

/** Eighteen lessons of MCQs: all eleven spine nodes and seven of the eight side quests (u5-sharpless has none). */
const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  "u5-roh-rx": 7,
  "u5-tosylate": 6,
  "u5-dehydration": 7,
  "u5-oxidation": 6,
  "u5-williamson": 6,
  "u5-protecting": 7,
  "u5-epoxidation": 6,
  "u5-ep-acid": 6,
  "u5-ep-base": 7,
  "u5-syn-diol": 6,
  "u5-anti-diol": 6,
  "u5-appel": 6,
  "u5-swern": 6,
  "u5-alkoxymerc": 6,
  "u5-cleavage": 6,
  "u5-diol-cleave": 6,
  "u5-pinacol": 6,
  "u5-thiols": 6,
};

/** Nodes whose map link stays a trainer (sequence or reaction), kept as it was. Their pools play on the lesson route only. */
const TRAINER_LINKED = ["u5-roh-rx", "u5-tosylate", "u5-dehydration", "u5-williamson", "u5-epoxidation", "u5-ep-acid", "u5-ep-base", "u5-anti-diol"];

/** Nodes that were already beat links before this draft (a shipped sort or match board); the draft adds MCQs to their lessons. */
const BEAT_LINKED_BEFORE = ["u5-oxidation", "u5-protecting", "u5-syn-diol"];

const LESSON_NODES = Object.keys(EXPECTED_SIZES);

/** Lesson entries and the unwired ladders and boards: every contract below holds for both. */
const entries: readonly (readonly [string, PoolEntry])[] = [...Object.entries(U5_POOLS), ...Object.entries(U5_UNWIRED)].flatMap(
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
  for (const [id, visual] of Object.entries(U5_VISUALS)) {
    for (const { where, figure } of figuresOf(visual)) out.push({ where: `${id} ${where}`, figure });
  }
  for (const [id, tiles] of Object.entries(U5_OPTION_TILES)) {
    for (const [option, tile] of Object.entries(tiles)) out.push({ where: `${id}::${option}`, figure: tile.figure });
  }
  for (const [id, cards] of Object.entries(U5_SORT_FIGURES)) {
    for (const [card, tile] of Object.entries(cards)) out.push({ where: `${id}::${card}`, figure: tile.figure });
  }
  return out;
}

describe("u5 draft pools", () => {
  it("covers exactly the authored Unit 5 nodes, at the authored sizes", () => {
    const sizes = Object.fromEntries(Object.entries(U5_POOLS).map(([node, pool]) => [node, pool.length]));
    expect(sizes).toEqual(EXPECTED_SIZES);
    expect(Object.keys(U5_UNWIRED)).toEqual(["u5-exam"]);
    expect(U5_UNWIRED["u5-exam"]?.length).toBe(4);
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
      expect(entry.id.startsWith("u5-"), entry.id).toBe(true);
      const beat = idAndNode(entry);
      expect(beat.id, entry.id).toBe(entry.id);
      expect(beat.node, entry.id).toBe(node);
    }
  });

  it("carries an explanation and a provenance naming the script and the OpenStax check on every entry", () => {
    for (const [, entry] of entries) {
      expect(entry.explanation.trim(), entry.id).not.toBe("");
      expect(entry.provenance, entry.id).toContain("scripts/u5_pools.py");
      expect(entry.provenance, entry.id).toMatch(/OpenStax Organic Chemistry \d+\.\d+ \(CC BY-NC-SA\) is the named check, not yet read against this draft/);
    }
  });

  it("passes the easy MCQ authoring rules, unchanged", () => {
    expect(mcqs.length).toBeGreaterThan(0);
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
  });

  it("keeps every lesson node to MCQs, with at least one graded question", () => {
    for (const node of LESSON_NODES) {
      const pool = U5_POOLS[node] ?? [];
      for (const entry of pool) expect(entry.item.kind, entry.id).toBe("mcq");
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
    const all = JSON.stringify([U5_POOLS, U5_VISUALS, U5_OPTION_TILES, U5_SORT_FIGURES]);
    expect(all.includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it("merges with Unit 1 with no node or id collision", () => {
    expect(() => mergePools(U1_POOLS, U5_POOLS, U5_UNWIRED)).not.toThrow();
  });
});

describe("u5 pools are reachable", () => {
  it("leaves u5-sharpless without a pool or a link", () => {
    expect(U5_POOLS["u5-sharpless"]).toBeUndefined();
    expect(pathwayNode("u5-sharpless")?.playable).toBeUndefined();
  });

  it("keys every lesson pool to a real Unit 5 map node", () => {
    for (const node of LESSON_NODES) expect(pathwayNode(node)?.id, node).toBe(node);
  });

  it("plays every lesson pool's MCQs inside that node's lesson", () => {
    for (const node of LESSON_NODES) {
      const ids = new Set(lessonMcqBeats(node).map((beat) => beat.id));
      for (const entry of lessonPool(node)) expect(ids.has(entry.id), `${node} drops ${entry.id}`).toBe(true);
      expect(lessonPool(node).length, node).toBe(EXPECTED_SIZES[node]);
      const kinds = (planLesson(node)?.steps ?? []).map((step) => step.beat.kind);
      expect(kinds.includes("mcq") || kinds.includes("meet"), `${node} plan ${kinds.join(",")}`).toBe(true);
    }
  });

  it("opens the lesson from the map for every node whose link is not a kept trainer", () => {
    for (const node of LESSON_NODES) {
      const link = pathwayNode(node)?.playable;
      if (TRAINER_LINKED.includes(node)) {
        expect(link?.kind === "sequence" || link?.kind === "reaction", `${node} lost its trainer link`).toBe(true);
      } else {
        expect(link, node).toEqual({ kind: "beat", id: node });
        if (BEAT_LINKED_BEFORE.includes(node)) expect(link?.id, node).toBe(node);
      }
    }
  });

  it("leaves the Unit 5 checkpoint on its derived mix, so the unwired ladders and boards reach no student yet", () => {
    expect(practicePool(checkpointNodeId("u5"))).toEqual([]);
    const played = new Set(LESSON_NODES.flatMap((node) => [...lessonPool(node), ...practicePool(node)].map((entry) => entry.id)));
    for (const entry of U5_UNWIRED["u5-exam"] ?? []) expect(played.has(entry.id), entry.id).toBe(false);
  });
});

describe("u5 sort ladders and match boards", () => {
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
      const drawn = U5_SORT_FIGURES[content.beat.id];
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

describe("u5 drawings", () => {
  it("give every MCQ a registered question drawing, and every tiled MCQ a full set of distinct, named options", () => {
    for (const beat of mcqs) {
      expect(mcqVisualFor(beat.id), `${beat.id} would reach a student as prose`).not.toBeNull();
      const tiles = U5_OPTION_TILES[beat.id];
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
    for (const key of [...Object.keys(U5_VISUALS), ...Object.keys(U5_OPTION_TILES)]) expect(ids.has(key), key).toBe(true);
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
      const visual = U5_VISUALS[beat.id];
      const captions =
        visual === undefined ? [] : visual.kind === "pair" ? [visual.a.name, visual.b.name] : visual.kind === "structure" ? [visual.name] : [];
      for (const caption of captions) {
        expect((caption ?? "").toLowerCase().includes(right), `${beat.id}: caption "${caption}" names the answer`).toBe(false);
      }
    }
  });
});
