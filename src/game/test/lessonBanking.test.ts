/**
 * The lesson banks what the student earned.
 *
 * WHY THIS FILE EXISTS. On 2026-09-05 a verifier finished #/lesson/u1-kvt at
 * 1 of 1 correct and then diffed localStorage: it was byte-identical. No
 * lesson recorded, no diamonds, no streak, the pathway header still reading
 * "0 of 86 lessons done", the node still open, the trail never turning green.
 * The Path tab, the product's first destination, could not advance a student
 * one step, and it had been that way through several green suites.
 *
 * The cause was not a broken function. `clearNode` worked. It had NO CALLERS
 * ANYWHERE IN THE APP, while `startNode` beside it was already spending
 * charge to enter a node. The store took payment on the way in and banked
 * nothing on the way out, and every existing test passed the whole time
 * because each one tested a piece that was individually correct.
 *
 * That is the regression class this file guards: not "is the arithmetic
 * right" but "is anything calling it at all". Two checks, deliberately
 * different in kind.
 *
 * THE FIRST IS A MACHINE TEST and proves the run actually reaches the state
 * that triggers banking. If `reportStep` stopped producing a "reward" phase,
 * the banking would never fire and no source check would notice.
 *
 * THE SECOND IS A TEXT CHECK ON SOURCE, the same coarse instrument and the
 * same reason lessonProgress.test.ts records for its stylesheet check: the
 * web suite runs in node with no DOM, and BeatRunner banks inside a React
 * effect behind a dynamic import that cannot be driven here. It is a floor,
 * not a proof. It cannot tell whether the call runs, only that the app has
 * not gone back to never making it. That is precisely the state the product
 * shipped in, so it is the state worth a tripwire.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { planLesson, startRun, reportStep, currentStep } from "../beats/template";
import { pathwayNode, PATHWAY_UNITS } from "../demo/pathwayMap";

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

/* ------------------------------------------------------------------ */
/* 1. The run reaches the state that banks                              */
/* ------------------------------------------------------------------ */

describe("a finished run reaches its reward phase", () => {
  // Any authored beat node will do; this one is on the spine of Unit 1 and is
  // what the verifier actually played.
  const plan = planLesson("u1-kvt");

  it("has an authored plan, or the rest of this block proves nothing", () => {
    expect(plan).not.toBeNull();
  });

  it("ends in the reward phase once every step has been reported", () => {
    let run = startRun(plan!);
    // Clear every step. A generous bound rather than a while(true): a machine
    // that stopped advancing should fail this test, not hang the suite.
    for (let i = 0; i < 50 && currentStep(run) !== null; i += 1) {
      run = reportStep(run, { cleared: 1, total: 1 });
    }
    expect(currentStep(run)).toBeNull();
    expect(run.phase).toBe("reward");
  });
});

/* ------------------------------------------------------------------ */
/* 2. Something still calls clearNode                                   */
/* ------------------------------------------------------------------ */

describe("clearing a node is not dead code", () => {
  it("is called by BeatRunner, the surface the pathway opens", () => {
    const src = read("../beats/BeatRunner.tsx");
    expect(src).toMatch(/\bclearNode\s*\(/);
  });

  it("passes the pathway's spine-ness through, because the economy pays on it", () => {
    const src = read("../beats/BeatRunner.tsx");
    expect(src).toMatch(/\bspine\b/);
  });

  it("guards against paying twice for one run", () => {
    // The ref keyed by node id. Its absence would mean a re-render of a
    // finished run appends a second node_cleared to an append-only journal,
    // which every balance is then derived from.
    const src = read("../beats/BeatRunner.tsx");
    expect(src).toMatch(/bankedFor/);
  });
});

/* ------------------------------------------------------------------ */
/* 3. The node lookup the banking depends on                            */
/* ------------------------------------------------------------------ */

describe("pathwayNode", () => {
  it("finds a node that exists", () => {
    expect(pathwayNode("u1-kvt")?.kind).toBe("spine");
  });

  it("returns null rather than throwing on an id that does not exist", () => {
    expect(pathwayNode("not-a-real-node")).toBeNull();
  });

  it("agrees with the map it reads, for every node on it", () => {
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) {
        expect(pathwayNode(node.id)).toBe(node);
      }
    }
  });
});
