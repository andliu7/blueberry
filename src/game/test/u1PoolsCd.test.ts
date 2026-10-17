/**
 * Unit 1, stages C and D: the draft pools hold their contract.
 *
 * What this checks is structure and authoring discipline, never the chemistry
 * itself: that lives in scripts/u1_pools_cd.py, which asserts every product,
 * label and count it reports. Here: every entry is a placeholder, ids are
 * unique, every explanation exists and passes the voice lint, every MCQ passes
 * the same authoring rules the shipped MCQs pass, every entry carries a
 * drawing that stays inside its box, and each pool is the size it claims.
 */

import { CONCEPTS } from "@blueberry/curriculum";
import { describe, expect, it } from "vitest";

import { copyVoiceViolations, mcqAuthoringViolations } from "../beats/mcq/authoring";
import { figuresOf } from "../beats/mcq/mcqFigures";
import type { McqBeat } from "../beats/types";
import {
  STAGE_CD_EXAM_IDS,
  STAGE_CD_OPTION_TILES,
  STAGE_CD_POOLS,
  STAGE_CD_VISUALS,
} from "../content/u1/stage-cd";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

/** The sizes this file promises. A change here is a content change, stated. */
const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  "u1-nbs": 3,
  "u1-nbs-practice": 12,
  "u1-quiz-c": 10,
  "u1-mo": 12,
  "u1-da": 3,
  "u1-dienes": 3,
  "u1-dienophiles": 3,
  "u1-da-predict": 12,
  "u1-da-stereo": 3,
  "u1-da-3d": 12,
  "u1-quiz-d": 10,
  "u1-exam": 6,
};

const entries = Object.values(STAGE_CD_POOLS).flat();
const mcqs: McqBeat[] = entries.flatMap((e) => (e.item.kind === "mcq" ? [e.item.beat] : []));

describe("stage C and D pools", () => {
  it("are the promised size, node by node", () => {
    const sizes = Object.fromEntries(Object.entries(STAGE_CD_POOLS).map(([node, pool]) => [node, pool.length]));
    expect(sizes).toEqual(EXPECTED_SIZES);
  });

  it("mark every entry as a placeholder", () => {
    for (const e of entries) expect(e.placeholder, e.id).toBe(true);
  });

  it("use unique ids, all prefixed u1-cd-", () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith("u1-cd-"), id).toBe(true);
  });

  it("key each MCQ on its own entry id and its own pool node", () => {
    for (const [node, pool] of Object.entries(STAGE_CD_POOLS)) {
      for (const e of pool) {
        if (e.item.kind !== "mcq") continue;
        expect(e.item.beat.id, e.id).toBe(e.id);
        expect(e.item.beat.node, e.id).toBe(node);
      }
    }
  });

  it("give every entry an explanation that passes the voice lint", () => {
    for (const e of entries) {
      expect(e.explanation.trim(), e.id).not.toBe("");
      expect(copyVoiceViolations(e.explanation), e.id).toEqual([]);
    }
  });

  it("name the derivation script in every provenance, and state any conditions in full", () => {
    for (const e of entries) {
      expect(e.provenance, e.id).toMatch(/scripts\/u1_pools_cd\.py|Concept item/);
      if (e.conditions !== undefined) expect(e.conditions.trim(), e.id).not.toBe("");
    }
  });

  it("pass the MCQ authoring rules every shipped MCQ passes", () => {
    expect(mcqs.length).toBe(entries.length);
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
  });

  it("key concepts on real curriculum concepts", () => {
    for (const beat of mcqs) {
      for (const c of beat.conceptIds) expect(Object.keys(CONCEPTS), `${beat.id} ${c}`).toContain(c);
    }
  });

  it("vary the correct option's position, no index holding more than half", () => {
    const counts = new Map<number, number>();
    for (const beat of mcqs) {
      const i = beat.options.findIndex((o) => o.id === beat.correctOptionId);
      counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(mcqs.length / 2);
  });

  it("contain no em dash anywhere", () => {
    expect(JSON.stringify(STAGE_CD_POOLS)).not.toContain("—");
  });

  it("list exam ids that are all in the u1-exam pool", () => {
    const exam = new Set((STAGE_CD_POOLS["u1-exam"] ?? []).map((e) => e.id));
    for (const id of STAGE_CD_EXAM_IDS) expect(exam.has(id), id).toBe(true);
  });
});

describe("stage C and D drawings", () => {
  it("give every entry a visual, and key no visual to a missing entry", () => {
    const ids = new Set(entries.map((e) => e.id));
    for (const id of ids) expect(STAGE_CD_VISUALS[id], id).toBeDefined();
    for (const id of Object.keys(STAGE_CD_VISUALS)) expect(ids.has(id), id).toBe(true);
  });

  it("draw a tile for every option of a tiled entry, and no other", () => {
    for (const [id, table] of Object.entries(STAGE_CD_OPTION_TILES)) {
      const beat = mcqs.find((b) => b.id === id);
      expect(beat, id).toBeDefined();
      expect(Object.keys(table).sort(), id).toEqual(beat!.options.map((o) => o.id).sort());
    }
  });

  const figures: { where: string; figure: Figure }[] = [
    ...Object.entries(STAGE_CD_VISUALS).flatMap(([id, v]) =>
      figuresOf(v).map((p) => ({ where: `${id} ${p.where}`, figure: p.figure })),
    ),
    ...Object.entries(STAGE_CD_OPTION_TILES).flatMap(([id, t]) =>
      Object.entries(t).map(([opt, nf]) => ({ where: `${id} tile ${opt}`, figure: nf.figure })),
    ),
  ];

  it("walks something", () => {
    expect(figures.length).toBeGreaterThan(entries.length);
  });

  it("keeps every drawing non-empty and inside the 120 by 84 box", () => {
    for (const { where, figure } of figures) {
      expect((figure.bonds?.length ?? 0) + (figure.labels?.length ?? 0), where).toBeGreaterThan(0);
      for (const b of figure.bonds ?? []) {
        for (const x of [b.x1, b.x2]) expect(x >= 0 && x <= FIGURE_WIDTH, `${where} x ${x}`).toBe(true);
        for (const y of [b.y1, b.y2]) expect(y >= 0 && y <= FIGURE_HEIGHT, `${where} y ${y}`).toBe(true);
        expect(b.x1 === b.x2 && b.y1 === b.y2, `${where} zero-length bond`).toBe(false);
      }
      for (const r of figure.rings ?? []) {
        expect(r.x - r.r >= 0 && r.x + r.r <= FIGURE_WIDTH, where).toBe(true);
        expect(r.y - r.r >= 0 && r.y + r.r <= FIGURE_HEIGHT, where).toBe(true);
      }
    }
  });
});
