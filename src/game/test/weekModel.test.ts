import { describe, expect, it } from "vitest";
import { weekXp } from "../tabs/leaderboards/weekModel";

describe("this week's XP for the league card", () => {
  it("runs Monday to Sunday, marks today, and leaves later days empty", () => {
    // 2026-10-14 is a Wednesday.
    const { days, total } = weekXp([], Date.parse("2026-10-14T15:00:00Z"), "UTC");
    expect(days.map((day) => day.letter).join("")).toBe("MTWTFSS");
    expect(days[0]!.date).toBe("2026-10-12");
    expect(days[2]!.isToday).toBe(true);
    expect(days.filter((day) => day.ahead).map((day) => day.date)).toEqual(["2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
    expect(total).toBe(0);
  });

  it("puts a Sunday at the end of its own week, not the start of the next", () => {
    const { days } = weekXp([], Date.parse("2026-10-18T12:00:00Z"), "UTC");
    expect(days[6]!.isToday).toBe(true);
    expect(days.some((day) => day.ahead)).toBe(false);
  });
});
