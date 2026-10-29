/**
 * The mistake bank: saved after a lesson, survives a reload, replays, and the
 * why-step gates the practice run.
 */

import { describe, expect, it } from "vitest";
import { createMistakeBank, openMistakes, MISTAKE_CAP, withMisses, type MistakeStorage } from "../mistakes/mistakeBank";
import { canMoveOn, playableFor, practiceQueue, requeueOnMiss } from "../mistakes/practiceModel";
import { missedFromRun, saveLessonMistakes } from "../mistakes/saveLessonMistakes";
import { lessonMcqBeats, planLesson, reportStep, startRun } from "../beats/template";

function memory(): MistakeStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

function nodeWithMcq(): { node: string; id: string } {
  // A lesson known to carry multiple-choice beats (the earlier search over the pathway never matched, so this was always the answer).
  const beat = lessonMcqBeats("u3-directing")[0]!;
  return { node: "u3-directing", id: beat.id };
}

describe("mistake bank", () => {
  it("saves a miss, survives a reload, and counts repeats", () => {
    const store = memory();
    const bank = createMistakeBank(store, () => "2026-10-29T10:00:00Z");
    bank.record([{ id: "q1", kind: "mcq", node: "n" }]);
    bank.record([{ id: "q1", kind: "mcq", node: "n" }, { id: "q2", kind: "draw", node: "n" }]);
    const reloaded = createMistakeBank(store);
    expect(reloaded.getSnapshot().entries.map((e) => [e.id, e.misses])).toEqual([["q1", 2], ["q2", 1]]);
  });

  it("replaces the snapshot on every write", () => {
    const bank = createMistakeBank(null);
    const before = bank.getSnapshot();
    let calls = 0;
    bank.subscribe(() => calls++);
    bank.record([{ id: "a", kind: "mcq", node: "n" }]);
    expect(bank.getSnapshot()).not.toBe(before);
    expect(calls).toBe(1);
  });

  it("closes a row when fixed, reopens it on a new miss, and keeps the why", () => {
    const bank = createMistakeBank(null);
    bank.record([{ id: "a", kind: "mcq", node: "n" }]);
    bank.setWhy("mcq:a", "rushed");
    bank.markFixed("mcq:a");
    expect(openMistakes(bank.getSnapshot())).toHaveLength(0);
    bank.record([{ id: "a", kind: "mcq", node: "n" }]);
    const [row] = openMistakes(bank.getSnapshot());
    expect(row?.why).toBe("rushed");
    expect(row?.misses).toBe(2);
  });

  it("caps the bank, dropping the oldest", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, kind: "mcq" as const, node: "n" }));
    const rows = withMisses([], many, "t", 3);
    expect(rows.map((r) => r.id)).toEqual(["q2", "q3", "q4"]);
    expect(MISTAKE_CAP).toBeGreaterThan(50);
  });

  it("ignores broken storage", () => {
    const bad: MistakeStorage = { getItem: () => "{not json", setItem: () => { throw new Error("full"); } };
    const bank = createMistakeBank(bad);
    expect(bank.getSnapshot().entries).toEqual([]);
    expect(() => bank.record([{ id: "a", kind: "mcq", node: "n" }])).not.toThrow();
  });
});

describe("saved after a lesson, replayed in practice", () => {
  it("a run with a missed question lands in the bank and is playable", () => {
    const { node, id } = nodeWithMcq();
    const plan = planLesson(node)!;
    const run = reportStep(startRun(plan), { cleared: 0, total: 1, missedMcqIds: [id] });
    const missed = missedFromRun(run, node);
    expect(missed.map((m) => m.id)).toContain(id);
    const store = memory();
    const bank = createMistakeBank(store);
    saveLessonMistakes(run, node, bank);
    const reloaded = createMistakeBank(store);
    const queue = practiceQueue(reloaded.getSnapshot());
    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0]!.kind).toBe("mcq");
    expect(playableFor(queue[0]!.mistake)).not.toBeNull();
  });

  it("a flawless run saves nothing", () => {
    const { node } = nodeWithMcq();
    const bank = createMistakeBank(null);
    saveLessonMistakes(startRun(planLesson(node)!), node, bank);
    expect(bank.getSnapshot().entries).toEqual([]);
  });
});

describe("the why step", () => {
  it("blocks moving on after a miss until a reason is chosen", () => {
    expect(canMoveOn(true, null)).toBe(false);
    expect(canMoveOn(true, "guessed")).toBe(true);
    expect(canMoveOn(false, null)).toBe(true);
  });

  it("brings a missed question back once, no more", () => {
    const { node, id } = nodeWithMcq();
    const bank = createMistakeBank(null);
    bank.record([{ id, kind: "mcq", node }]);
    const queue = practiceQueue(bank.getSnapshot());
    const again = requeueOnMiss(queue, 0, new Set());
    expect(again).toHaveLength(queue.length + 1);
    expect(requeueOnMiss(again, 0, new Set([queue[0]!.mistake.key]))).toHaveLength(again.length);
  });
});
