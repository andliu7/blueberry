import { describe, expect, it } from "vitest";
import type { Receipt } from "@blueberry/economy";
import { liveCelebration, formatElapsed, daysSince } from "../lesson/celebrationLive";

function receipt(over: Partial<Receipt> = {}, flawless = false): Receipt {
  return {
    xp: [{ label: "First clear", amount: 10 }, ...(flawless ? [{ label: "Flawless", amount: 5 }] : [])],
    diamonds: [], charge: { delta: 0 },
    streak: { counted: true, current: 3 },
    mastery: { visibleBefore: 0, visibleAfter: 0, rankUp: null },
    chestsEarned: [], questsCompleted: [], ...over,
  } as Receipt;
}
const base = { correct: 7, attempted: 8, elapsedMs: 192000, stageBefore: 2, stageAfter: 2, totalXp: 100, toNextStage: 50 };

describe("liveCelebration", () => {
  it("a plain clear gets the lesson page with real tiles", () => {
    const c = liveCelebration({ ...base, receipt: receipt() });
    expect(c.id).toBe("lesson");
    expect(c.tiles.map((t) => t.label)).toEqual(["Total XP", "Good", "Time"]);
    expect(c.tiles[2]!.value).toBe("3:12");
  });
  it("first lesson today gets the first page with the real streak", () => {
    const c = liveCelebration({ ...base, receipt: receipt(), firstToday: true, daysAway: 1 });
    expect(c.id).toBe("first");
    expect(c.tiles[0]!.value).toBe("3");
    expect(c.count.to).toBe(3);
  });
  it("three or more days away is a comeback", () => {
    const c = liveCelebration({ ...base, receipt: receipt(), firstToday: true, daysAway: 5 });
    expect(c.id).toBe("comeback");
    expect(c.tiles[0]!.value).toBe("5 days");
  });
  it("a finished unit opens the next one", () => {
    const c = liveCelebration({ ...base, correct: 0, attempted: 0, receipt: receipt(), unit: { number: 1, lessons: 7, total: 7, nextNumber: 2 } });
    expect(c.id).toBe("unit");
    expect(c.title).toBe("Unit 2 is open");
    expect(c.cta).toBe("Start Unit 2");
  });
  it("the miss page only promises review when misses were queued", () => {
    const miss = { ...base, correct: 3, attempted: 8, receipt: receipt() };
    expect(liveCelebration({ ...miss, missesQueued: true }).line).toContain("review");
    const plain = liveCelebration(miss);
    expect(plain.line).not.toContain("review");
    expect(plain.tiles[2]!.label).toBe("Missed");
  });
  it("counts days between dates", () => { expect(daysSince("2026-10-01", "2026-10-05")).toBe(4); });
  it("level up uses real stage numbers", () => {
    const c = liveCelebration({ ...base, receipt: receipt(), stageAfter: 3 })!;
    expect(c.id).toBe("level");
    expect(c.title).toBe("Level 3");
    expect(c.tiles[1]!.value).toBe("100");
    expect(c.count.to).toBe(3);
  });
  it("streak milestone beats perfect", () => {
    const c = liveCelebration({ ...base, receipt: receipt({ streak: { counted: true, current: 30, milestone: 30 } }, true) })!;
    expect(c.id).toBe("streak");
    expect(c.count.to).toBe(30);
  });
  it("perfect shows real xp and time", () => {
    const c = liveCelebration({ ...base, correct: 8, receipt: receipt({}, true) })!;
    expect(c.id).toBe("perfect");
    expect(c.tiles[0]!.value).toBe("15");
    expect(c.tiles[2]!.value).toBe("3:12");
  });
  it("hard miss is gentle and counts the misses", () => {
    const c = liveCelebration({ ...base, correct: 3, attempted: 8, receipt: receipt() })!;
    expect(c.id).toBe("miss");
    expect(c.tiles[2]!.value).toBe("5");
  });
  it("formats time", () => { expect(formatElapsed(65000)).toBe("1:05"); });
});
