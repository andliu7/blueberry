/**
 * The Unit 2 tools lessons (content/u2tools, scripts/u2_tools_pools.py), a draft.
 * Pins: every lesson plans, every entry is a draft with an explanation and provenance,
 * every MCQ has a drawing, ids are unique across the pools, and the first Unit 2 lesson is open.
 */
import { describe, expect, it } from "vitest";
import { U2T_POOLS, U2T_VISUALS } from "../content/u2tools";
import { U2_POOLS } from "../content/u2";
import { pathwayNode } from "../demo/pathwayMap";
import { planLesson } from "../beats/template";
import { practicePool } from "../beats/practice/pools";
import { mcqVisualFor } from "../beats/mcq/mcqFigures";

const LESSONS = ["u2-induction", "u2-keq-pka", "u2-resonance", "u2-ewg-edg"];

describe("Unit 2 tools lessons", () => {
  it("plans a lesson for each, opening on the meet step", () => {
    for (const id of LESSONS) {
      expect(pathwayNode(id), id).not.toBeNull();
      const steps = planLesson(id)?.steps ?? [];
      expect(steps[0]?.slot, id).toBe("hook");
      expect(steps.length, id).toBeGreaterThan(2);
    }
  });

  it("runs the naming priority side quest as an in-a-row set", () => {
    expect(practicePool("u2-nomen-priority")).toEqual(U2T_POOLS["u2-nomen-priority"]);
  });

  it("holds only drafts, each with an explanation and a provenance", () => {
    for (const entries of Object.values(U2T_POOLS)) {
      for (const entry of entries) {
        expect(entry.placeholder, entry.id).toBe(true);
        expect(entry.explanation.length, entry.id).toBeGreaterThan(20);
        expect(entry.provenance, entry.id).toContain("scripts/u2_tools_pools.py");
      }
    }
  });

  it("draws every MCQ and keeps ids unique across Unit 2", () => {
    const ids = new Set<string>();
    for (const entry of Object.values(U2_POOLS).flat()) ids.add(entry.id);
    for (const entry of Object.values(U2T_POOLS).flat()) {
      expect(ids.has(entry.id), `${entry.id} repeats a Unit 2 id`).toBe(false);
      ids.add(entry.id);
      if (entry.item.kind === "mcq") {
        expect(mcqVisualFor(entry.id), entry.id).not.toBeNull();
        expect(U2T_VISUALS[entry.id], entry.id).toBeDefined();
        expect(entry.item.beat.options.every((o) => o.why !== undefined && o.why.length > 0), entry.id).toBe(true);
      }
    }
  });

  it("gives each tools lesson a first-meeting question that cannot fail", () => {
    for (const id of LESSONS) {
      const meets = (U2T_POOLS[id] ?? []).filter((e) => e.item.kind === "mcq" && e.item.beat.levels.every((l) => l === 0));
      expect(meets.length, id).toBeGreaterThanOrEqual(1);
    }
  });
});
