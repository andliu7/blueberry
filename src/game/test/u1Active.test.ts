/**
 * Unit 1's active formats (U1-P3, 2026-10-17): "Draw it" items, pool ladders
 * converted from MCQs, and pool match boards, and the lesson steps that play
 * them.
 *
 * WHAT IS PINNED. The grader's rule (InChI, stereo layers dropped), the shape
 * of every draw item, which lessons now produce something, and where the new
 * kinds sit. WHAT IS NOT: the chemistry. scripts/u1_pools_ab.py and
 * scripts/u1_pools_cd.py derive every answer with RDKit and refuse to write
 * their files on a disagreement; the browser run in the critic's checklist
 * proves a drawing is marked right and wrong in Ketcher itself.
 */
import { describe, expect, it } from "vitest";

import { U1_POOLS } from "../content/u1";
import { planLesson } from "../beats/template";
import { gradeDrawing, withoutStereo } from "../beats/draw/grade";
import { canFail } from "../beats/types";
import type { DrawBeat } from "../beats/draw/types";

const draws: readonly DrawBeat[] = Object.values(U1_POOLS)
  .flat()
  .flatMap((entry) => (entry.item.kind === "draw" ? [entry.item.beat] : []));

function drawFor(id: string): DrawBeat {
  const found = draws.find((beat) => beat.id === id);
  if (found === undefined) throw new Error(`no draw item ${id}`);
  return found;
}

describe("the drawing grader", () => {
  const product = drawFor("u1-12v14-draw-14");

  it("marks the same constitution right whatever geometry the drawn C=C has", () => {
    // A drawn chain always has an E or Z; the answer asks for neither.
    expect(product.answer.inchi).not.toContain("/b");
    expect(gradeDrawing(`${product.answer.inchi}/b3-2+`, product.answer.inchi, false)).toBe("right");
    expect(gradeDrawing(`${product.answer.inchi}/b3-2-`, product.answer.inchi, false)).toBe("right");
  });

  it("marks a different structure wrong", () => {
    const other = drawFor("u1-kvt-draw-warm");
    expect(gradeDrawing(other.answer.inchi, product.answer.inchi, false)).toBe("wrong");
  });

  it("calls an empty canvas empty, never a miss", () => {
    expect(gradeDrawing("", product.answer.inchi, false)).toBe("empty");
    expect(gradeDrawing("   ", product.answer.inchi, false)).toBe("empty");
    // What Indigo returns for an empty Ketcher canvas, seen in the browser run.
    expect(gradeDrawing("InChI=1S//", product.answer.inchi, false)).toBe("empty");
  });

  it("keeps stereo when an item asks for it", () => {
    expect(gradeDrawing(`${product.answer.inchi}/b3-2+`, product.answer.inchi, true)).toBe("wrong");
  });

  it("drops only the stereo layers", () => {
    expect(withoutStereo("InChI=1S/C4H8O/c1-3-4(2)5/h3-5H,1H2,2H3/t4-/m0/s1")).toBe("InChI=1S/C4H8O/c1-3-4(2)5/h3-5H,1H2,2H3");
    expect(withoutStereo("InChI=1S/C4H7/c1-3-4-2/h3-4H,1H2,2H3/q+1")).toBe("InChI=1S/C4H7/c1-3-4-2/h3-4H,1H2,2H3/q+1");
  });
});

describe("every draw item", () => {
  it("exists across both stage files, so this block cannot pass vacuously", () => {
    expect(draws.length).toBeGreaterThanOrEqual(14);
  });

  it("is a draft with a standard InChI, a drawn answer and a failable rung", () => {
    for (const entry of Object.values(U1_POOLS).flat()) {
      if (entry.item.kind !== "draw") continue;
      const beat = entry.item.beat;
      expect(entry.placeholder, entry.id).toBe(true);
      expect(beat.id, entry.id).toBe(entry.id);
      expect(beat.answer.inchi.startsWith("InChI=1S/"), entry.id).toBe(true);
      expect(beat.answer.smiles.length, entry.id).toBeGreaterThan(0);
      expect(beat.answer.figure.bonds?.length ?? 0, entry.id).toBeGreaterThan(0);
      expect(beat.stereo, entry.id).toBe(false);
      expect(beat.levels.length, entry.id).toBeGreaterThan(0);
      for (const level of beat.levels) expect(canFail(level), entry.id).toBe(true);
      for (const text of [beat.prompt, beat.brief ?? "", beat.why, beat.lookAt]) {
        expect(text.includes("?"), `${entry.id}: ${text}`).toBe(false);
        expect(text.includes(String.fromCharCode(0x2014)), `${entry.id}: ${text}`).toBe(false);
      }
      expect(entry.provenance, entry.id).toMatch(/scripts\/u1_pools_(ab|cd)\.py/);
    }
  });
});

describe("every Unit 1 lesson produces something", () => {
  // The lesson nodes (not in-a-row runs) whose produce step now carries a drawing.
  const LESSONS = ["u1-allylic", "u1-12v14", "u1-kvt", "u1-x2", "u1-nbs", "u1-da", "u1-dienes", "u1-dienophiles"];

  it("plays the node's drawings in its produce step, on their own or before the trainer", () => {
    for (const node of LESSONS) {
      const produce = planLesson(node)?.steps.find((step) => step.slot === "produce");
      expect(produce, node).toBeDefined();
      const beat = produce!.beat;
      const draws = beat.kind === "draw" ? beat.node : beat.kind === "mechanism" || beat.kind === "resonance" ? beat.draws : undefined;
      expect(draws, node).toBe(node);
    }
  });

  it("puts a drawing third in each in-a-row run that has one, so the first tier reaches it", () => {
    for (const node of ["u1-hx-dienes", "u1-quiz-b", "u1-nbs-practice", "u1-quiz-c", "u1-da-predict", "u1-quiz-d"]) {
      expect(U1_POOLS[node]?.[2]?.item.kind, node).toBe("draw");
    }
  });
});

describe("the converted and added active kinds", () => {
  it("keeps the converted MCQs' ids, now as ladders", () => {
    for (const id of ["u1-cat-middle-methyl", "u1-ani-ring"]) {
      const entry = Object.values(U1_POOLS).flat().find((item) => item.id === id);
      expect(entry?.item.kind, id).toBe("sort");
    }
  });

  it("plays the pool match boards in the dienes and dienophiles lessons", () => {
    for (const [node, board] of [
      ["u1-dienes", "u1-cd-dienes-shape-match"],
      ["u1-dienophiles", "u1-cd-phile-match"],
    ] as const) {
      expect((U1_POOLS[node] ?? []).some((entry) => entry.id === board && entry.item.kind === "match"), node).toBe(true);
      expect(planLesson(node)?.steps.map((step) => step.beat.kind), node).toEqual(["mcq", "poolMatch", "draw"]);
    }
  });
});
