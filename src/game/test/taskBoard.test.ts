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
