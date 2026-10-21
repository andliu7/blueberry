/**
 * The checks every unit guidebook after Unit 1 is held to, written once so
 * Units 2 and 7 to 10 cannot drift apart. Each unit's test file
 * (guideU2.test.ts, ...) calls describeUnitGuide with its own guide, pool and
 * generator script. Not a test file itself (no .test.ts), so vitest only runs
 * it through those files.
 *
 * The same promises guideU1.test.ts pins for Unit 1:
 *  1. Coverage: one section per lesson on the path, every stage quiz a stage
 *     checkpoint, a drawn example for every lesson and nothing else.
 *  2. No new chemistry: every idea quotes, word for word, a question in its
 *     own lesson (a pool entry's explanation or correct option, a lesson
 *     MCQ's correct option, or the sort ladder the lesson plays); every
 *     mistake and caption quotes the unit.
 *  3. Every structure parses in RDKit, every charge sign clears every bond,
 *     and the drawings file is byte for byte what the unit's script derives.
 *  4. It loads on first open (guide/index.ts), and it renders: a modal with
 *     every stage a fold, each key idea's marked words in colour, and stage
 *     counts that add up to the path's own count for the unit.
 * Everything stays a draft.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { sortContentById } from "../beats/sort/ladders";
import { LADDER_FOR_NODE, lessonMcqBeats } from "../beats/template";
import type { UnitPools } from "../content/u1/types";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { hasUnitGuide, loadUnitGuide, unitGuideFor } from "../guide";
import { stageCount, UnitGuidePage } from "../guide/UnitGuide";
import type { LessonDoor, UnitGuide } from "../guide/types";

const ROOT = resolve(__dirname, "../../..");

export interface UnitGuideCase {
  readonly unitId: string;
  readonly guide: UnitGuide;
  readonly pools: UnitPools;
  /** The generator, run with --check: "scripts/guide_u2.py". */
  readonly script: string;
  /** At least this many drawn structures across the guide. */
  readonly minStructures: number;
}

export function describeUnitGuide({ unitId, guide, pools, script, minStructures }: UnitGuideCase): void {
  const unit = PATHWAY_UNITS.find((entry) => entry.id === unitId)!;
  const lessons = unit.nodes.filter((node) => node.playable !== undefined && node.role !== "quiz" && !node.mentionOnly);
  const quizzes = unit.nodes.filter((node) => node.role === "quiz");
  const guideLessons = guide.stages.flatMap((stage) => stage.lessons);

  /** What a quote may be copied from in `node`: pool explanations and correct options, and lesson MCQs' correct options. */
  const quotable = (node: string, source: string): string | null => {
    const parts: string[] = [];
    for (const entry of pools[node] ?? []) {
      if (entry.id !== source) continue;
      parts.push(entry.explanation);
      if (entry.item.kind === "mcq") {
        const beat = entry.item.beat;
        const correct = beat.options.find((option) => option.id === beat.correctOptionId);
        parts.push(correct?.text ?? "", correct?.why ?? "");
      }
    }
    for (const beat of lessonMcqBeats(node)) {
      if (beat.id !== source) continue;
      const correct = beat.options.find((option) => option.id === beat.correctOptionId);
      parts.push(correct?.text ?? "", correct?.why ?? "");
    }
    // A node whose lesson plays a sort ladder (u10-basicity): its brief and each card's why.
    const ladder = LADDER_FOR_NODE[node] === source ? sortContentById(source) : undefined;
    if (ladder !== undefined) parts.push(ladder.beat.brief ?? "", ...ladder.beat.items.flatMap((item) => [item.label, item.why ?? ""]));
    return parts.length === 0 ? null : parts.join(" | ");
  };
  const quotedIn = (node: string, source: string, quote: string) => quotable(node, source)?.includes(quote) ?? false;
  const quotedAnywhere = (source: string, quote: string) => unit.nodes.some((node) => quotedIn(node.id, source, quote));

  describe(`${unitId} guidebook coverage`, () => {
    it("is registered, and loads on first open", async () => {
      expect(hasUnitGuide(unitId)).toBe(true);
      expect(await loadUnitGuide(unitId)).toBe(guide);
      expect(unitGuideFor(unitId)).toBe(guide);
    });

    it("has one section per lesson on the path, and no stray ones", () => {
      expect(lessons.length).toBeGreaterThan(0);
      const ids = guideLessons.map((lesson) => lesson.node);
      expect(new Set(ids).size).toBe(ids.length);
      expect([...ids].sort()).toEqual(lessons.map((node) => node.id).sort());
    });

    it("makes every stage quiz a stage checkpoint", () => {
      const checkpoints = guide.stages.map((stage) => stage.checkpoint).filter((id) => id !== null);
      expect([...checkpoints].sort()).toEqual(quizzes.map((node) => node.id).sort());
    });

    it("draws an example for every lesson, and nothing for a node that is not one", () => {
      for (const lesson of guideLessons) expect(guide.examples[lesson.node]?.panels.length ?? 0, lesson.node).toBeGreaterThan(0);
      expect(Object.keys(guide.examples).sort()).toEqual(guideLessons.map((lesson) => lesson.node).sort());
    });

    it("gives every lesson ideas and every stage mistakes, each with a fix", () => {
      for (const lesson of guideLessons) expect(lesson.ideas.length, lesson.node).toBeGreaterThanOrEqual(2);
      for (const stage of guide.stages) {
        expect(stage.mistakes.length, stage.id).toBeGreaterThanOrEqual(3);
        for (const item of stage.mistakes) expect(item.fix.length, item.mistake).toBeGreaterThan(0);
      }
    });
  });

  describe(`the ${unitId} guide says nothing the questions do not`, () => {
    it("quotes every idea from a question in its own lesson", () => {
      for (const lesson of guideLessons) {
        for (const idea of lesson.ideas) {
          expect(quotedIn(lesson.node, idea.source, idea.quote), `${lesson.node} / ${idea.source}: ${idea.quote}`).toBe(true);
        }
      }
    });

    it("quotes every mistake and every example caption from a question in the unit", () => {
      for (const stage of guide.stages) {
        for (const item of stage.mistakes) expect(quotedAnywhere(item.source, item.quote), `${item.source}: ${item.quote}`).toBe(true);
      }
      for (const lesson of guideLessons) {
        expect(quotedAnywhere(lesson.example.source, lesson.example.quote), `${lesson.node}: ${lesson.example.quote}`).toBe(true);
      }
    });

    it("marks words that are really in each key idea, and gives every lesson one", () => {
      for (const lesson of guideLessons) {
        const key = lesson.ideas[0]!;
        expect(key.mark, lesson.node).toBeDefined();
        expect(key.text, lesson.node).toContain(key.mark);
      }
    });

    it("keeps everything a draft and free of em dashes", () => {
      expect(guide.placeholder).toBe(true);
      for (const example of Object.values(guide.examples)) expect(example.placeholder).toBe(true);
      expect(JSON.stringify(guide)).not.toContain("\u2014");
    });
  });

  describe(`every ${unitId} guide structure comes from RDKit`, () => {
    const mols = Object.values(guide.examples).flatMap((example) => example.panels.flatMap((panel) => (panel.kind === "mol" ? [panel] : [])));

    it("draws structures, each with bonds or a label", () => {
      expect(mols.length).toBeGreaterThanOrEqual(minStructures);
      for (const panel of mols) expect(panel.figure.bonds.length + (panel.figure.labels?.length ?? 0), panel.smiles).toBeGreaterThan(0);
    });

    it("parses every SMILES in RDKit", () => {
      const run = spawnSync(
        "python",
        ["-c", "import sys, json\nfrom rdkit import Chem\nbad=[s for s in json.load(sys.stdin) if Chem.MolFromSmiles(s) is None]\nprint(json.dumps(bad))"],
        { input: JSON.stringify(mols.map((panel) => panel.smiles)), encoding: "utf8", timeout: 60_000 },
      );
      expect(run.status, run.stderr).toBe(0);
      expect(JSON.parse(run.stdout)).toEqual([]);
    });

    it("draws every charge and radical sign clear of every bond, with a halo on its carbon", () => {
      const toSegment = (px: number, py: number, b: { x1: number; y1: number; x2: number; y2: number }) => {
        const dx = b.x2 - b.x1;
        const dy = b.y2 - b.y1;
        const t = Math.max(0, Math.min(1, ((px - b.x1) * dx + (py - b.y1) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(px - (b.x1 + dx * t), py - (b.y1 + dy * t));
      };
      for (const panel of mols) {
        expect(panel.figure.signs?.length ?? 0, panel.smiles).toBe(panel.figure.halos?.length ?? 0);
        for (const sign of panel.figure.signs ?? []) {
          for (const bond of panel.figure.bonds) expect(toSegment(sign.x, sign.y, bond), panel.smiles).toBeGreaterThanOrEqual(8);
        }
      }
    });

    it(`matches what ${script} derives, byte for byte`, () => {
      const run = spawnSync("python", [script, "--check"], { cwd: ROOT, encoding: "utf8", timeout: 150_000 });
      expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    }, 160_000);
  });

  describe(`the ${unitId} guidebook page`, () => {
    // Everything before the middle lesson done, the middle one current, the rest locked.
    const current = lessons[Math.floor(lessons.length / 2)]!.id;
    const doors = new Map<string, LessonDoor>();
    let before = true;
    for (const node of unit.nodes) {
      if (node.playable === undefined) continue;
      const state = node.id === current ? "current" : before ? "done" : "locked";
      if (node.id === current) before = false;
      doors.set(node.id, {
        title: node.title,
        state,
        gate: state === "locked" ? null : { id: node.id, kind: "concept", title: node.id, href: `#/app/lesson/${node.id}` },
        note: state === "locked" ? `Opens after you clear ${current}` : null,
        sideQuest: node.kind === "branch",
      });
    }
    const html = renderToStaticMarkup(
      createElement(UnitGuidePage, {
        guide,
        unitLabel: unitId,
        unitName: unit.title,
        doors,
        progress: { done: 0, total: lessons.length },
        onStart: () => {},
        onClose: () => {},
        covered: false,
        reducedMotion: true,
      }),
    );

    it("is a modal dialog with every stage as a fold, one of them open", () => {
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      for (const stage of guide.stages) expect(html).toContain(`data-stage="${stage.id}"`);
      expect(html.match(/aria-expanded="true"/g)?.length).toBe(1);
    });

    it("shows the open stage's key ideas with their marked words in colour", () => {
      const open = guide.stages.find((stage) => stage.lessons.some((lesson) => lesson.node === current))!;
      for (const lesson of open.lessons) {
        const mark = lesson.ideas[0]!.mark!.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        expect(html, lesson.node).toContain(`<strong class="ug-hi">${mark}</strong>`);
      }
    });

    it("counts stages the way the path counts the unit: main-line lessons and checkpoints, no side quests", () => {
      const pathTotal = unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined).length;
      const guideTotal = guide.stages.reduce((sum, stage) => sum + stageCount(stage, doors).total, 0);
      expect(guideTotal).toBe(pathTotal);
    });
  });
}
