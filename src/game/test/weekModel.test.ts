import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { weekModel } from "../tabs/feed/weekModel";

const NOW = "2026-08-28T14:00:00.000Z"; // a Friday

function clear(day: string, nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared", at: `${day}T12:00:00.000Z`, tz: "UTC", nodeId, nodeKind: "concept",
    flawless: false, stepsInOneSitting: 1, spine: false, difficulty: 2,
  };
}

describe("weekModel", () => {
  it("an empty journal is an honest empty week, Sunday to Saturday", () => {
    const week = weekModel([], NOW);
    expect(week.empty).toBe(true);
    expect(week.days.map((d) => d.letter).join("")).toBe("SMTWTFS");
    expect(week.days[5]?.today).toBe(true);
    expect(week.days[6]?.kind).toBe("future");
  });

  it("counts this week's clears and ignores last week's", () => {
    const week = weekModel([clear("2026-08-20", "a:1"), clear("2026-08-26", "a:2"), clear("2026-08-28", "a:3")], NOW);
    expect(week.lessons).toBe(2);
    expect(week.empty).toBe(false);
  });
});
