/** The difficulty rules R1 to R6 pinned across Units 1 to 3, and the words the staff slideshow prints. */
import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { adviceForNode, DIFFICULTY_RULES } from "../beats/difficulty";
import { paceFor, unitIdForNode } from "../beats/pace";
import { CHAIN_LINKS, chainTeacherOf } from "../content/lessonChain";
import { U0_PRIMERS } from "../content/u1/primers";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { guidebookFor } from "../pathway-sheet/guidebookContent";

let clock = 0;
const at = () => new Date(Date.UTC(2026, 9, 1, 12, 0, clock++)).toISOString();
const clear = (nodeId: string, flawless: boolean, cleared?: number, steps = 4): EconomyEvent => ({
  kind: "node_cleared", at: at(), tz: "America/New_York", nodeId, nodeKind: "concept", flawless,
  stepsInOneSitting: steps, spine: true, difficulty: 2, ...(cleared !== undefined ? { cleared } : {}),
});
const tap = (nodeId: string, rating: "too_easy" | "about_right" | "too_hard"): EconomyEvent => ({
  kind: "lesson_rated", at: at(), tz: "America/New_York", nodeId, rating,
});

/** A node whose clears count toward pace (a trainer lesson reports solves only). */
function countingNode(unitId: string, not: readonly string[] = []): string {
  const unit = PATHWAY_UNITS.find((u) => u.id === unitId)!;
  const node = unit.nodes.find((n) => !not.includes(n.id) && paceFor([clear(n.id, true), clear(n.id, true)], unitId) === 1);
  if (node === undefined) throw new Error(`no counting node in ${unitId}`);
  return node.id;
}

describe.each(["u1", "u2", "u3"])("pace rules R1 to R4 in %s", (unitId) => {
  const n = countingNode(unitId);
  it("R2: one flawless clear is not enough, two make it harder", () => {
    expect(paceFor([clear(n, true)], unitId)).toBe(0);
    expect(paceFor([clear(n, true), clear(n, true)], unitId)).toBe(1);
  });
  it("R3: under half is easier, exactly half is not", () => {
    expect(paceFor([clear(n, false, 1)], unitId)).toBe(-1);
    expect(paceFor([clear(n, false, 2)], unitId)).toBe(0);
  });
  it("R4: mixed settles at 0 from either side, and no count is never rough", () => {
    expect(paceFor([clear(n, true), clear(n, true), clear(n, false, 3)], unitId)).toBe(0);
    expect(paceFor([clear(n, false, 1), clear(n, false, 3)], unitId)).toBe(0);
    expect(paceFor([clear(n, false)], unitId)).toBe(0);
  });
  it("R2: one flawless lifts easier to as written", () => {
    expect(paceFor([clear(n, false, 1), clear(n, true)], unitId)).toBe(0);
  });
  it("R1: a tap wins and restarts the flawless count", () => {
    expect(paceFor([clear(n, true), clear(n, true), tap(n, "too_hard")], unitId)).toBe(-1);
    expect(paceFor([clear(n, false, 1), tap(n, "too_easy")], unitId)).toBe(1);
    expect(paceFor([clear(n, true), tap(n, "about_right"), clear(n, true)], unitId)).toBe(0);
  });
});

describe("units do not leak into each other", () => {
  it("clears in one unit leave the others at 0", () => {
    const journal = [clear(countingNode("u1"), true), clear(countingNode("u1"), true)];
    expect(paceFor(journal, "u1")).toBe(1);
    expect(paceFor(journal, "u2")).toBe(0);
    expect(paceFor(journal, "u3")).toBe(0);
  });
});

describe("the lesson chain in Units 1 to 3", () => {
  const lessons = Object.keys(CHAIN_LINKS).filter((id) => ["u1", "u2", "u3"].includes(unitIdForNode(id) ?? ""));
  it("covers lessons in all three units", () => {
    for (const u of ["u1", "u2", "u3"]) expect(lessons.some((id) => unitIdForNode(id) === u)).toBe(true);
  });
  it("R6: two rough clears of any chain lesson make it easier with help offered", () => {
    for (const id of lessons) {
      const advice = adviceForNode([clear(id, false, 1), clear(id, false, 1)], id);
      expect(advice, id).toMatchObject({ pace: -1, direction: "easier", stuck: true });
    }
  });
  it("R5: a weak prerequisite holds a harder lesson at as written, for every prerequisite edge", () => {
    let edges = 0;
    for (const id of lessons) {
      const unitId = unitIdForNode(id)!;
      for (const concept of CHAIN_LINKS[id]!.assumes) {
        const teacher = chainTeacherOf(concept);
        if (teacher === null || teacher === id) continue;
        edges += 1;
        const n = countingNode(unitId, [teacher, id]);
        const journal = [clear(teacher, false, 2), clear(n, true), clear(n, true)];
        // Only prove the cap when nothing but R5 was holding the lesson back.
        const base = paceFor(journal, unitId);
        const advice = adviceForNode(journal, id);
        expect(advice.weakPrerequisites, `${id} <- ${teacher}`).toContain(teacher);
        expect(advice.pace, `${id} <- ${teacher}`).toBe(base === 1 ? 0 : base);
        expect(advice.pace).toBeLessThanOrEqual(0);
      }
    }
    expect(edges).toBeGreaterThan(20);
  });
  it("R5 reaches back across units", () => {
    const cross = lessons.find((id) => CHAIN_LINKS[id]!.assumes.some((c) => { const t = chainTeacherOf(c); return t !== null && unitIdForNode(t) !== unitIdForNode(id); }));
    expect(cross).toBeDefined();
  });
});

describe("the rules as shown to staff", () => {
  it("names R1 to R6 once each, with the numbers the code uses", () => {
    expect(DIFFICULTY_RULES.map((r) => r.id)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6"]);
    const text = (id: string) => DIFFICULTY_RULES.find((r) => r.id === id)!.text;
    expect(text("R2")).toContain("2 flawless");
    expect(text("R3")).toContain("50%");
    expect(text("R5")).toContain("75%");
    expect(text("R6")).toContain("2 clears");
  });
});

describe("Unit 1 context for students without the background", () => {
  it("every Unit 0 idea Units 1 to 3 assume has a primer", () => {
    const missing = new Set<string>();
    for (const link of Object.values(CHAIN_LINKS)) for (const c of link.assumes) if (c.startsWith("u0:") && U0_PRIMERS[c] === undefined) missing.add(c);
    expect([...missing]).toEqual([]);
  });
  it("primers are plain prose with no em dash", () => {
    for (const p of Object.values(U0_PRIMERS)) {
      expect(p.text.length).toBeGreaterThan(80);
      expect(p.text + p.title).not.toContain("\u2014");
    }
  });
  it("the Unit 1 guidebook for a lesson that assumes Unit 0 carries its primers", () => {
    const unit = PATHWAY_UNITS.find((u) => u.id === "u1")!;
    const node = unit.nodes.find((x) => x.id === "u1-allylic")!;
    const titles = guidebookFor({ id: node.id, title: node.title, blurb: node.blurb, kind: node.kind } as never).context.map((c) => c.title);
    // CHANGED 3 Nov (Unit 1 review L5): u1-allylic asks for butadiene's protonation, so it assumes u0:hx-addition too.
    expect(titles).toEqual(["Resonance and curved arrows", "What a carbocation is", "HX adding across a C=C"]);
  });
});
