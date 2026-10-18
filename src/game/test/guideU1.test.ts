/**
 * Unit 1's guidebook (src/game/guide), pinned.
 *
 * 1. Coverage: every Unit 1 lesson has exactly one guide section, with a
 *    drawn example; every stage quiz is a stage checkpoint; nothing else.
 * 2. No new chemistry: every idea quotes, word for word, a question in its
 *    own lesson; every mistake and example caption quotes a Unit 1 question.
 * 3. Every structure parses in RDKit, and the drawings file is exactly what
 *    scripts/guide_u1.py derives (a hand edit, or a pool answer that moved,
 *    fails here).
 * 4. It renders: each stage folds, the current stage starts open, an open
 *    lesson has a START key and a shut one says why. Each lesson shows one
 *    key idea with its marked words, and the stage counts add up to the
 *    path's own unit count.
 * 5. Owner 2026-10-17: the guide never teaches the contested 1° allylic vs
 *    2° alkyl ranking (u1-cat-allyl-vs-2, and the line in u1-cat-tbu-vs-allyl
 *    that says the same).
 * Everything stays a draft.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { primingSources, quotableText } from "../beats/priming";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { unitGuideFor } from "../guide";
import { openingStage, stageCount, UnitGuidePage } from "../guide/UnitGuide";
import type { LessonDoor } from "../guide/types";
import { U1_GUIDE } from "../guide/u1Guide";

const ROOT = resolve(__dirname, "../../..");
const U1 = PATHWAY_UNITS.find((unit) => unit.id === "u1")!;
const LESSONS = U1.nodes.filter((node) => node.playable !== undefined && node.role !== "quiz" && !node.mentionOnly);
const QUIZZES = U1.nodes.filter((node) => node.role === "quiz");
const GUIDE_LESSONS = U1_GUIDE.stages.flatMap((stage) => stage.lessons);
const ALL_U1 = [...U1.nodes.map((node) => node.id), "u1-exam"];

/** Whether `quote` is word for word in what `source`, a question in `node`, says. */
function quotedIn(node: string, source: string, quote: string): boolean {
  const found = primingSources(node).get(source);
  return found !== undefined && quotableText(found).includes(quote);
}
function quotedAnywhere(source: string, quote: string): boolean {
  return ALL_U1.some((node) => quotedIn(node, source, quote));
}

describe("Unit 1 guidebook coverage", () => {
  it("is the guide the pathway opens for Unit 1", () => {
    expect(unitGuideFor("u1")).toBe(U1_GUIDE);
    expect(unitGuideFor("u9")).toBeNull();
  });

  it("has one section per Unit 1 lesson, and no stray ones", () => {
    expect(LESSONS.length).toBeGreaterThan(0);
    const ids = GUIDE_LESSONS.map((lesson) => lesson.node);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(LESSONS.map((node) => node.id).sort());
  });

  it("makes every stage quiz a stage checkpoint", () => {
    const checkpoints = U1_GUIDE.stages.map((stage) => stage.checkpoint).filter((id) => id !== null);
    expect([...checkpoints].sort()).toEqual(QUIZZES.map((node) => node.id).sort());
  });

  it("draws an example for every lesson, and nothing for a node that is not one", () => {
    for (const lesson of GUIDE_LESSONS) {
      const example = U1_GUIDE.examples[lesson.node];
      expect(example, lesson.node).toBeDefined();
      expect(example!.panels.length, lesson.node).toBeGreaterThan(0);
    }
    expect(Object.keys(U1_GUIDE.examples).sort()).toEqual(GUIDE_LESSONS.map((lesson) => lesson.node).sort());
  });

  it("gives every lesson ideas and every stage mistakes, each with a fix", () => {
    for (const lesson of GUIDE_LESSONS) expect(lesson.ideas.length, lesson.node).toBeGreaterThanOrEqual(2);
    for (const stage of U1_GUIDE.stages) {
      expect(stage.mistakes.length, stage.id).toBeGreaterThanOrEqual(3);
      for (const item of stage.mistakes) expect(item.fix.length, item.mistake).toBeGreaterThan(0);
    }
  });
});

describe("the guide says nothing the questions do not", () => {
  it("quotes every idea from a question in its own lesson", () => {
    for (const lesson of GUIDE_LESSONS) {
      for (const idea of lesson.ideas) {
        expect(quotedIn(lesson.node, idea.source, idea.quote), `${lesson.node} / ${idea.source}: ${idea.quote}`).toBe(true);
      }
    }
  });

  it("quotes every mistake and every example caption from a Unit 1 question", () => {
    for (const stage of U1_GUIDE.stages) {
      for (const item of stage.mistakes) expect(quotedAnywhere(item.source, item.quote), `${item.source}: ${item.quote}`).toBe(true);
    }
    for (const lesson of GUIDE_LESSONS) {
      expect(quotedAnywhere(lesson.example.source, lesson.example.quote), `${lesson.node}: ${lesson.example.quote}`).toBe(true);
    }
  });

  it("marks words that are really in each key idea, and gives every lesson one", () => {
    for (const lesson of GUIDE_LESSONS) {
      const key = lesson.ideas[0]!;
      expect(key.mark, lesson.node).toBeDefined();
      expect(key.text, lesson.node).toContain(key.mark);
    }
  });

  it("never draws or teaches the contested 1° allylic vs 2° alkyl ranking (owner, 2026-10-17)", () => {
    const sources = [
      ...GUIDE_LESSONS.flatMap((lesson) => [...lesson.ideas.map((idea) => idea.source), lesson.example.source]),
      ...U1_GUIDE.stages.flatMap((stage) => stage.mistakes.map((item) => item.source)),
    ];
    expect(sources).not.toContain("u1-cat-allyl-vs-2");
    expect(sources).not.toContain("u1-cat-tbu-vs-allyl");
    const words = JSON.stringify(U1_GUIDE);
    expect(words).not.toMatch(/1° allylic[^"]*(near|about as stable|about the same)/);
  });

  it("keeps everything a draft and free of em dashes", () => {
    expect(U1_GUIDE.placeholder).toBe(true);
    for (const example of Object.values(U1_GUIDE.examples)) expect(example.placeholder).toBe(true);
    expect(JSON.stringify(U1_GUIDE)).not.toContain("\u2014");
  });
});

describe("every structure comes from RDKit", () => {
  const smiles = Object.values(U1_GUIDE.examples).flatMap((example) =>
    example.panels.flatMap((panel) => (panel.kind === "mol" ? [panel.smiles] : [])),
  );

  it("draws at least one structure per lesson that has one, each with bonds or a label", () => {
    expect(smiles.length).toBeGreaterThan(20);
    for (const example of Object.values(U1_GUIDE.examples)) {
      for (const panel of example.panels) {
        if (panel.kind !== "mol") continue;
        const ink = (panel.figure.bonds?.length ?? 0) + (panel.figure.labels?.length ?? 0);
        expect(ink, panel.smiles).toBeGreaterThan(0);
      }
    }
  });

  it("parses every SMILES in RDKit", () => {
    const run = spawnSync(
      "python",
      [
        "-c",
        "import sys, json\nfrom rdkit import Chem\nbad=[s for s in json.load(sys.stdin) if Chem.MolFromSmiles(s) is None]\nprint(json.dumps(bad))",
      ],
      { input: JSON.stringify(smiles), encoding: "utf8", timeout: 60_000 },
    );
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual([]);
  });

  // Round 3: a + or minus drawn across a bond read as the wrong sign on a phone.
  it("draws every charge and radical sign clear of every bond, with a halo on its carbon", () => {
    const toSegment = (px: number, py: number, b: { x1: number; y1: number; x2: number; y2: number }) => {
      const dx = b.x2 - b.x1;
      const dy = b.y2 - b.y1;
      const t = Math.max(0, Math.min(1, ((px - b.x1) * dx + (py - b.y1) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(px - (b.x1 + dx * t), py - (b.y1 + dy * t));
    };
    let signs = 0;
    for (const example of Object.values(U1_GUIDE.examples)) {
      for (const panel of example.panels) {
        if (panel.kind !== "mol") continue;
        const fig = panel.figure;
        expect(fig.signs?.length ?? 0, panel.smiles).toBe(fig.halos?.length ?? 0);
        for (const sign of fig.signs ?? []) {
          signs++;
          for (const bond of fig.bonds) expect(toSegment(sign.x, sign.y, bond), panel.smiles).toBeGreaterThanOrEqual(8);
        }
      }
    }
    expect(signs).toBeGreaterThanOrEqual(10);
  });

  // Round 4: a radical dot 15 units out read as a stray speck past the bond end.
  it("puts every radical dot right on its carbon, inside that carbon's tint", () => {
    let dots = 0;
    for (const example of Object.values(U1_GUIDE.examples)) {
      for (const panel of example.panels) {
        if (panel.kind !== "mol") continue;
        (panel.figure.signs ?? []).forEach((sign, at) => {
          if (sign.t !== "•") return;
          dots++;
          const carbon = panel.figure.halos![at]!;
          expect(Math.hypot(sign.x - carbon.x, sign.y - carbon.y), panel.smiles).toBeLessThanOrEqual(11);
        });
      }
    }
    expect(dots).toBeGreaterThanOrEqual(2);
  });

  it("labels the two sides of a stability comparison the same way, and names the butadiene a reaction starts from", () => {
    const names = (node: string) =>
      U1_GUIDE.examples[node]!.panels.flatMap((panel) => (panel.kind === "mol" ? [panel.name ?? ""] : []));
    expect(names("u1-rank-anion")).toEqual(["Methyl", "3° alkyl"]);
    expect(names("u1-rank-cation")[1]).toBe("3° alkyl");
    expect(names("u1-rank-radical")[1]).toBe("3° alkyl");
    for (const node of ["u1-kvt", "u1-x2"]) expect(names(node)[0], node).toBe("Butadiene");
  });

  it("draws the methyl anion as a structure with bonds, not a bare formula", () => {
    const methyl = U1_GUIDE.examples["u1-rank-anion"]!.panels.find((panel) => panel.kind === "mol" && panel.smiles === "[CH3-]");
    expect(methyl?.kind === "mol" ? methyl.figure.bonds.length : 0).toBe(3);
  });

  it("writes methyl esters as one CO2CH3 label, so the stereo wedges stay readable", () => {
    for (const node of ["u1-da-stereo", "u1-da-3d"]) {
      const product = U1_GUIDE.examples[node]!.panels.filter((panel) => panel.kind === "mol").at(-1)!;
      const labels = product.kind === "mol" ? (product.figure.labels ?? []).map((label) => label.t) : [];
      expect(labels.filter((t) => t === "CO_2CH_3" || t === "CH_3O_2C").length, node).toBe(2);
      expect(labels, node).not.toContain("O");
    }
  });

  it("matches what scripts/guide_u1.py derives, byte for byte", () => {
    const run = spawnSync("python", ["scripts/guide_u1.py", "--check"], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
  });
});

describe("the guidebook page", () => {
  const gate = (id: string) => ({ id, kind: "concept" as const, title: id, href: `#/app/lesson/${id}` });
  const doorsWith = (current: string): ReadonlyMap<string, LessonDoor> => {
    const doors = new Map<string, LessonDoor>();
    let before = true;
    for (const node of U1.nodes) {
      if (node.playable === undefined) continue;
      const state = node.id === current ? "current" : before ? "done" : "locked";
      if (node.id === current) before = false;
      doors.set(node.id, {
        title: node.title,
        state,
        gate: state === "locked" ? null : gate(node.id),
        note: state === "locked" ? `Opens after you clear ${current}` : null,
        sideQuest: node.kind === "branch",
      });
    }
    return doors;
  };
  const render = (current: string) =>
    renderToStaticMarkup(
      createElement(UnitGuidePage, {
        guide: U1_GUIDE,
        unitLabel: "Unit 1",
        unitName: "Conjugation, Resonance & Dienes",
        doors: doorsWith(current),
        progress: { done: 0, total: 18 },
        onStart: () => {},
        onClose: () => {},
        covered: false,
        reducedMotion: true,
      }),
    );

  it("gives the one primary START to Up next, and lists the stages for a wide screen", () => {
    const html = render("u1-kvt");
    const rows = html.slice(html.indexOf("ug-stages"));
    // The current lesson's own key is there, but not a second primary one.
    expect(rows).toContain('aria-label="Start: Kinetic vs thermodynamic control"');
    const rowKey = rows.slice(0, rows.indexOf('aria-label="Start: Kinetic vs thermodynamic control"'));
    expect(rowKey.slice(rowKey.lastIndexOf("<button"))).not.toContain("primary");
    for (const stage of U1_GUIDE.stages) expect(html).toContain(`data-goto="${stage.id}"`);
  });

  it("is a modal dialog with every stage as a fold", () => {
    const html = render("u1-allylic");
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    for (const stage of U1_GUIDE.stages) expect(html).toContain(`data-stage="${stage.id}"`);
    expect(html.match(/aria-expanded="true"/g)?.length).toBe(1);
    expect(html.match(/aria-expanded="false"/g)?.length).toBe(U1_GUIDE.stages.length - 1);
  });

  it("opens on the stage the student is in, with START on the current lesson", () => {
    expect(openingStage(U1_GUIDE, doorsWith("u1-hx-dienes"))).toBe("b");
    const html = render("u1-hx-dienes");
    expect(html).toContain('data-lesson="u1-hx-dienes"');
    expect(html).toContain('aria-label="Start: HX + dienes: kinetic or thermodynamic"');
    // A lesson in another, folded stage is not drawn at all.
    expect(html).not.toContain('data-lesson="u1-allylic"');
  });

  it("puts the current lesson and its START at the top of the page", () => {
    const html = render("u1-kvt");
    expect(html).toContain('aria-label="Start up next: Kinetic vs thermodynamic control"');
    expect(html.indexOf("ug-next")).toBeLessThan(html.indexOf('data-stage="a"'));
  });

  it("says Side quest once on a side quest stage, not again on each of its lessons", () => {
    const html = render("u1-nbs");
    const stage = html.slice(html.indexOf('data-stage="c"'), html.indexOf('data-stage="d"'));
    expect(stage.match(/Side quest/g)?.length).toBe(1);
  });

  it("says why a shut lesson is shut instead of offering START", () => {
    const html = render("u1-12v14");
    expect(html).toContain("Opens after you clear u1-12v14");
    expect(html).not.toContain('aria-label="Start: Kinetic vs thermodynamic control"');
  });

  it("shows each lesson's key idea open, with its marked words in colour", () => {
    const html = render("u1-allylic");
    for (const lesson of U1_GUIDE.stages[0]!.lessons) {
      const key = lesson.ideas[0]!;
      expect(html).toContain(`<strong class="ug-hi">${key.mark}</strong>`);
    }
  });

  it("counts stages the way the path counts the unit: main-line lessons and checkpoints, no side quests", () => {
    const doors = doorsWith("u1-allylic");
    const pathTotal = U1.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined).length;
    const guideTotal = U1_GUIDE.stages.reduce((sum, stage) => sum + stageCount(stage, doors).total, 0);
    expect(guideTotal).toBe(pathTotal);
  });
});
