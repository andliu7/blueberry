/**
 * The Me tab's numbers. Round 3's profile contradicted itself ("32 lessons
 * closed" beside "0 active days") because two figures read two sources. These
 * tests pin the one-source rule: every figure comes from the real journal and
 * the economy derived from it, and the beta preview's epoch events never count.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, type EconomyEvent } from "@blueberry/economy";
import {
  activeCount,
  badgesFor,
  goalOptions,
  joinedLabel,
  lastSevenDaysXp,
  monthGrid,
  realJournal,
  shiftMonth,
  examDateFrom,
  goalDaysInMonth,
  studyDays,
} from "../tabs/me/meModel";

const TZ = "UTC";

function clear(at: string, nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared",
    at,
    tz: TZ,
    nodeId,
    nodeKind: "concept",
    flawless: false,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  };
}

const EPOCH = "1970-01-01T00:00:00.000Z";

describe("realJournal", () => {
  it("drops the beta preview's epoch stamped events and keeps real ones", () => {
    const journal = [clear(EPOCH, "preview"), clear("2026-10-14T10:00:00.000Z", "a")];
    expect(realJournal(journal).map((e) => (e.kind === "node_cleared" ? e.nodeId : ""))).toEqual(["a"]);
  });
});

describe("joinedLabel", () => {
  it("names the month of the first real event and ignores previews", () => {
    expect(joinedLabel([clear(EPOCH, "p"), clear("2026-09-03T10:00:00.000Z", "a")])).toBe("Joined September 2026");
  });
  it("is null for a journal with only previews", () => {
    expect(joinedLabel([clear(EPOCH, "p")])).toBeNull();
  });
});

describe("lastSevenDaysXp", () => {
  const now = Date.parse("2026-10-16T15:00:00.000Z");
  const journal = [
    clear(EPOCH, "preview-1"),
    clear("2026-10-14T10:00:00.000Z", "a"),
    clear("2026-10-16T09:00:00.000Z", "b"),
    clear("2026-10-16T09:30:00.000Z", "c"),
  ];
  const days = lastSevenDaysXp(journal, TZ, now);

  it("returns seven days ending today, oldest first", () => {
    expect(days).toHaveLength(7);
    expect(days[6]?.date).toBe("2026-10-16");
    expect(days[6]?.today).toBe(true);
    expect(days[0]?.date).toBe("2026-10-10");
  });

  it("puts XP only on the days the student studied", () => {
    expect(days.filter((d) => d.xp > 0).map((d) => d.date)).toEqual(["2026-10-14", "2026-10-16"]);
  });

  it("today's bar equals the economy's own xp.today, so the chart and the header agree", () => {
    const economy = deriveEconomy(realJournal(journal), new Date(now).toISOString());
    expect(days[6]?.xp).toBe(economy.xp.today);
  });

  it("the week sums to the real total, so preview events add nothing", () => {
    const economy = deriveEconomy(realJournal(journal), new Date(now).toISOString());
    expect(days.reduce((sum, d) => sum + d.xp, 0)).toBe(economy.xp.total);
  });
});

describe("monthGrid", () => {
  it("lays October 2026 out Monday first with the 1st on a Thursday", () => {
    const weeks = monthGrid("2026-10", ["2026-10-14"], "2026-10-16");
    expect(weeks[0]?.slice(0, 3).every((cell) => cell.date === null)).toBe(true);
    expect(weeks[0]?.[3]?.date).toBe("2026-10-01");
    const cells = weeks.flat().filter((cell) => cell.date !== null);
    expect(cells).toHaveLength(31);
    expect(cells.find((c) => c.date === "2026-10-14")?.active).toBe(true);
    expect(cells.find((c) => c.date === "2026-10-16")?.today).toBe(true);
    expect(cells.find((c) => c.date === "2026-10-17")?.future).toBe(true);
  });

  it("shifts months across a year boundary", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("counts active days inside the month only", () => {
    expect(activeCount("2026-10", ["2026-09-30", "2026-10-01", "2026-10-02"])).toBe(2);
  });
});

describe("badgesFor", () => {
  it("reads every level from the same economy, with previews excluded", () => {
    const journal = [clear(EPOCH, "preview"), clear("2026-10-14T10:00:00.000Z", "a")];
    const economy = deriveEconomy(realJournal(journal), "2026-10-16T15:00:00.000Z");
    const badges = badgesFor(economy, journal);
    const clears = badges.find((b) => b.id === "clears");
    expect(clears?.level).toBe(1);
    expect(clears?.target).toBe(5);
    expect(badges.find((b) => b.id === "cards")?.level).toBe(0);
    expect(badges.find((b) => b.id === "rank")?.title).toBe(economy.mastery.floorRank);
  });

  it("labels the streak badge as the best streak, so it never reads as today's", () => {
    const journal = [clear("2026-10-14T10:00:00.000Z", "a")];
    const economy = deriveEconomy(realJournal(journal), "2026-10-16T15:00:00.000Z");
    const streak = badgesFor(economy, journal).find((b) => b.id === "streak");
    expect(streak?.countLabel).toBe("Best");
    expect(streak?.value).toBe(Math.min(economy.streak.best, streak?.target ?? 0));
    expect(streak?.line).toContain(`Best streak ${economy.streak.best}`);
    expect(badgesFor(economy, journal).filter((b) => b.id !== "streak").every((b) => b.countLabel === "")).toBe(true);
  });
});

describe("goalOptions", () => {
  it("offers exam mode only inside the exam window", () => {
    expect(goalOptions(false).map((o) => o.tier)).toEqual(["casual", "regular", "serious"]);
    expect(goalOptions(true).map((o) => o.tier)).toContain("exam");
  });
});

describe("examDateFrom and studyDays", () => {
  const settings = (at: string, examDate: string | null): EconomyEvent => ({ kind: "settings", at, tz: TZ, examDate });
  it("reads the last saved exam date, including a cleared one", () => {
    expect(examDateFrom([settings("2026-10-01T10:00:00.000Z", "2026-12-10")])).toBe("2026-12-10");
    expect(examDateFrom([settings("2026-10-01T10:00:00.000Z", "2026-12-10"), settings("2026-10-02T10:00:00.000Z", null)])).toBeNull();
  });
  it("counts studying days only: no previews, no settings changes", () => {
    const journal = [clear(EPOCH, "p"), settings("2026-10-02T10:00:00.000Z", null), clear("2026-10-14T10:00:00.000Z", "a")];
    expect(studyDays(journal)).toEqual(["2026-10-14"]);
  });
});

describe("goalDaysInMonth", () => {
  it("marks only days whose goal was met, so the calendar agrees with the streak", () => {
    const now = Date.parse("2026-10-16T15:00:00.000Z");
    const journal = [
      clear("2026-10-14T10:00:00.000Z", "a"),
      clear("2026-10-15T10:00:00.000Z", "b"),
      clear("2026-10-15T10:30:00.000Z", "c"),
      clear("2026-10-15T11:00:00.000Z", "d"),
    ];
    const met = goalDaysInMonth(journal, TZ, "2026-10", now);
    for (const date of met) {
      const cut = Date.parse(`${date}T23:59:59.999Z`);
      const economy = deriveEconomy(journal.filter((e) => Date.parse(e.at) <= cut), new Date(cut).toISOString());
      expect(economy.xp.goalMet).toBe(true);
    }
    // One clear on the 14th is under the regular 20 XP goal; three on the 15th are over it.
    expect([...met]).toEqual(["2026-10-15"]);
    expect(met.has("2026-10-16")).toBe(false);
  });
});
