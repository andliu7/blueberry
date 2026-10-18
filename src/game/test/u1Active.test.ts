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
import { gradeDrawing, hintFor, namedMiss, relativeStereo, withoutStereo } from "../beats/draw/grade";
import { messageForMiss } from "../beats/match/reasons";
import { promptIdFor, targetIdFor } from "../beats/match/spec";
import { recipeSegments, recyclePoolEntriesFor, reportStep, startRun } from "../beats/template";
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

  it("grades a wedge item on relative stereo: either mirror image right, the diastereomer wrong", () => {
    const cis = drawFor("u1-cd-st-draw-maleate");
    const trans = drawFor("u1-cd-3d-draw-fumarate");
    expect(cis.stereo && trans.stereo).toBe(true);
    // The other enantiomer of the trans diester differs only in /m.
    const mirror = trans.answer.inchi.includes("/m1")
      ? trans.answer.inchi.replace("/m1", "/m0")
      : trans.answer.inchi.replace("/m0", "/m1");
    expect(mirror).not.toBe(trans.answer.inchi);
    expect(gradeDrawing(mirror, trans.answer.inchi, true)).toBe("right");
    expect(gradeDrawing(cis.answer.inchi, trans.answer.inchi, true)).toBe("wrong");
    expect(gradeDrawing(withoutStereo(cis.answer.inchi), cis.answer.inchi, true)).toBe("wrong");
    expect(relativeStereo("InChI=1S/X/c1/t1-/m0/s1")).toBe("InChI=1S/X/c1/t1-");
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
      // Only the two Diels-Alder wedge items grade stereo, and their answers carry stereocentres.
      const wedged = entry.id === "u1-cd-st-draw-maleate" || entry.id === "u1-cd-3d-draw-fumarate";
      expect(beat.stereo, entry.id).toBe(wedged);
      if (wedged) expect(beat.answer.smiles, entry.id).toContain("@");
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

describe("a wrong drawing is named, not just marked wrong (round 2)", () => {
  it("gives every draw item at least one named miss, each graded wrong and found by namedMiss", () => {
    for (const beat of draws) {
      expect(beat.misses?.length ?? 0, beat.id).toBeGreaterThan(0);
      for (const miss of beat.misses ?? []) {
        expect(gradeDrawing(miss.inchi, beat.answer.inchi, beat.stereo), `${beat.id} ${miss.id}`).toBe("wrong");
        expect(namedMiss(miss.inchi, beat.misses, beat.stereo)?.id, `${beat.id} ${miss.id}`).toBe(miss.id);
        expect(miss.says.includes("?") || miss.says.includes(String.fromCharCode(0x2014)), miss.says).toBe(false);
      }
    }
  });

  it("names the 1,2 product on the 1,4 and the warm items, and the meta isomer on the para item", () => {
    const expected: readonly (readonly [string, string])[] = [
      ["u1-12v14-draw-14", "the 1,2 product"],
      ["u1-kvt-draw-warm", "the 1,2 product, the kinetic one"],
      ["u1-x2-draw-warm", "the 1,2 product"],
      ["u1-cd-pred-draw-para", "the meta product"],
      ["u1-cd-nbs-draw-cyclohexene", "a Br on the C=C"],
    ];
    for (const [id, name] of expected) {
      expect(drawFor(id).misses?.map((miss) => miss.name), id).toContain(name);
    }
  });

  it("matches a named miss whatever geometry the student's C=C has", () => {
    const beat = drawFor("u1-12v14-draw-14");
    const p12 = beat.misses!.find((miss) => miss.name === "the 1,2 product")!;
    expect(namedMiss(`${p12.inchi}/b4-3+`, beat.misses, false)?.id).toBe(p12.id);
  });

  it("keeps the deciding rule out of the brief, which shows before the student draws", () => {
    // The critic's three: the regiochemistry, the 1,4 placement, the temperature call.
    expect(drawFor("u1-cd-pred-draw-para").brief).not.toMatch(/para|1,4/);
    expect(drawFor("u1-12v14-draw-14").brief).not.toMatch(/Br on C4|H on C1/);
    expect(drawFor("u1-kvt-draw-warm").brief).not.toMatch(/stable|groups on/);
    for (const beat of draws) {
      expect(beat.brief ?? "", beat.id).not.toContain(beat.answer.name);
    }
  });

  it("no longer tells the retro item to cut the bonds across from the ring C=C", () => {
    const beat = drawFor("u1-cd-pred-draw-diene");
    expect(`${beat.brief ?? ""} ${beat.why}`).not.toMatch(/across (from|the ring from) it/);
  });
});

describe("a missed drawing comes back in the lesson's recycle pass (round 2)", () => {
  it("queues the missed drawing and plays it from the lesson's own pool", () => {
    const plan = planLesson("u1-kvt")!;
    let run = startRun(plan);
    for (const step of plan.steps) {
      run = reportStep(
        run,
        step.beat.kind === "draw"
          ? { cleared: 0, total: 1, missedPoolIds: ["u1-kvt-draw-warm"] }
          : { cleared: 1, total: 1 },
      );
    }
    expect(run.phase).toBe("recycle");
    expect(recipeSegments(run).some((segment) => segment.slot === "recycle")).toBe(true);
    expect(recyclePoolEntriesFor(plan, run.missedPoolIds ?? []).map((entry) => entry.id)).toEqual(["u1-kvt-draw-warm"]);
  });

  it("finds a trainer step's drawings too", () => {
    const plan = planLesson("u1-12v14")!;
    expect(recyclePoolEntriesFor(plan, ["u1-12v14-draw-14"]).map((entry) => entry.id)).toEqual(["u1-12v14-draw-14"]);
  });
});

describe("every Unit 1 lesson produces something", () => {
  it("has a drawing on every Unit 1 pool node (round 2: seven nodes had none)", () => {
    for (const [node, entries] of Object.entries(U1_POOLS)) {
      expect(entries.some((entry) => entry.item.kind === "draw"), node).toBe(true);
    }
  });

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
    for (const id of ["u1-cat-middle-methyl", "u1-ani-ring", "u1-rad-alkyl", "u1-rad-ring"]) {
      const entry = Object.values(U1_POOLS).flat().find((item) => item.id === id);
      expect(entry?.item.kind, id).toBe("sort");
    }
  });

  it("keeps the converted produce MCQs' ids, now as drawings that name each old option", () => {
    for (const id of ["u1-hx-dmb-cold", "u1-hx-hexadiene-cold", "u1-hx-mp4-warm", "u1-x2-dmb-cold"]) {
      const entry = Object.values(U1_POOLS).flat().find((item) => item.id === id);
      expect(entry?.item.kind, id).toBe("draw");
      if (entry?.item.kind === "draw") expect(entry.item.beat.misses?.length, id).toBe(2);
    }
  });

  it("draws every molecule on the match boards and hides the reason from the right-hand cards", () => {
    for (const id of ["u1-cd-dienes-shape-match", "u1-cd-phile-match"]) {
      const entry = Object.values(U1_POOLS).flat().find((item) => item.id === id);
      expect(entry?.item.kind, id).toBe("match");
      if (entry?.item.kind !== "match") continue;
      const board = entry.item.board;
      for (const prompt of board.answer.prompts) {
        expect(board.figureByPrompt?.[prompt.id]?.bonds?.length ?? 0, `${id} ${prompt.id}`).toBeGreaterThan(0);
        expect(board.hintByPrompt?.[prompt.id], `${id} ${prompt.id}`).toBeDefined();
      }
    }
    const phile = Object.values(U1_POOLS).flat().find((item) => item.id === "u1-cd-phile-match");
    expect(phile?.item.kind).toBe("match");
    if (phile?.item.kind === "match") {
      // Round 3: a real pairing (drawn product to the diene + dienophile that
      // made it), not rank slots dressed as a match.
      for (const target of phile.item.board.answer.targets) {
        expect(target.text, target.id).toMatch(/^[A-Z][\w,-]* ?\w* \+ /);
        expect(target.text, target.id).not.toMatch(/Fastest|Second|Third|Slowest|LUMO/);
      }
      // The left card's label names nothing; only its drawing says what it is.
      for (const prompt of phile.item.board.answer.prompts) {
        expect(prompt.text, prompt.id).toMatch(/^Product [A-D]$/);
      }
      // The lesson's draw item asks for the butadiene + acrylonitrile product,
      // so the board must not show it first.
      expect(phile.item.board.answer.targets.some((t) => /acrylonitrile/i.test(t.text))).toBe(false);
      // A wrong pairing says chemistry about the left card, not "has its own row".
      const miss = messageForMiss(phile.item.board, promptIdFor("dmb_eth"), targetIdFor("bd_eth"), 0);
      expect(miss.detail).toContain("two methyls");
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

describe("the hint after an unnamed first miss (round 3)", () => {
  // InChIs from RDKit: 3-bromobut-1-ene, 1-bromobut-2-ene, buta-1,3-diene, but-2-ene, the 2° allylic cation.
  const bromide12 = "InChI=1S/C4H7Br/c1-3-4(2)5/h3-4H,1H2,2H3";
  const bromide14 = "InChI=1S/C4H7Br/c1-2-3-4-5/h2-3H,4H2,1H3";
  const diene = "InChI=1S/C4H6/c1-3-4-2/h3-4H,1-2H2";
  const butene = "InChI=1S/C4H8/c1-3-4-2/h3-4H,1-2H3";
  const cation = "InChI=1S/C4H7/c1-3-4-2/h3-4H,1H2,2H3/q+1";

  it("says what is off, never where the atoms go", () => {
    expect(hintFor(diene, bromide14)).toContain("bromine atoms: the answer has 1, yours has 0");
    expect(hintFor(butene, cation)).toContain("a + charge");
    expect(hintFor(bromide12, bromide14)).toContain("joined differently");
    expect(hintFor(`${diene}.${diene}`.replace("InChI=1S/C4H6/", "InChI=1S/2C4H6/"), diene)).toContain("separate pieces");
  });

  it("is not the item's lookAt, which only shows with the answer", () => {
    for (const beat of draws) {
      const hint = hintFor(beat.misses?.[0]?.inchi ?? "", beat.answer.inchi);
      expect(hint, beat.id).not.toBe(beat.lookAt);
    }
  });
});

describe("round 4: the reveal and the drawing can not be copied", () => {
  it("gives every named miss the canonical SMILES the reveal draws 'Yours' from", () => {
    // Drawn from the student's own atom order, a card could come out mirrored
    // beside the answer (round 3 critic, u1-nbs). A named miss is redrawn
    // from this instead, the same way as the answer.
    for (const beat of draws) {
      for (const miss of beat.misses ?? []) {
        expect(miss.smiles ?? "", `${beat.id} ${miss.id}`).not.toBe("");
        expect(miss.smiles, `${beat.id} ${miss.id}`).not.toBe(beat.answer.smiles);
      }
    }
  });

  it("asks the 1,4 drawing on a diene the lesson never names, with no placement in the prompt", () => {
    // The priming question names 1-bromobut-2-ene as butadiene's 1,4 product,
    // so the drawing moved to hexa-2,4-diene: transfer, not recall.
    const beat = drawFor("u1-12v14-draw-14");
    expect(beat.prompt).toContain("hexa-2,4-diene");
    expect(beat.prompt).not.toMatch(/C4|attacks/);
    const others = (U1_POOLS["u1-12v14"] ?? []).filter((entry) => entry.id !== beat.id);
    for (const entry of others) {
      expect(JSON.stringify(entry), entry.id).not.toContain(beat.answer.name);
    }
  });

  it("names a Br drawn too far from the C=C on both ring NBS items", () => {
    for (const id of ["u1-cd-nbs-draw-cyclohexene", "u1-cd-nbs-draw-cyclopentene"]) {
      expect(drawFor(id).misses?.map((miss) => miss.name), id).toContain("a Br too far from the C=C");
    }
  });

  it("never tells a student to number atoms the screen does not show", () => {
    for (const beat of draws) expect(`${beat.prompt} ${beat.brief ?? ""}`, beat.id).not.toMatch(/Number the/);
  });
});
