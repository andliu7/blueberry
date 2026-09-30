/**
 * The Challenge run, on the game's side of the seam: what makes it harder,
 * when it counts as passed, which nodes have one, and where its link goes.
 * The money it pays is pinned in packages/economy/test/challenge.test.ts,
 * because that is where the money lives; nothing here prices anything.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CHARGE_COST, deriveEconomy } from "@blueberry/economy";
import { chargeGateModel } from "../charge/chargeGateModel";
import { createLocalProgress } from "../app/progress";
import { CHALLENGE_PARAM, hrefForChallenge, parseHash } from "../app/routes";
import { challengeable, challengeOutcome, planLesson, reportRecycle, reportStep, startRun, type LessonPlan } from "../beats/template";
import { hasChallengeRun, PATHWAY_UNITS, unitCheckpointNode } from "../demo/pathwayMap";

/** A two-step plan built from a real node's own steps, so nothing is invented. */
function twoStepPlan(): LessonPlan {
  const plan = planLesson("u1-kvt");
  expect(plan, "u1-kvt has a lesson plan").not.toBeNull();
  const step = plan!.steps[0]!;
  return { node: plan!.node, steps: [step, step] };
}

describe("a Challenge run is harder than Practice in exactly one way: no second chance", () => {
  it("a miss in Practice queues the recycle pass and the run goes on", () => {
    let run = startRun(twoStepPlan());
    run = reportStep(run, { cleared: 1, total: 2, missedMcqIds: ["q"] });
    expect(run.phase).toBe("content");
    run = reportStep(run, { cleared: 2, total: 2 });
    expect(run.phase).toBe("recycle");
    expect(challengeOutcome(reportRecycle(run, 1, 1))).toBeNull();
  });

  it("a miss in a Challenge ends the run at that step, with no recycle queued", () => {
    let run = startRun(twoStepPlan(), "challenge");
    run = reportStep(run, { cleared: 1, total: 2, missedMcqIds: ["q"] });
    expect(run.phase).toBe("reward");
    expect(run.missedMcqIds).toEqual([]);
    expect(challengeOutcome(run)).toBe("failed");
    // A late report from the step that never played changes nothing.
    expect(reportStep(run, { cleared: 2, total: 2 })).toBe(run);
  });

  it("passes only when every step played and every beat in it cleared", () => {
    let run = startRun(twoStepPlan(), "challenge");
    run = reportStep(run, { cleared: 2, total: 2 });
    expect(run.phase).toBe("content");
    expect(challengeOutcome(run)).toBeNull();
    run = reportStep(run, { cleared: 3, total: 3 });
    expect(run.phase).toBe("reward");
    expect(challengeOutcome(run)).toBe("passed");
  });

  it("a miss on the LAST step is still a fail, not a pass that skipped the recycle", () => {
    let run = startRun(twoStepPlan(), "challenge");
    run = reportStep(run, { cleared: 2, total: 2 });
    run = reportStep(run, { cleared: 2, total: 3 });
    expect(challengeOutcome(run)).toBe("failed");
  });

  it("plays the node's own plan: the Challenge asks nothing Practice does not", () => {
    const plan = planLesson("u1-kvt")!;
    expect(startRun(plan, "challenge").plan).toBe(plan);
  });
});

describe("which nodes have a Challenge", () => {
  it("is the same answer read off the map as read off the authored content, for every playable node", () => {
    const nodes = [...PATHWAY_UNITS.flatMap((unit) => unit.nodes), ...PATHWAY_UNITS.map((unit) => unitCheckpointNode(unit))];
    for (const node of nodes) {
      // A node the map gives no playable link has no Practice door, so it can
      // have no Challenge door either, whatever content happens to be authored
      // under its id (u6-ir has a match board the map does not link yet).
      if (node.playable === undefined) {
        expect(hasChallengeRun(node), node.id).toBe(false);
        continue;
      }
      expect(hasChallengeRun(node), node.id).toBe(challengeable(node.id));
    }
  });

  it("gives Unit 1's beat lesson a Challenge and its trainer lessons and checkpoint none", () => {
    expect(challengeable("u1-kvt")).toBe(true);
    for (const id of ["u1-allylic", "u1-12v14", "u1-x2"]) expect(challengeable(id), id).toBe(false);
    expect(hasChallengeRun(unitCheckpointNode(PATHWAY_UNITS[0]!))).toBe(false);
  });
});

describe("the Challenge link", () => {
  it("is the node's lesson route with the challenge flag inside the hash", () => {
    const href = hrefForChallenge("u1-kvt");
    expect(parseHash(href)).toEqual({ kind: "lesson", node: "u1-kvt" });
    expect(new URLSearchParams(href.slice(href.indexOf("?") + 1)).get(CHALLENGE_PARAM)).toBe("1");
  });
});

describe("the money flows end to end through the real store", () => {
  /*
   * The store the app uses, not a fake: createLocalProgress runs in node with
   * no storage (its load and save catch that), and every number below is read
   * back from the snapshot the economy derived, never computed here.
   */
  function clearedKvt() {
    const store = createLocalProgress();
    store.reset();
    store.startNode("u1-kvt", "concept");
    store.clearNode("u1-kvt", "concept", { spine: true });
    return store;
  }

  it("charges the node's own price on entry to the Challenge", () => {
    const store = clearedKvt();
    const before = store.getSnapshot().economy.charge.current;
    store.startNode("u1-kvt", "concept");
    expect(before - store.getSnapshot().economy.charge.current).toBe(CHARGE_COST.concept);
  });

  it("a pass journals challenge_passed and moves the diamond balance", () => {
    const store = clearedKvt();
    store.startNode("u1-kvt", "concept");
    const before = store.getSnapshot().economy.diamonds.balance;
    const paid = store.passChallenge("u1-kvt");
    const after = store.getSnapshot();
    expect(after.journal.at(-1)).toMatchObject({ kind: "challenge_passed", nodeId: "u1-kvt" });
    expect(paid).toBeGreaterThan(0);
    expect(after.economy.diamonds.balance - before).toBe(paid);
  });

  it("a fail journals nothing after the entry and pays nothing", () => {
    const store = clearedKvt();
    store.startNode("u1-kvt", "concept");
    const { journal, economy } = store.getSnapshot();
    expect(journal.at(-1)?.kind).toBe("node_started");
    expect(journal.some((event) => event.kind === "challenge_passed")).toBe(false);
    expect(economy.diamonds.balance).toBe(clearedKvt().getSnapshot().economy.diamonds.balance);
  });

  it("pays nothing for a pass on a node never cleared", () => {
    const store = createLocalProgress();
    store.reset();
    store.startNode("u1-kvt", "concept");
    expect(store.passChallenge("u1-kvt")).toBe(0);
    expect(store.getSnapshot().economy.diamonds.balance).toBe(0);
  });
});

describe("the screens call the money rather than computing it", () => {
  const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

  it("BeatRunner banks a pass through the store and names no price", () => {
    const src = read("../beats/BeatRunner.tsx");
    expect(src).toMatch(/\bpassChallenge\s*\(/);
    expect(src).not.toMatch(/XP_CHALLENGE_PASSED|DIAMONDS_CHALLENGE_PASSED|DIAMONDS_REVIEW_CLEARED/);
  });

  it("the pathway sends the Challenge card through the charge gate to the Challenge run", () => {
    const src = read("../tabs/pathway/PathwayTab.tsx");
    expect(src).toMatch(/onChallenge=\{[\s\S]{0,200}hrefForChallenge\(/);
  });
});

describe("the charge sheet in front of a Challenge", () => {
  const door = { id: "u1-kvt", kind: "concept" as const, title: "Kinetic vs thermodynamic control", href: hrefForChallenge("u1-kvt") };
  const now = "2026-08-28T14:00:00.000Z";

  it("charges the same price as Practice, and does not promise retries it will not give", () => {
    const practice = chargeGateModel(deriveEconomy([], now), { ...door, href: "#/app/lesson/u1-kvt" });
    const challenge = chargeGateModel(deriveEconomy([], now), { ...door, challenge: true });
    expect(challenge.cost).toBe(practice.cost);
    expect(challenge.cost).toBe(CHARGE_COST.concept);
    // Rule 2 of the charge section still holds and is still said.
    expect(challenge.promise).toContain("Wrong answers cost nothing");
    expect(challenge.promise).not.toMatch(/as many tries/i);
    expect(challenge.promise).toMatch(/miss ends the run/);
    expect(challenge.promise).not.toMatch(/lost|lose|penalt/i);
    // And no refund is promised: nothing pays one.
    expect(challenge.line).not.toMatch(/come back/i);
  });
});
