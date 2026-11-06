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
  STAGE_AB_WORKED_FIGURES,
} from "../content/u1/stage-ab";
import type { PoolEntry } from "../content/u1/types";
import { U1_POOLS } from "../content/u1";
import { sideQuestProblems } from "../syllabus/syllabusQuizzes";
import { challengePool } from "../beats/practice/pools";
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
// CHANGED 2026-10-17 (U1-P3 round 2): u1-energy-diagram, u1-rank-cation,
// u1-rank-anion, u1-rank-radical and u1-quiz-a each gained one "Draw it" item,
// so every stage A and B node now asks for a drawn structure. Two radical MCQs became ladders and four produce MCQs became
// "Draw it" items, all under their own ids, which changes no size.
const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  // 5 since 24 Oct: u1-allylic-plus-carbon, the one tap before the cation drawing (audit 23 Oct, first-timer #5).
  "u1-allylic": 5,
  "u1-rank-cation": 13,
  "u1-rank-anion": 13,
  // 12 since 3 Nov: u1-rad-vs-cation, the cation and radical rules side by side (Unit 1 review suggestion 4).
  // 13 since 4 Nov: u1-rad-allylic-vs-tbu, the radical half of the side-by-side rule, moved here from
  // u1-quiz-a because the radical branch is optional (owner 24 Oct; checker 4 Nov).
  "u1-rank-radical": 13,
  // 12 since 3 Nov: u1-qa-why-alkyl-counts, the cation half of the side-by-side rule (Unit 1 review suggestion 4).
  "u1-quiz-a": 12,
  "u1-kvt": 6,
  "u1-energy-diagram": 13,
  "u1-12v14": 6,
  "u1-hx-dienes": 13,
  "u1-x2": 13,
  // 12 since 3 Nov: u1-qb-space-cations, stage A spaced into the stage B quiz (Unit 1 review suggestion 11).
  "u1-quiz-b": 12,
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
  // ADDED 3 Nov: the worked-example drawings (lessonExplainers.ts) are held to the same box.
  for (const [key, named] of Object.entries(STAGE_AB_WORKED_FIGURES)) out.push({ where: `worked ${key}`, figure: named.figure });
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

  // ADDED 3 Nov (checker, Unit 1 review suggestion 4): the side-by-side rule is among the problems the
  // radical branch lends u1-quiz-a and the exam, for a student whose syllabus covers radicals. Without that
  // it reaches u1-quiz-a only through Challenge (CHALLENGE_EXTRAS, beats/practice/pools.ts).
  it("lends the cation and radical rules side by side to the stage quiz when the syllabus covers radicals", () => {
    expect(sideQuestProblems(RADICAL_NODE, U1_POOLS).map((entry) => entry.id)).toContain("u1-rad-vs-cation");
    expect(challengePool("u1-quiz-a").map((entry) => entry.id)).toContain("u1-rad-allylic-vs-tbu");
  });

  // CHANGED back 4 Nov (checker): the radical branch is optional (owner 24 Oct), so no stage quiz carries
  // a radical item of its own; u1-rad-allylic-vs-tbu lives in the radical node.
  it("keeps every radical item inside the radical node", () => {
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

describe("owner-directed content (2026-10-17)", () => {
  it("compares but-3-en-2-yl with isopropyl on u1-cat-allyl-vs-2, but-3-en-2-yl the answer, no tie", () => {
    const entry = entries.find(([, e]) => e.id === "u1-cat-allyl-vs-2")?.[1];
    expect(entry?.item.kind).toBe("mcq");
    if (entry?.item.kind !== "mcq") return;
    expect(entry.item.beat.correctOptionId).toBe("crotyl");
    expect(entry.item.beat.options.map((o) => o.id).sort()).toEqual(["crotyl", "ipr", "tie"]);
    expect(entry.placeholder).toBe(true);
    expect(JSON.stringify(STAGE_AB_VISUALS["u1-cat-allyl-vs-2"])).toContain("but-3-en-2-yl cation");
  });

  it("never puts the rank in a ladder card's label (round 2 critic: 3°/2°/1° gave the order away)", () => {
    for (const [, entry] of entries) {
      if (entry.item.kind !== "sort") continue;
      for (const item of entry.item.content.beat.items) {
        expect(item.label, `${entry.id}::${item.id}`).not.toMatch(/°|allylic/);
      }
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

describe("audit 23 Oct fixes (24 Oct)", () => {
  // The rung a run plays an entry at: an MCQ's first graded level, 2 for a ladder (scripts/u1_pools_ab.py play_level).
  const rung = (entry: PoolEntry): number =>
    entry.item.kind === "sort" ? 2 : entry.item.kind === "mcq" ? (entry.item.beat.levels.find((l) => l > 0) ?? entry.item.beat.levels[0]!) : -1;
  const RUNS = ["u1-rank-cation", "u1-rank-anion", "u1-rank-radical", "u1-quiz-a", "u1-energy-diagram", "u1-hx-dienes", "u1-x2", "u1-quiz-b"];

  // CHANGED 3 Nov (Unit 1 review suggestion 8, owner approved): drawings come
  // LAST, after the recognise questions, each opening on its starting material.
  it.each(RUNS)("plays %s easiest first, drawings last on a starting structure (top-25 #12, review 8)", (node) => {
    const pool = STAGE_AB_POOLS[node] ?? [];
    const rungs = pool.filter((entry) => entry.item.kind !== "draw").map(rung);
    expect(rungs, node).toEqual([...rungs].sort((a, b) => a - b));
    const firstDraw = pool.findIndex((entry) => entry.item.kind === "draw");
    expect(firstDraw, node).toBeGreaterThan(0);
    expect(pool.slice(firstDraw).every((entry) => entry.item.kind === "draw"), node).toBe(true);
    for (const entry of pool.slice(firstDraw)) {
      expect(entry.item.kind === "draw" ? entry.item.beat.start : undefined, entry.id).toBeTruthy();
    }
  });

  // u1-hx-too-close and u1-x2-chd-warm left this list 3 Nov: the owner retired
  // "the rule can't call it", so they now ask the reason, in words.
  it.each(["u1-hx-label-thermo", "u1-hx-label-kinetic", "u1-x2-chd-14"])(
    "draws the products of %s as option tiles, not names alone (top-25 #21)",
    (id) => {
      const beat = mcqs.find((one) => one.id === id)!;
      expect(Object.keys(STAGE_AB_OPTION_TILES[id] ?? {}).sort()).toEqual(beat.options.map((option) => option.id).sort());
      expect(STAGE_AB_VISUALS[id]?.kind, id).toBe("scheme");
    },
  );

  it("asks which carbon carries the + before the empty-board cation drawing, and opens that board on the diene (first-timer #5)", () => {
    const ids = (STAGE_AB_POOLS["u1-allylic"] ?? []).map((entry) => entry.id);
    expect(ids.indexOf("u1-allylic-plus-carbon")).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf("u1-allylic-plus-carbon")).toBeLessThan(ids.indexOf("u1-allylic-draw-cation"));
    const tap = mcqs.find((one) => one.id === "u1-allylic-plus-carbon")!;
    expect(tap.levels).toEqual([0]);
    expect(tap.correctOptionId).toBe("c2");
    const draw = (STAGE_AB_POOLS["u1-allylic"] ?? []).find((entry) => entry.id === "u1-allylic-draw-cation")!;
    expect(draw.item.kind === "draw" ? draw.item.beat.start : undefined).toBe("C=CC=C");
    expect(JSON.stringify(draw.item.kind === "draw" ? draw.item.beat.visual : null)).toContain("numbered");
  });
});
