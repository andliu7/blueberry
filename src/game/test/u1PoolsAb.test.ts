/**
 * Unit 1 problem pools, stages A and B (src/game/content/u1/stage-ab.ts).
 *
 * WHAT IS PINNED. The pool contract in content/u1/types.ts (every entry a
 * placeholder, unique ids, an explanation on every entry), the easy MCQ
 * authoring rules from beats/mcq/authoring.ts run unchanged over every MCQ,
 * the pool size of every stage A and B node, and the drawing invariants the
 * mcqFigures suite holds for the shipped beats.
 *
 * WHAT IS NOT. The chemistry. That is derived by scripts/u1_pools_ab.py with
 * RDKit, which refuses to write the file when an authored key disagrees with
 * what it derived. A check here that tried to re-derive a product would be a
 * second, weaker copy of that script.
 */

import { describe, expect, it } from "vitest";

import { mcqAuthoringViolations } from "../beats/mcq/authoring";
import { figuresOf } from "../beats/mcq/mcqFigures";
import type { McqBeat } from "../beats/types";
import {
  STAGE_AB_OPTION_TILES,
  STAGE_AB_POOLS,
  STAGE_AB_SORT_FIGURES,
  STAGE_AB_VISUALS,
} from "../content/u1/stage-ab";
import type { PoolEntry } from "../content/u1/types";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

/**
 * The size of every pool, exactly. A practice node wants 12 so the
 * 10-in-a-row tier is reachable; the ones below 12 are short on purpose and
 * the authoring log says why. Video nodes carry 2 or 3 recognise MCQs, and
 * quiz nodes draw a mixed 10.
 */
// CHANGED 2026-10-17 (U1-P3): one "Draw it" item joined u1-allylic, u1-kvt,
// u1-12v14, u1-hx-dienes, u1-x2 and u1-quiz-b. Two MCQs became ladders under
// their own ids (u1-cat-middle-methyl, u1-ani-ring), which changes no size.
const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  "u1-allylic": 4,
  "u1-rank-cation": 12,
  "u1-rank-anion": 12,
  "u1-rank-radical": 10,
  "u1-quiz-a": 10,
  "u1-kvt": 3,
  "u1-energy-diagram": 12,
  "u1-12v14": 4,
  "u1-hx-dienes": 13,
  "u1-x2": 13,
  "u1-quiz-b": 11,
};

const RADICAL_NODE = "u1-rank-radical";

const entries: readonly (readonly [string, PoolEntry])[] = Object.entries(STAGE_AB_POOLS).flatMap(
  ([node, pool]) => pool.map((entry) => [node, entry] as const),
);

const mcqs: readonly McqBeat[] = entries.flatMap(([, entry]) =>
  entry.item.kind === "mcq" ? [entry.item.beat] : [],
);

function everyFigure(): readonly { readonly where: string; readonly figure: Figure }[] {
  const out: { where: string; figure: Figure }[] = [];
  for (const [id, visual] of Object.entries(STAGE_AB_VISUALS)) {
    for (const { where, figure } of figuresOf(visual)) out.push({ where: `${id} ${where}`, figure });
  }
  for (const [id, tiles] of Object.entries(STAGE_AB_OPTION_TILES)) {
    for (const [option, tile] of Object.entries(tiles)) out.push({ where: `${id}::${option}`, figure: tile.figure });
  }
  for (const [id, cards] of Object.entries(STAGE_AB_SORT_FIGURES)) {
    for (const [card, tile] of Object.entries(cards)) out.push({ where: `${id}::${card}`, figure: tile.figure });
  }
  // The "Draw it" items carry their scheme and the answer drawing inline.
  for (const [, entry] of entries) {
    if (entry.item.kind !== "draw") continue;
    for (const { where, figure } of figuresOf(entry.item.beat.visual)) out.push({ where: `${entry.id} ${where}`, figure });
    out.push({ where: `${entry.id} answer`, figure: entry.item.beat.answer.figure });
  }
  return out;
}

describe("u1 stage A and B pools", () => {
  it("covers exactly the stage A and B nodes, at the authored sizes", () => {
    const sizes = Object.fromEntries(Object.entries(STAGE_AB_POOLS).map(([node, pool]) => [node, pool.length]));
    expect(sizes).toEqual(EXPECTED_SIZES);
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
      const beat =
        entry.item.kind === "mcq" || entry.item.kind === "draw"
          ? entry.item.beat
          : entry.item.kind === "sort"
            ? entry.item.content.beat
            : null;
      expect(beat, `${entry.id} is neither an mcq, a sort nor a drawing`).not.toBeNull();
      expect(beat?.id, entry.id).toBe(entry.id);
      expect(beat?.node, entry.id).toBe(node);
    }
  });

  it("carries an explanation and a provenance naming the script on every entry", () => {
    for (const [, entry] of entries) {
      expect(entry.explanation.trim(), entry.id).not.toBe("");
      expect(entry.provenance, entry.id).toContain("scripts/u1_pools_ab.py");
    }
  });

  it("passes the easy MCQ authoring rules, unchanged", () => {
    expect(mcqs.length).toBeGreaterThan(0);
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
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

  it("keeps radical items inside the radical node only", () => {
    for (const [node, entry] of entries) {
      if (node === RADICAL_NODE) continue;
      const shown = JSON.stringify(entry.item) + entry.explanation;
      expect(/radical/i.test(shown), `${entry.id} mentions a radical outside ${RADICAL_NODE}`).toBe(false);
    }
  });

  it("has no em dash anywhere", () => {
    const all = JSON.stringify([STAGE_AB_POOLS, STAGE_AB_VISUALS, STAGE_AB_OPTION_TILES, STAGE_AB_SORT_FIGURES]);
    expect(all.includes(String.fromCharCode(0x2014))).toBe(false);
  });
});

describe("u1 stage A and B sort ladders", () => {
  const sorts = entries.flatMap(([, entry]) => (entry.item.kind === "sort" ? [entry.item.content] : []));

  it("exist, so this block cannot pass vacuously", () => {
    expect(sorts.length).toBeGreaterThan(0);
  });

  it("render the order the judge grades against, with a reason on every card", () => {
    for (const content of sorts) {
      expect(content.beat.order, content.beat.id).toEqual(content.spec.correctOrder);
      for (const item of content.beat.items) expect(item.why?.trim(), `${content.beat.id}::${item.id}`).toBeTruthy();
    }
  });

  it("draw every card", () => {
    for (const content of sorts) {
      const drawn = STAGE_AB_SORT_FIGURES[content.beat.id];
      expect(drawn, content.beat.id).toBeDefined();
      expect(Object.keys(drawn ?? {}).sort()).toEqual(content.beat.items.map((item) => item.id).sort());
    }
  });
});

describe("u1 stage A and B drawings", () => {
  it("give every MCQ a question drawing, and every tiled MCQ a full set of drawn options", () => {
    for (const beat of mcqs) {
      const visual = STAGE_AB_VISUALS[beat.id];
      const tiles = STAGE_AB_OPTION_TILES[beat.id];
      expect(visual, `${beat.id} would reach a student as prose`).toBeDefined();
      if (tiles !== undefined) {
        expect(Object.keys(tiles).sort(), beat.id).toEqual(beat.options.map((option) => option.id).sort());
        const drawn = Object.values(tiles).map((tile) => JSON.stringify(tile.figure));
        expect(new Set(drawn).size, `${beat.id} draws two options the same`).toBe(drawn.length);
        for (const tile of Object.values(tiles)) expect(tile.name, beat.id).toBeTruthy();
      }
    }
  });

  it("keys no drawing to a beat that does not exist", () => {
    const ids = new Set(mcqs.map((beat) => beat.id));
    for (const key of [...Object.keys(STAGE_AB_VISUALS), ...Object.keys(STAGE_AB_OPTION_TILES)]) {
      expect(ids.has(key), key).toBe(true);
    }
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
});
