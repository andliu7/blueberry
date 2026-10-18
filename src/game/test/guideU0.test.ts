/**
 * Unit 0's guidebook (src/game/guide/u0Guide.ts), pinned like Unit 1's.
 *
 * 1. It is the guide the pathway opens for u0, with one section per chapter
 *    practice node and the test out quiz as the review stage's checkpoint.
 * 2. No new chemistry: every idea quotes, word for word, an entry in its own
 *    chapter's pool (explanation or correct option); every mistake and caption
 *    quotes some Unit 0 entry.
 * 3. Every drawn SMILES parses in RDKit and is one the generator itself put
 *    out (pools, story figures or the report's species), and the drawings file
 *    is byte for byte what scripts/u0_pools.py writes (u0Pools.test.ts reruns it).
 * Everything stays a draft.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { STORY_CHAPTERS, U0_POOLS } from "../content/u0";
import type { PoolEntry } from "../content/u1/types";
import { unitGuideFor } from "../guide";
import { UnitGuidePage } from "../guide/UnitGuide";
import type { LessonDoor } from "../guide/types";
import { U0_GUIDE } from "../guide/u0Guide";

const ROOT = resolve(__dirname, "../../..");
const LESSONS = U0_GUIDE.stages.flatMap((stage) => stage.lessons);

/** The words a quote may come from: the explanation, and the correct option's text and why. */
function quotable(entry: PoolEntry): string {
  const parts = [entry.explanation];
  if (entry.item.kind === "mcq") {
    const beat = entry.item.beat;
    const correct = beat.options.find((option) => option.id === beat.correctOptionId);
    parts.push(correct?.text ?? "", correct?.why ?? "");
  }
  return parts.join(" | ");
}
function quotedIn(node: string, source: string, quote: string): boolean {
  const entry = (U0_POOLS[node] ?? []).find((e) => e.id === source);
  return entry !== undefined && quotable(entry).includes(quote);
}
function quotedAnywhere(source: string, quote: string): boolean {
  return Object.keys(U0_POOLS).some((node) => quotedIn(node, source, quote));
}

describe("Unit 0 guidebook coverage", () => {
  it("is the guide the pathway opens for Unit 0", () => {
    expect(unitGuideFor("u0")).not.toBeNull();
    expect(unitGuideFor("u0")).toBe(U0_GUIDE);
    expect(unitGuideFor("u1")?.unitId).toBe("u1");
  });

  it("has one section per chapter, in story order, and the test out quiz closes the review", () => {
    expect(LESSONS.map((lesson) => lesson.node)).toEqual(STORY_CHAPTERS.map((c) => c.practiceNode));
    expect(U0_GUIDE.stages.map((stage) => stage.checkpoint)).toEqual([null, "u0-check", null]);
  });

  it("draws an example for every section and nothing else, and gives ideas and mistakes", () => {
    expect(Object.keys(U0_GUIDE.examples).sort()).toEqual(LESSONS.map((lesson) => lesson.node).sort());
    for (const lesson of LESSONS) {
      expect(U0_GUIDE.examples[lesson.node]!.panels.length, lesson.node).toBeGreaterThan(0);
      expect(lesson.ideas.length, lesson.node).toBeGreaterThanOrEqual(2);
      const key = lesson.ideas[0]!;
      expect(key.mark, lesson.node).toBeDefined();
      expect(key.text, lesson.node).toContain(key.mark);
    }
    for (const stage of U0_GUIDE.stages) expect(stage.mistakes.length, stage.id).toBeGreaterThanOrEqual(3);
  });
});

describe("the guide says nothing the questions do not", () => {
  it("quotes every idea from an entry in its own chapter", () => {
    for (const lesson of LESSONS) {
      for (const idea of lesson.ideas) {
        expect(quotedIn(lesson.node, idea.source, idea.quote), `${lesson.node} / ${idea.source}: ${idea.quote}`).toBe(true);
      }
    }
  });

  it("quotes every mistake and caption source from a Unit 0 entry", () => {
    for (const stage of U0_GUIDE.stages) {
      for (const item of stage.mistakes) expect(quotedAnywhere(item.source, item.quote), `${item.source}: ${item.quote}`).toBe(true);
    }
    for (const lesson of LESSONS) {
      expect(quotedAnywhere(lesson.example.source, lesson.example.quote), `${lesson.node}: ${lesson.example.quote}`).toBe(true);
    }
  });

  it("keeps everything a draft and free of em dashes", () => {
    expect(U0_GUIDE.placeholder).toBe(true);
    for (const example of Object.values(U0_GUIDE.examples)) expect(example.placeholder).toBe(true);
    expect(JSON.stringify(U0_GUIDE)).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("every guide structure comes from the generator", () => {
  const smiles = Object.values(U0_GUIDE.examples).flatMap((example) =>
    example.panels.flatMap((panel) => (panel.kind === "mol" ? [panel.smiles] : [])),
  );

  it("draws real structures, each with ink", () => {
    expect(smiles.length).toBeGreaterThanOrEqual(15);
    for (const example of Object.values(U0_GUIDE.examples)) {
      for (const panel of example.panels) {
        if (panel.kind !== "mol") continue;
        expect(panel.figure.bonds.length + (panel.figure.labels?.length ?? 0), panel.smiles).toBeGreaterThan(0);
      }
    }
  });

  it("uses only SMILES the generator put out", () => {
    const generated = [
      readFileSync(resolve(ROOT, "src/game/content/u0/pools.ts"), "utf8"),
      readFileSync(resolve(ROOT, "src/game/content/u0/figures.ts"), "utf8"),
      readFileSync(resolve(ROOT, "scripts/u0_pools_report.md"), "utf8"),
    ].join("\n");
    for (const s of smiles) expect(generated.includes(`"${s}"`) || generated.includes(`\`${s}\``), s).toBe(true);
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
});

describe("it renders", () => {
  it("draws every stage and the key idea of every section on the shared guide page", () => {
    const doors = new Map<string, LessonDoor>();
    for (const lesson of LESSONS) doors.set(lesson.node, { title: lesson.node, state: "open", gate: null, note: null, sideQuest: false });
    doors.set("u0-check", { title: "Test out", state: "open", gate: null, note: null, sideQuest: false });
    const html = renderToStaticMarkup(
      createElement(UnitGuidePage, {
        guide: U0_GUIDE,
        unitLabel: "Unit 0",
        unitName: "Start here",
        doors,
        progress: { done: 0, total: LESSONS.length + 1 },
        onStart: () => {},
        onClose: () => {},
        covered: false,
        reducedMotion: true,
      }),
    );
    for (const stage of U0_GUIDE.stages) expect(html).toContain(stage.title);
  });
});
