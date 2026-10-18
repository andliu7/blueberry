/**
 * Unit 0 ("Start here") draft pools and story (src/game/content/u0).
 *
 * WHAT IS PINNED: the pool contract (every entry a placeholder with an
 * explanation and a provenance, unique ids), that every pool belongs to a
 * Unit 0 node, chapter 1 teaching one control per item kind plus the arrow
 * card, chapter 9 previewing each of Units 1 to 15 exactly once, the test out
 * quiz drawing only on chapters 2 to 8, and the lookup wiring (pathwayNode
 * falls back to Unit 0 without moving Unit 1).
 *
 * AND HOW IT PLAYS (round 2, after the critic played it): every chapter's
 * cards play once each in a seven-slot lesson, never as an in-a-row run that
 * tiers at "3 for Pro" and can stop before every control or every unit
 * preview is shown; every scene plays its own new "guess first" question;
 * every MCQ, sort card and match card carries a drawing; the test out is open
 * from the start.
 *
 * WHAT IS NOT: the chemistry. scripts/u0_pools.py derives it with RDKit and
 * refuses to write when an authored key disagrees; the last test here reruns
 * it in check mode, so a hand edit to a generated file fails.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { mcqAuthoringViolations } from "../beats/mcq/authoring";
import { mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";
import { isExamRun, lessonPool, practicePool } from "../beats/practice/pools";
import { lessonMcqBeats, lessonMeetBeats, lessonPoolItems, planLesson } from "../beats/template";
import type { McqBeat } from "../beats/types";
import {
  STORY_CHAPTERS,
  STORY_NODE_IDS,
  STORY_UNIT,
  U0_EXAM_CHAPTERS,
  U0_EXAM_IDS,
  U0_FINISH_NODES,
  U0_OPEN_FROM_START,
  U0_OPTION_TILES,
  U0_POOLS,
  U0_PREVIEW_UNITS,
  U0_SN_CHART,
  U0_SORT_FIGURES,
  U0_STORY_FIGURES,
  storyNode,
} from "../content/u0";
import type { PoolEntry } from "../content/u1/types";
import { PATHWAY_UNITS, UNIT_TITLE_SEPARATOR, checkpointNodeId, pathwayNode, unitName, unitNumber } from "../demo/pathwayMap";
import { RESONANCE_HUNT } from "../demo/resonance";
import { SN2_DEMO_STEP } from "../demo/sn2Step";

const ROOT = resolve(__dirname, "../../..");

function idOf(entry: PoolEntry): string {
  switch (entry.item.kind) {
    case "mcq":
      return entry.item.beat.id;
    case "sort":
      return entry.item.content.beat.id;
    case "match":
      return entry.item.board.beatId;
    case "draw":
      return entry.item.beat.id;
  }
}

const entries = Object.entries(U0_POOLS).flatMap(([node, pool]) => pool.map((entry) => [node, entry] as const));
const mcqs: readonly McqBeat[] = entries.flatMap(([, entry]) => (entry.item.kind === "mcq" ? [entry.item.beat] : []));
const chapter = (n: number) => STORY_CHAPTERS.find((c) => c.number === n)!;
const sceneNodes = new Set(STORY_CHAPTERS.map((c) => c.sceneNode));
const practiceEntries = entries.filter(([node]) => !sceneNodes.has(node));

describe("the Unit 0 pool contract", () => {
  it("marks every entry a draft, with an explanation and a provenance", () => {
    expect(practiceEntries.length).toBeGreaterThan(40);
    for (const [, entry] of entries) {
      expect(entry.placeholder, entry.id).toBe(true);
      expect(entry.explanation.trim().length, entry.id).toBeGreaterThan(0);
      expect(entry.provenance.trim().length, entry.id).toBeGreaterThan(0);
    }
  });

  it("gives every entry a unique id that matches its item's id", () => {
    const ids = entries.map(([, entry]) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, entry] of entries) expect(idOf(entry), entry.id).toBe(entry.id);
  });

  it("keys every pool by a Unit 0 node id: each chapter's lesson node and its scene node", () => {
    for (const node of Object.keys(U0_POOLS)) {
      expect(STORY_NODE_IDS, node).toContain(node);
      expect(storyNode(node)?.role, node).toBe(sceneNodes.has(node) ? "video" : "lesson");
    }
    const keys = STORY_CHAPTERS.flatMap((c) => [c.practiceNode, c.sceneNode]);
    expect(Object.keys(U0_POOLS).sort()).toEqual([...keys].sort());
  });

  it("holds 4 to 6 items in every chapter's lesson, one preview per unit in chapter 9, and one question per scene", () => {
    for (const c of STORY_CHAPTERS) {
      const size = U0_POOLS[c.practiceNode]!.length;
      if (c.number === 9) {
        expect(size).toBe(15);
      } else {
        expect(size, c.practiceNode).toBeGreaterThanOrEqual(4);
        expect(size, c.practiceNode).toBeLessThanOrEqual(6);
      }
      expect(U0_POOLS[c.sceneNode]!.length, c.sceneNode).toBe(1);
    }
  });

  it("draws every MCQ: a structure above it, drawn answer cards, or both", () => {
    for (const beat of mcqs) {
      const tiles = mcqOptionTiles(beat.id, beat.options.map((o) => o.id));
      expect(mcqVisualFor(beat.id) !== null || tiles !== null, beat.id).toBe(true);
      if (U0_OPTION_TILES[beat.id] !== undefined) expect(tiles, `${beat.id} tiles cover every option`).not.toBeNull();
    }
  });

  it("draws every sort card and every match card's molecule", () => {
    for (const [, entry] of entries) {
      if (entry.item.kind === "sort") {
        const figures = U0_SORT_FIGURES[entry.id];
        for (const item of entry.item.content.beat.items) expect(figures?.[item.id], `${entry.id} ${item.id}`).toBeDefined();
      }
      if (entry.item.kind === "match") {
        const board = entry.item.board;
        const prompts = Object.keys(board.whyByPrompt);
        expect(prompts.length, entry.id).toBeGreaterThan(0);
        for (const id of prompts) expect(board.figureByPrompt?.[id], `${entry.id} ${id}`).toBeDefined();
      }
    }
  });

  it("passes the MCQ authoring rules", () => {
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
  });

  it("keeps student copy free of em dashes and tool names", () => {
    const copy = JSON.stringify([mcqs, STORY_CHAPTERS]);
    expect(copy).not.toContain(String.fromCharCode(0x2014));
    expect(copy).not.toMatch(/SMARTS|RDKit|Gasteiger|OPSIN/);
  });

  it("never prints the charge a formal charge question asks for", () => {
    for (const id of ["u0-bond-fc-nh4", "u0-bond-fc-oh"]) {
      const beat = mcqs.find((b) => b.id === id)!;
      expect(beat.prompt, id).not.toMatch(/[⁺⁻]/);
      const visual = mcqVisualFor(id);
      expect(visual?.kind, id).toBe("structure");
      if (visual?.kind === "structure") {
        const marks = (visual.figure.labels ?? []).map((label) => label.t);
        expect(marks.some((t) => /[+−]/.test(t)), id).toBe(false);
      }
    }
  });
});

describe("chapter 1 teaches the controls by doing", () => {
  it("has one item of each kind: tap (mcq), sort, match and draw", () => {
    const kinds = U0_POOLS["u0-controls"]!.map((entry) => entry.item.kind).sort();
    expect(kinds).toEqual(["draw", "match", "mcq", "sort"]);
  });

  it("plays every one of those cards in one lesson, with no in-a-row tiers", () => {
    // practicePool is the in-a-row run ("0 of 3 for Pro"); empty means the node is not one.
    expect(practicePool("u0-controls")).toEqual([]);
    const steps = planLesson("u0-controls")?.steps.map((step) => step.beat.kind) ?? [];
    expect(steps).toEqual(["mcq", "poolMatch", "poolSort", "draw"]);
  });

  it("hands the curved arrow over to the existing res-acetate card", () => {
    expect(chapter(1).arrowCard).toBe("res-acetate");
    expect(RESONANCE_HUNT.map((card) => card.id)).toContain("res-acetate");
    const tried = chapter(1).scene.steps.map((step) => step.tryIt).filter((t) => t !== undefined);
    expect([...tried].sort()).toEqual(["arrow", "drag", "draw", "match", "tap"]);
  });

  it("replays the SN2 demo step by its id in chapter 6", () => {
    expect(chapter(6).mechanismStep).toBe(SN2_DEMO_STEP.id);
  });
});

describe("chapter 9 previews every Orgo II unit", () => {
  it("covers u1 to u15 exactly once, each linked to a real unit", () => {
    const units = Object.values(U0_PREVIEW_UNITS);
    expect([...units].sort()).toEqual(PATHWAY_UNITS.map((unit) => unit.id).sort());
    expect(new Set(units).size).toBe(15);
    const previewIds = U0_POOLS["u0-preview"]!.map((entry) => entry.id);
    expect(Object.keys(U0_PREVIEW_UNITS).sort()).toEqual([...previewIds].sort());
  });

  it("names each preview's unit with that unit's own title", () => {
    for (const entry of U0_POOLS["u0-preview"]!) {
      if (entry.item.kind !== "mcq") throw new Error(`${entry.id} is not an MCQ`);
      const unit = PATHWAY_UNITS.find((u) => u.id === U0_PREVIEW_UNITS[entry.id])!;
      expect(entry.item.beat.brief, entry.id).toContain(unitName(unit.title));
    }
  });
});

describe("every chapter plays as a lesson that shows every card once", () => {
  it("serves each chapter's whole pool: its MCQs in the quick questions, its ladders, boards and drawings as steps", () => {
    for (const c of STORY_CHAPTERS) {
      const pool = U0_POOLS[c.practiceNode]!;
      expect(practicePool(c.practiceNode), c.practiceNode).toEqual([]);
      expect(lessonPool(c.practiceNode), c.practiceNode).toEqual(pool);
      const served = [
        ...lessonMcqBeats(c.practiceNode).map((beat) => beat.id),
        ...(["sort", "match", "draw"] as const).flatMap((kind) => lessonPoolItems(c.practiceNode, kind).map((e) => e.id)),
      ];
      expect([...served].sort(), c.practiceNode).toEqual(pool.map((e) => e.id).sort());
      expect(planLesson(c.practiceNode), c.practiceNode).not.toBeNull();
    }
  });

  it("plays all fifteen previews in chapter 9, so every unit on the map is shown", () => {
    expect(lessonMcqBeats("u0-preview").map((beat) => beat.id).sort()).toEqual(Object.keys(U0_PREVIEW_UNITS).sort());
    expect(planLesson("u0-preview")?.steps.map((step) => step.beat.kind)).toEqual(["mcq"]);
  });

  it("plays each scene's new guess first question, ungraded, and never reuses a practice item", () => {
    const practiceIds = new Set(practiceEntries.map(([, entry]) => entry.id));
    for (const c of STORY_CHAPTERS) {
      expect(planLesson(c.sceneNode)?.steps.map((step) => step.beat.kind), c.sceneNode).toEqual(["meet"]);
      const meet = lessonMeetBeats(c.sceneNode);
      expect(meet.map((beat) => beat.id), c.sceneNode).toEqual([c.primeItem]);
      expect(meet[0]!.levels).toEqual([0]);
      expect(practiceIds.has(c.primeItem), c.primeItem).toBe(false);
      expect(U0_EXAM_IDS, c.primeItem).not.toContain(c.primeItem);
    }
  });
});

describe("the test out quiz", () => {
  it("is non-empty, 8 to 10 items, drawn only from chapters 2 to 8, and samples each of them", () => {
    const pool = practicePool(checkpointNodeId("u0"));
    expect(pool.length).toBeGreaterThanOrEqual(8);
    expect(pool.length).toBeLessThanOrEqual(10);
    const allowed = STORY_CHAPTERS.filter((c) => c.number >= 2 && c.number <= 8).map((c) => c.practiceNode);
    expect([...U0_EXAM_CHAPTERS].sort()).toEqual([...allowed].sort());
    const home = (id: string) => Object.entries(U0_POOLS).find(([, pool]) => pool.some((e) => e.id === id))?.[0];
    for (const entry of pool) expect(allowed, entry.id).toContain(home(entry.id));
    expect(new Set(pool.map((entry) => home(entry.id))).size).toBe(allowed.length);
    expect(pool.map((entry) => entry.id).sort()).toEqual([...U0_EXAM_IDS].sort());
  });

  it("interleaves by chapter: the first seven items come from seven different chapters", () => {
    const pool = practicePool(checkpointNodeId("u0"));
    const home = (id: string) => Object.entries(U0_POOLS).find(([, p]) => p.some((e) => e.id === id))?.[0];
    expect(new Set(pool.slice(0, 7).map((entry) => home(entry.id))).size).toBe(7);
  });

  it("is the Unit 0 quiz node, and clearing it or chapter 9 finishes Unit 0", () => {
    expect(storyNode("u0-check")?.role).toBe("quiz");
    // The whole set, right first time, so a test out cannot pass on three lucky answers in a row.
    expect(isExamRun("u0-check")).toBe(true);
    expect(isExamRun("u0-controls")).toBe(false);
    expect(U0_FINISH_NODES).toEqual(["u0-preview", "u0-check"]);
  });

  it("is open from the start and sits before the Orgo I review, so it is a real skip", () => {
    expect(U0_OPEN_FROM_START).toContain("u0-check");
    expect(U0_OPEN_FROM_START).toContain(chapter(1).sceneNode);
    expect(STORY_NODE_IDS.indexOf("u0-check")).toBeLessThan(STORY_NODE_IDS.indexOf(chapter(2).sceneNode));
  });
});

describe("the story unit and the lookup fallback", () => {
  it("is titled Unit 0 with the map's own separator", () => {
    expect(STORY_UNIT.title).toBe(`Unit 0${UNIT_TITLE_SEPARATOR}Start here`);
    expect(unitNumber(STORY_UNIT.title)).toBe("Unit 0");
  });

  it("is NOT in PATHWAY_UNITS, so the inventory pins and unlocks do not move", () => {
    expect(PATHWAY_UNITS.some((unit) => unit.id === "u0")).toBe(false);
    expect(PATHWAY_UNITS.flatMap((unit) => unit.nodes).some((node) => node.id.startsWith("u0-"))).toBe(false);
  });

  it("has a video scene and a lesson node for every chapter, plus the check, all playable beats", () => {
    expect(STORY_CHAPTERS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const c of STORY_CHAPTERS) {
      expect(storyNode(c.sceneNode)?.role, c.sceneNode).toBe("video");
      expect(storyNode(c.practiceNode)?.role, c.practiceNode).toBe("lesson");
    }
    expect(STORY_NODE_IDS.length).toBe(19);
    expect(new Set(STORY_NODE_IDS).size).toBe(19);
    for (const node of STORY_UNIT.nodes) {
      expect(node.playable, node.id).toEqual({ kind: "beat", id: node.id });
      // Playable means it plays: no Unit 0 node opens on "This lesson is still being written".
      expect(planLesson(node.id), node.id).not.toBeNull();
    }
  });

  it("finds Unit 0 nodes through the pathwayNode fallback, so the runners play their pools", () => {
    expect(pathwayNode("u0-controls")).toBe(storyNode("u0-controls"));
    expect(pathwayNode("u0-controls-scene")).toBe(storyNode("u0-controls-scene"));
    expect(lessonPool("u0-controls")).toEqual(U0_POOLS["u0-controls"]);
    // Without the fallback pathwayNode is null, isRunNode says no, and the test out has no run.
    expect(practicePool("u0-check").length).toBeGreaterThan(0);
  });

  it("leaves Unit 1 lookups unchanged", () => {
    const u1 = PATHWAY_UNITS.find((unit) => unit.id === "u1")!;
    expect(pathwayNode("u1-allylic")).toBe(u1.nodes.find((node) => node.id === "u1-allylic"));
    expect(pathwayNode("no-such-node")).toBeNull();
  });
});

describe("every scene step draws generated chemistry", () => {
  it("points each step at a generated figure, and each highlight and arrow end at a real atom or bond of it", () => {
    for (const c of STORY_CHAPTERS) {
      expect(c.scene.steps.length, c.id).toBeGreaterThanOrEqual(3);
      for (const step of c.scene.steps) {
        expect(step.narration.length, c.id).toBeLessThanOrEqual(110);
        if (step.figure === undefined) {
          expect(step.highlights, c.id).toBeUndefined();
          expect(step.arrows, c.id).toBeUndefined();
          continue;
        }
        const fig = U0_STORY_FIGURES[step.figure];
        expect(fig, step.figure).toBeDefined();
        const atoms = Object.keys(fig.atomXY).length;
        for (const i of step.highlights ?? []) expect(i, step.narration).toBeLessThan(atoms);
        const bonds = Object.values(fig.bonds).map((b) => [...b].sort().join("-"));
        for (const arrow of step.arrows ?? []) {
          expect((arrow.fromAtom === undefined) !== (arrow.fromBond === undefined), step.narration).toBe(true);
          expect((arrow.toAtom === undefined) !== (arrow.toBond === undefined), step.narration).toBe(true);
          for (const b of [arrow.fromBond, arrow.toBond]) if (b !== undefined) expect(bonds).toContain([...b].sort().join("-"));
        }
      }
    }
  });

  it("primes every chapter with an MCQ in its scene node's pool", () => {
    for (const c of STORY_CHAPTERS) {
      const entry = U0_POOLS[c.sceneNode]!.find((e) => e.id === c.primeItem);
      expect(entry?.item.kind, `${c.id} ${c.primeItem}`).toBe("mcq");
    }
    expect(chapter(9).opensPicker).toBe(true);
  });

  it("teaches all four mechanisms in chapter 7 and shows the decision chart", () => {
    const steps = chapter(7).scene.steps;
    const said = steps.map((step) => step.narration).join(" ");
    for (const m of ["SN1", "SN2", "E1", "E2"]) expect(said, m).toContain(m);
    expect(steps.some((step) => step.chart === "sn")).toBe(true);
    expect(U0_SN_CHART.rows.length).toBe(4);
    for (const row of U0_SN_CHART.rows) expect(row.cells.length).toBe(U0_SN_CHART.reagents.length);
    // The E2 step points at the beta carbon the base takes an H from, not only at the C-Br carbon.
    const e2 = steps.find((step) => step.narration.includes("E2") && step.figure === "bromobutane2")!;
    expect(e2.highlights).toContain(U0_STORY_FIGURES.bromobutane2.atoms.beta);
  });

  it("teaches R/S with the lowest priority group pointing away", () => {
    expect(chapter(8).scene.steps.some((step) => /H away from you/.test(step.narration))).toBe(true);
  });
});

describe("the generator", () => {
  it("rebuilds every generated Unit 0 file byte for byte (python scripts/u0_pools.py --check)", () => {
    const run = spawnSync("python", ["scripts/u0_pools.py", "--check"], { cwd: ROOT, encoding: "utf8", timeout: 240_000 });
    expect(run.status, run.stdout + run.stderr).toBe(0);
  }, 250_000);
});
