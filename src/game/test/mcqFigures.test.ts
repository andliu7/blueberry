/**
 * EVERY MCQ BEAT CARRIES A VISUAL.
 *
 * Owner ruling 1 of 2026-09-04: "a question that is only prose has already
 * lost the student", and it names every beat type rather than only the
 * curriculum player's. `src/beats/mcq/mcqFigures.ts` is the authored table
 * that makes it true for the beat runner, and the same discipline
 * `test/lessonFigures.test.ts` set applies here: the check walks the REAL
 * beat list, never the table's own key list, because a table proving itself
 * against itself would pass forever while a newly authored question shipped
 * as a wall of text.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not assert the chemistry. No
 * check here can tell 4-nitrophenol from 3-nitrophenol, and one that
 * pretended to would teach a reviewer to stop reading. The chemistry in that
 * file is authored and reviewed by a person, exactly as packages/feedback's
 * copy is. What is mechanised is COVERAGE (every beat has a visual), KEYING
 * (no visual is authored against a beat id that does not exist, which is what
 * catches a rename), and the drawing INVARIANTS that would silently produce a
 * broken picture.
 */

import { describe, expect, it } from "vitest";

import { MCQ_BEATS } from "../beats/mcq/content";
import {
  figuresOf,
  mcqOptionTileKeys,
  mcqOptionTiles,
  mcqVisualFor,
  mcqVisualKeys,
} from "../beats/mcq/mcqFigures";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

describe("the MCQ beats", () => {
  it("are not empty, so an empty pass cannot be mistaken for coverage", () => {
    expect(MCQ_BEATS.length).toBeGreaterThan(0);
  });

  it("give every question a drawn visual", () => {
    for (const beat of MCQ_BEATS) {
      expect(
        mcqVisualFor(beat.id),
        `${beat.id} has no visual, so it would reach a student as prose`,
      ).not.toBeNull();
    }
  });
});

describe("the visual table stays keyed to the beats", () => {
  const ids = new Set(MCQ_BEATS.map((beat) => beat.id));

  it("authors no visual against a beat id that does not exist", () => {
    for (const key of mcqVisualKeys()) {
      expect(ids.has(key), `${key} is not an MCQ beat id`).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Drawing invariants                                                   */
/* ------------------------------------------------------------------ */

function everyFigure(): readonly { readonly where: string; readonly figure: Figure }[] {
  const out: { where: string; figure: Figure }[] = [];
  for (const key of mcqVisualKeys()) {
    const visual = mcqVisualFor(key);
    if (visual === null) continue;
    for (const part of figuresOf(visual)) out.push({ where: `${key} ${part.where}`, figure: part.figure });
  }
  return out;
}

describe("every drawing is inside its box and is actually a drawing", () => {
  it("walks something, so a broken flattener cannot make this suite vacuous", () => {
    expect(everyFigure().length).toBeGreaterThanOrEqual(MCQ_BEATS.length);
  });

  it("draws something in every figure", () => {
    for (const { where, figure } of everyFigure()) {
      const marks = (figure.bonds?.length ?? 0) + (figure.labels?.length ?? 0);
      expect(marks, `${where} is an empty figure`).toBeGreaterThan(0);
    }
  });

  /**
   * The viewBox is 120 by 84 and `StructureFigure` uses `meet`, so a bond
   * outside it is not clipped: it silently shrinks EVERY OTHER figure on the
   * screen to fit, which is how one stray coordinate makes a whole scheme
   * look wrong. Labels are allowed a margin, whose glyph box the renderer
   * places around its anchor rather than inside these bounds.
   */
  it("keeps every bond endpoint inside the viewBox", () => {
    for (const { where, figure } of everyFigure()) {
      for (const bond of figure.bonds ?? []) {
        for (const [axis, value, limit] of [
          ["x1", bond.x1, FIGURE_WIDTH],
          ["x2", bond.x2, FIGURE_WIDTH],
          ["y1", bond.y1, FIGURE_HEIGHT],
          ["y2", bond.y2, FIGURE_HEIGHT],
        ] as const) {
          expect(value, `${where} ${axis}`).toBeGreaterThanOrEqual(0);
          expect(value, `${where} ${axis}`).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  it("keeps every dashed marker ring inside the viewBox", () => {
    for (const { where, figure } of everyFigure()) {
      for (const marker of figure.rings ?? []) {
        expect(marker.x - marker.r, where).toBeGreaterThanOrEqual(0);
        expect(marker.x + marker.r, where).toBeLessThanOrEqual(FIGURE_WIDTH);
        expect(marker.y - marker.r, where).toBeGreaterThanOrEqual(0);
        expect(marker.y + marker.r, where).toBeLessThanOrEqual(FIGURE_HEIGHT);
      }
    }
  });

  it("draws no zero length bond, which renders as nothing at all", () => {
    for (const { where, figure } of everyFigure()) {
      for (const bond of figure.bonds ?? []) {
        expect(Math.hypot(bond.x2 - bond.x1, bond.y2 - bond.y1), where).toBeGreaterThan(1);
      }
    }
  });

  /**
   * A bond drawn twice between the same two points is the failure mode
   * lessonFigures.ts's ring helper names: a double bond laid over a single
   * one is three lines, which reads as a triple bond. Direction is normalised
   * because a bond drawn back to front is the same two lines.
   */
  it("draws no bond twice over the same two points", () => {
    for (const { where, figure } of everyFigure()) {
      const seen = new Set<string>();
      for (const bond of figure.bonds ?? []) {
        const ends = [`${bond.x1},${bond.y1}`, `${bond.x2},${bond.y2}`].sort().join("-");
        expect(seen.has(ends), `${where} draws ${ends} twice`).toBe(false);
        seen.add(ends);
      }
    }
  });
});

describe("a scheme says something", () => {
  /**
   * The one invariant this file's schemes DO share with the curriculum's: a
   * scheme that states neither its reagents nor its product is a left hand
   * side and an arrow into nothing, which draws a question the student cannot
   * read. Stating BOTH is allowed here and is not there, and mcqFigures.ts's
   * header records why: an MCQ's question is often downstream of the
   * transformation rather than being it.
   */
  it("names its reagents, its product, or both", () => {
    for (const key of mcqVisualKeys()) {
      const visual = mcqVisualFor(key);
      if (visual === null || visual.kind !== "scheme") continue;
      const stated = visual.scheme.over !== undefined || visual.scheme.right !== undefined;
      expect(stated, `${key} draws an arrow into nothing`).toBe(true);
    }
  });
});

describe("a caption is a label on the thing", () => {
  /**
   * Ruling 2: the structure is drawn and the name sits under it. A visual
   * with no caption anywhere is a picture the student cannot connect to the
   * words of the question, so every shape carries at least one name. The
   * SCHEME is the exception the rule allows for: a fully drawn transformation
   * with conditions over its arrow is already labelled by the conditions.
   */
  it("captions every structure and every pair", () => {
    for (const key of mcqVisualKeys()) {
      const visual = mcqVisualFor(key);
      if (visual === null) continue;
      if (visual.kind === "structure") {
        expect(visual.name, `${key} draws a molecule with no name under it`).toBeDefined();
      }
      if (visual.kind === "pair") {
        expect(visual.a.name, `${key} left half has no name`).toBeDefined();
        expect(visual.b.name, `${key} right half has no name`).toBeDefined();
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* The drawn option tiles                                               */
/*                                                                      */
/* "OPTION CARDS ARE PICTURES WITH CAPTIONS, not captions with          */
/* pictures", owner ruling 2 of 2026-09-04, drawn by                    */
/* blueberry_r9-lesson-reaction as a 2 by 2 of structures with short    */
/* names under them. The table is deliberately partial: a question      */
/* whose options are RULES keeps its word rows, because a rule is not a */
/* molecule. What these tests hold is that the partial table is never   */
/* HALF applied, since a comparison set where one tile is a drawing and */
/* the next is a sentence is not a comparison.                          */
/* ------------------------------------------------------------------ */

describe("the option tile table", () => {
  const byId = new Map(MCQ_BEATS.map((beat) => [beat.id, beat]));

  it("draws tiles for at least one beat, so this suite cannot pass vacuously", () => {
    expect(mcqOptionTileKeys().length).toBeGreaterThan(0);
  });

  it("names no beat that does not exist", () => {
    for (const [beatId] of mcqOptionTileKeys()) {
      expect(byId.has(beatId), `${beatId} is not an MCQ beat id`).toBe(true);
    }
  });

  it("names no option the beat does not carry", () => {
    for (const [beatId, optionIds] of mcqOptionTileKeys()) {
      const beat = byId.get(beatId);
      if (beat === undefined) continue;
      const known = new Set(beat.options.map((option) => option.id));
      for (const optionId of optionIds) {
        expect(known.has(optionId), `${beatId} has no option ${optionId}`).toBe(true);
      }
    }
  });

  it("covers every option of every beat it draws at all", () => {
    for (const [beatId] of mcqOptionTileKeys()) {
      const beat = byId.get(beatId);
      if (beat === undefined) continue;
      expect(
        mcqOptionTiles(beatId, beat.options.map((option) => option.id)),
        `${beatId} draws some of its options and not others`,
      ).not.toBeNull();
    }
  });

  it("captions every tile, because the name is the label on the picture", () => {
    for (const [beatId] of mcqOptionTileKeys()) {
      const beat = byId.get(beatId);
      if (beat === undefined) continue;
      const tiles = mcqOptionTiles(beatId, beat.options.map((option) => option.id));
      for (const option of beat.options) {
        expect(tiles?.[option.id]?.name, `${beatId}::${option.id}`).toBeDefined();
      }
    }
  });

  it("keeps every tile drawing inside the viewBox", () => {
    for (const [beatId] of mcqOptionTileKeys()) {
      const beat = byId.get(beatId);
      if (beat === undefined) continue;
      const tiles = mcqOptionTiles(beatId, beat.options.map((option) => option.id));
      for (const option of beat.options) {
        const figure = tiles?.[option.id]?.figure;
        const where = `${beatId}::${option.id}`;
        expect(figure, where).toBeDefined();
        for (const bond of figure?.bonds ?? []) {
          for (const [axis, value, limit] of [
            ["x1", bond.x1, FIGURE_WIDTH],
            ["y1", bond.y1, FIGURE_HEIGHT],
            ["x2", bond.x2, FIGURE_WIDTH],
            ["y2", bond.y2, FIGURE_HEIGHT],
          ] as const) {
            expect(value, `${where} ${axis}`).toBeGreaterThanOrEqual(0);
            expect(value, `${where} ${axis}`).toBeLessThanOrEqual(limit);
          }
        }
        for (const marker of figure?.rings ?? []) {
          expect(marker.x - marker.r, where).toBeGreaterThanOrEqual(0);
          expect(marker.x + marker.r, where).toBeLessThanOrEqual(FIGURE_WIDTH);
          expect(marker.y - marker.r, where).toBeGreaterThanOrEqual(0);
          expect(marker.y + marker.r, where).toBeLessThanOrEqual(FIGURE_HEIGHT);
        }
      }
    }
  });

  it("draws a DIFFERENT picture for every option of a beat", () => {
    // A tile set is a comparison. Two options drawn identically would be two
    // answers a student cannot tell apart, which is worse than no picture,
    // and it is the exact failure mode of building a set from one helper.
    for (const [beatId] of mcqOptionTileKeys()) {
      const beat = byId.get(beatId);
      if (beat === undefined) continue;
      const tiles = mcqOptionTiles(beatId, beat.options.map((option) => option.id));
      const drawn = beat.options.map((option) => JSON.stringify(tiles?.[option.id]?.figure));
      expect(new Set(drawn).size, `${beatId} draws two options the same`).toBe(drawn.length);
    }
  });

  it("returns null rather than a partial set for a beat it does not draw", () => {
    const undrawn = MCQ_BEATS.find(
      (beat) => !mcqOptionTileKeys().some(([id]) => id === beat.id),
    );
    expect(undrawn, "every beat is drawn, so this check has nothing to prove").toBeDefined();
    expect(
      mcqOptionTiles(undrawn?.id ?? "", (undrawn?.options ?? []).map((option) => option.id)),
    ).toBeNull();
  });
});
