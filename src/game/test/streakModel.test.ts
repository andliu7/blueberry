/**
 * The streak screen's model, against real journals run through the real engine.
 *
 * Nothing here hand builds an EconomySnapshot or a Receipt. Every case is a
 * journal, `deriveEconomy` and `receiptFor`, so a rule that moves in
 * packages/economy shows up here as a failing sentence rather than as a fixture
 * that quietly still passes. Same standard as hudModel.test.ts.
 *
 * The case this file exists for is the third one: a run with a REST DAY inside
 * it. That is the one the naive strip gets wrong, because a rest day bridges a
 * gap without adding to `current`, so counting backwards from the day number
 * lights a square the student did not earn and hides the one the app gave them.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor, type EconomyEvent } from "@blueberry/economy";
import { streakScreenModel } from "../lesson/streakModel";

const TZ = "UTC";
/** A Friday, so the window's yesterday sits in the same ISO week. */
const NOW = "2026-08-28T14:00:00.000Z";

function at(daysAgo: number, hour = 12): string {
  const ms = Date.parse(NOW) - daysAgo * 86_400_000;
  const day = new Date(ms).toISOString().slice(0, 10);
  return `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

/** A concept node's first clear pays 10 XP, which is exactly the Casual goal. */
function clear(daysAgo: number, nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared",
    at: at(daysAgo),
    tz: TZ,
    nodeId,
    nodeKind: "concept",
    flawless: false,
    stepsInOneSitting: 1,
    spine: false,
    difficulty: 2,
  };
}

const CASUAL: EconomyEvent = { kind: "settings", at: at(80), tz: TZ, dailyGoal: "casual" };

/**
 * A history of counted days, and the clear that happens today.
 *
 * `skip` names the days back from today that carry no clear at all, which is
 * how a rest day is produced: the engine, not the fixture, decides that the
 * weekly rest day covered it.
 */
function history(daysBack: number, skip: readonly number[] = [], extra: readonly EconomyEvent[] = []) {
  const before: EconomyEvent[] = [CASUAL, ...extra];
  for (let daysAgo = daysBack; daysAgo >= 1; daysAgo -= 1) {
    if (skip.includes(daysAgo)) continue;
    before.push(clear(daysAgo, `seed:day-${daysAgo}`));
  }
  const today = clear(0, "seed:today");
  return { before, today, journal: [...before, today] };
}

function modelFor(daysBack: number, skip: readonly number[] = [], extra: readonly EconomyEvent[] = [], now = NOW) {
  const { before, today, journal } = history(daysBack, skip, extra);
  const receipt = receiptFor(before, today, now);
  const snapshot = deriveEconomy(journal, now);
  return streakScreenModel({ journal, snapshot, receipt, now });
}

describe("streakScreenModel, an unbroken run", () => {
  const model = modelFor(6);

  it("takes the day number off the receipt", () => {
    expect(model.days).toBe(7);
    expect(model.unit).toBe("day streak");
  });

  it("draws seven days, all of them counted, today last", () => {
    expect(model.week).toHaveLength(7);
    expect(model.week.every((cell) => cell.kind === "counted")).toBe(true);
    expect(model.week[6]?.today).toBe(true);
    expect(model.week.filter((cell) => cell.today)).toHaveLength(1);
  });

  it("names no save, because nothing was saved", () => {
    expect(model.saved).toBeNull();
    expect(model.line).toContain("A free rest day each week is already yours");
  });
});

describe("streakScreenModel, the rest day", () => {
  // 46 counted days behind today with yesterday missing, so today is the 47th.
  const model = modelFor(47, [1]);

  it("counts the run without counting the rest day", () => {
    expect(model.days).toBe(47);
  });

  it("draws the rest day as its own glyph and never as a gap", () => {
    const kinds = model.week.map((cell) => cell.kind);
    expect(kinds).toEqual(["counted", "counted", "counted", "counted", "counted", "rest", "counted"]);
    expect(kinds).not.toContain("missed");
  });

  it("announces it after the fact, in ECONOMY.md's own sentence", () => {
    expect(model.saved).not.toBeNull();
    expect(model.saved?.kind).toBe("rest_day");
    expect(model.saved?.weekday).toBe("Thursday");
    expect(model.line).toBe("Thursday was a rest day. Streak safe at 47.");
  });
});

describe("streakScreenModel, a freeze", () => {
  // Two gaps in one ISO week: the free rest day covers the older one and a
  // held freeze covers the other, which is derive.ts's own priority order.
  const bought: EconomyEvent = { kind: "spend", at: at(10), tz: TZ, sink: "streak_freeze", cost: 75 };
  const model = modelFor(20, [1, 2], [bought]);

  it("keeps the run alive across both", () => {
    expect(model.days).toBe(19);
  });

  it("draws the rest day first and the freeze second, oldest first", () => {
    const kinds = model.week.map((cell) => cell.kind);
    expect(kinds.slice(4)).toEqual(["rest", "freeze", "counted"]);
  });

  it("announces the freeze, because that is what covered the day before today", () => {
    expect(model.saved?.kind).toBe("freeze");
    expect(model.line).toBe("Thursday was covered by a freeze. Streak safe at 19.");
  });

  it("reports the freeze as spent rather than still held", () => {
    expect(model.freezes.held).toBe(0);
  });
});

describe("streakScreenModel, the milestone", () => {
  const model = modelFor(6);

  it("carries the milestone the receipt paid, and what it paid", () => {
    expect(model.milestone?.day).toBe(7);
    expect(model.milestone?.diamonds).toBe(75);
  });

  it("names the next one rather than repeating the number above it", () => {
    expect(model.milestone?.line).toContain("The next milestone is 14");
    expect(model.milestone?.line).not.toMatch(/\b7 day\b/);
  });

  it("has none on a day that is not a milestone", () => {
    expect(modelFor(47, [1]).milestone).toBeNull();
  });
});

describe("streakScreenModel, the freeze inventory", () => {
  it("holds what was bought and not spent, and prices the next one", () => {
    const bought: EconomyEvent = { kind: "spend", at: at(9), tz: TZ, sink: "streak_freeze", cost: 75 };
    const model = modelFor(20, [], [bought]);
    expect(model.freezes.held).toBe(1);
    expect(model.freezes.max).toBe(2);
    expect(model.freezes.cost).toBe(75);
    expect(model.freezes.full).toBe(false);
    // Twenty first clears at 10 diamonds each, less the 75 already spent.
    expect(model.freezes.affordable).toBe(true);
  });

  it("says it is full rather than offering a third", () => {
    const one: EconomyEvent = { kind: "spend", at: at(9), tz: TZ, sink: "streak_freeze", cost: 75 };
    const two: EconomyEvent = { kind: "spend", at: at(8), tz: TZ, sink: "streak_freeze", cost: 75 };
    const model = modelFor(20, [], [one, two]);
    expect(model.freezes.held).toBe(2);
    expect(model.freezes.full).toBe(true);
  });

  it("cannot afford one on a young account, and says so without shaming", () => {
    const model = modelFor(2);
    expect(model.freezes.affordable).toBe(false);
    expect(model.freezes.line).not.toMatch(/afford|cannot|only/i);
  });
});

describe("streakScreenModel, the exam window", () => {
  const exam: EconomyEvent = {
    kind: "settings",
    at: at(20),
    tz: TZ,
    examDate: new Date(Date.parse(NOW) + 9 * 86_400_000).toISOString().slice(0, 10),
  };
  const model = modelFor(6, [], [exam]);

  it("carries the banner with the days left the engine counted", () => {
    expect(model.exam?.daysLeft).toBe(9);
    expect(model.exam?.line).toBe("Exam in 9 days. Opening the app keeps your streak.");
  });

  it("has no banner outside the window", () => {
    expect(modelFor(6).exam).toBeNull();
  });
});

describe("streakScreenModel, the voice", () => {
  /**
   * The one rule this screen exists under. docs/ECONOMY.md's mitigation set and
   * CLAUDE.md's voice rule both say the same thing here: a streak screen may
   * not be built on the fear of losing a number. The bar's own version of this
   * screen ends on "skipping a day resets it!", so this is a check on the
   * finding rather than on the implementation.
   */
  const FORBIDDEN = /\b(lose|lost|losing|reset|resets|broke|breaks|fail|failed|don't|do not) /i;

  const sentences = (model: ReturnType<typeof streakScreenModel>): string[] =>
    [model.line, model.freezes.line, model.milestone?.line ?? "", model.exam?.line ?? "", model.label].filter(
      (line) => line !== "",
    );

  it("carries no loss framing on any of the screen's states", () => {
    for (const model of [modelFor(6), modelFor(47, [1]), modelFor(2), modelFor(0)]) {
      for (const sentence of sentences(model)) {
        expect(sentence, sentence).not.toMatch(FORBIDDEN);
      }
    }
  });

  it("opens day one on an offer rather than on a warning", () => {
    const model = modelFor(0);
    expect(model.days).toBe(1);
    expect(model.line).toBe("Day one. Meet your daily goal tomorrow and it becomes two.");
  });
});
