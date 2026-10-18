/**
 * Save as you go, round 3: the save has to be TOLD, not only kept.
 *
 * The critic's gap after round 2: the save worked, but nothing said so at the
 * moments a student decides. This suite pins the words and numbers behind
 * those moments:
 *   - START OVER's sheet names what it erases in its headline, and its keys say
 *     what each one does to the save (restartCopy.ts);
 *   - the sheet with nothing to start (empty charge) is left alone, because
 *     nothing is erased there;
 *   - the half-done ring on the path reads the bar the lesson saved, and a
 *     practice run's fill comes from answered over answered plus left
 *     (savedBar in lessonSave.ts).
 */

import { describe, expect, it } from "vitest";
import { CHARGE_CAP, CHARGE_COST, deriveEconomy, type EconomyEvent } from "@blueberry/economy";

import { planLesson, startRun, reportStep } from "../beats/template";
import { chargeGateModel, type ChargeGateNode } from "../charge/chargeGateModel";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { restartCopy } from "../resume/restartCopy";
import { saveLesson, savedBar, saveKey, savePractice, type SaveStorage } from "../resume/lessonSave";
import { answerProblem, startPracticeRun } from "../beats/practice/run";

const NOW = "2026-10-17T14:00:00.000Z";
const NODE: ChargeGateNode = { id: "u1-allylic", kind: "concept", title: "Allylic/resonance delocalization", href: "#/app/lesson/u1-allylic" };

function memoryStorage(): SaveStorage & { readonly map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

describe("START OVER's sheet names the loss", () => {
  it("says what is erased, keeps the price, and labels both keys by what they do to the save", () => {
    const fresh = chargeGateModel(deriveEconomy([], NOW), NODE);
    expect(fresh.state).toBe("ready");
    const sheet = restartCopy(fresh, "4 saved questions");
    expect(sheet.headline).toBe("Start over and erase 4 saved questions?");
    expect(sheet.line).toContain(`${fresh.cost} charge`);
    expect(sheet.line).toContain("can't be undone");
    expect(sheet.primaryLabel).toBe("Erase and start over");
    expect(sheet.dismissLabel).toBe("Keep my progress");
    expect(sheet.label).toContain("erase 4 saved questions");
    // The price itself is untouched: only the words change.
    expect(sheet.cost).toBe(fresh.cost);
    expect(sheet.after).toBe(fresh.after);
  });

  it("leaves the empty-charge sheet alone, where nothing is erased", () => {
    const tz = "UTC";
    const journal: EconomyEvent[] = [];
    for (let spent = 0; spent + CHARGE_COST.concept <= CHARGE_CAP; spent += CHARGE_COST.concept) {
      journal.push({ kind: "node_started", at: new Date(Date.parse(NOW) - 60_000).toISOString(), tz, nodeId: `n${spent}`, nodeKind: "concept" });
    }
    const empty = chargeGateModel(deriveEconomy(journal, NOW), NODE);
    expect(empty.state).toBe("empty");
    expect(restartCopy(empty, "4 saved questions")).toBe(empty);
  });
});

describe("the path's half-done ring reads the saved bar", () => {
  const node = PATHWAY_UNITS.flatMap((u) => u.nodes.map((n) => n.id)).find((id) => planLesson(id) !== null)!;

  it("is null with no save, and the saved bar once a question is answered", () => {
    const storage = memoryStorage();
    expect(savedBar(storage, node)).toBeNull();
    const plan = planLesson(node)!;
    const run = reportStep(startRun(plan, "practice"), { cleared: 2, total: 3 });
    saveLesson(storage, node, run, null, undefined, 3, { bar: 0.4 });
    expect(savedBar(storage, node)).toBeCloseTo(0.4);
  });

  it("never draws an empty or a full ring for a half-done lesson", () => {
    const storage = memoryStorage();
    const plan = planLesson(node)!;
    const run = reportStep(startRun(plan, "practice"), { cleared: 1, total: 1 });
    // A save written before the bar was recorded still shows a sliver.
    saveLesson(storage, node, run, null, undefined, 1);
    expect(savedBar(storage, node)).toBeGreaterThan(0);
    saveLesson(storage, node, run, null, undefined, 1, { bar: 1 });
    expect(savedBar(storage, node)).toBeLessThan(1);
  });

  it("fills a practice run by answered over answered plus left", () => {
    const storage = memoryStorage();
    const ids = ["a", "b", "c", "d"];
    let state = startPracticeRun(ids);
    state = answerProblem(state, true);
    savePractice(storage, "u1-practice", ids, state);
    expect(storage.map.has(saveKey("u1-practice"))).toBe(true);
    expect(savedBar(storage, "u1-practice")).toBeCloseTo(1 / 4);
  });
});
