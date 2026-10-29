import { describe, expect, it } from "vitest";
import { nextTask, nudgeTask, placeTask, SEED_TASKS } from "../admin/TaskBoard";

const ids = (c: string) => SEED_TASKS.filter((t) => t.column === c).map((t) => t.id);

describe("task board ordering", () => {
  it("drops a card before another, in another column", () => {
    const out = placeTask(SEED_TASKS, "t2", "doing", "t9");
    const doing = out.filter((t) => t.column === "doing").map((t) => t.id);
    expect(doing.indexOf("t2")).toBe(doing.indexOf("t9") - 1);
  });
  it("drops last when there is no target", () => {
    const out = placeTask(SEED_TASKS, "t2", "done", null);
    expect(out.filter((t) => t.column === "done").at(-1)!.id).toBe("t2");
    expect(out.length).toBe(SEED_TASKS.length);
  });
  it("nudges inside a column and stops at the ends", () => {
    const first = ids("todo")[0]!;
    expect(nudgeTask(SEED_TASKS, first, -1).map((t) => t.id)).toEqual(SEED_TASKS.map((t) => t.id));
    const out = nudgeTask(SEED_TASKS, first, 1).filter((t) => t.column === "todo").map((t) => t.id);
    expect(out[1]).toBe(first);
  });
  it("gives every seed card a number", () => {
    expect(SEED_TASKS.every((t) => typeof t.num === "number")).toBe(true);
  });
  it("picks the most urgent To do card as next, first among equals", () => {
    expect(nextTask(SEED_TASKS)!.id).toBe("t4");
    const out = SEED_TASKS.map((t) => (t.id === "t4" ? { ...t, column: "done" as const } : t));
    expect(nextTask(out)!.id).toBe("t3");
    expect(nextTask([])).toBeNull();
  });
});

import { withNewSeeds } from "../admin/TaskBoard";
import { PROJECTS, nodeStatus, projectProgress } from "../admin/gauntletProjects";

describe("new seed cards", () => {
  it("adds only seeds this browser has not seen, with fresh numbers, and never brings back a deleted one", () => {
    const old = SEED_TASKS.slice(0, 21).filter((t) => t.id !== "t5");
    const seen = SEED_TASKS.slice(0, 21).map((t) => t.id);
    const out = withNewSeeds(old, seen);
    expect(out.tasks.some((t) => t.id === "t5")).toBe(false);
    expect(out.tasks.filter((t) => t.id > "t21" && /^t(2[2-9]|3\d)$/.test(t.id))).toHaveLength(10);
    expect(new Set(out.tasks.map((t) => t.num)).size).toBe(out.tasks.length);
  });
});

describe("gauntlet projects", () => {
  const st = (p: { status: "todo" | "doing" | "done" | "stuck" }) => p.status;
  it("lists the overnight run as a project with the audit and three waves as nodes", () => {
    const run = PROJECTS.find((p) => p.id === "overnight-units")!;
    expect(run.nodes.map((n) => n.id)).toEqual(["audit", "wave-1", "wave-2", "wave-3"]);
    expect(projectProgress(run, st).total).toBe(15);
  });
  it("marks a node doing once any piece starts, stuck on an open gap, done when all won", () => {
    const [audit, , , ] = PROJECTS[0]!.nodes;
    expect(nodeStatus(audit!, st)).toBe("doing");
    expect(nodeStatus({ ...audit!, pieces: audit!.pieces.map((p) => ({ ...p, status: "done" as const })) }, st)).toBe("done");
    expect(nodeStatus(PROJECTS[1]!.nodes[1]!, st)).toBe("stuck");
  });
});
