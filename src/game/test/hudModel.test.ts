/**
 * The header HUD's model, against real snapshots from real journals.
 *
 * Nothing here builds an EconomySnapshot by hand. Every case runs a journal
 * through `deriveEconomy`, so a rule that moves in packages/economy shows up
 * here as a failing sentence rather than as a fixture that quietly still
 * passes. That is the same reason the capture script asserts the derived
 * numbers instead of trusting the seed it wrote.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, type EconomyEvent } from "@blueberry/economy";
import { hudModel, hudReadouts, HUD_BUTTON_IDS, HUD_ITEM_IDS } from "../app/ui/hudModel";

const TZ = "UTC";
const NOW = "2026-08-28T14:00:00.000Z";

function at(daysAgo: number, hour = 12): string {
  const ms = Date.parse(NOW) - daysAgo * 86_400_000;
  const day = new Date(ms).toISOString().slice(0, 10);
  return `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

/** A flawless spine reaction clear pays exactly 20 XP, which is the Regular goal. */
function countedDay(daysAgo: number, nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared",
    at: at(daysAgo),
    tz: TZ,
    nodeId,
    nodeKind: "reaction",
    flawless: true,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  };
}

function model(journal: readonly EconomyEvent[], now = NOW) {
  return hudModel(deriveEconomy(journal, now));
}

describe("hudModel, the empty account", () => {
  const empty = model([]);

  it("shows a zero on every readout and never a blank", () => {
    expect(empty.xp.value).toBe("0");
    expect(empty.diamonds.value).toBe("0");
    expect(empty.streak.value).toBe("0");
    // Charge starts full: nothing has been spent, so the meter is at the cap.
    expect(empty.charge.value).toBe("30");
    expect(empty.charge.fraction).toBe(1);
  });

  it("offers day one rather than reporting a missing streak", () => {
    expect(empty.streak.headline).toBe("No streak yet");
    expect(empty.streak.line).toContain("day one is yours");
  });

  it("carries every id exactly once, in header order", () => {
    expect(hudReadouts(empty).map((readout) => readout.id)).toEqual([...HUD_ITEM_IDS]);
  });
});

describe("hudModel, the XP ring", () => {
  it("is a fraction of the tier's goal and names the tier", () => {
    const journal: readonly EconomyEvent[] = [
      { kind: "settings", at: at(1), tz: TZ, dailyGoal: "regular" },
      { kind: "resonance_found", at: at(0, 9), tz: TZ, nodeId: "n1" },
    ];
    const xp = model(journal).xp;
    expect(xp.today).toBe(8);
    expect(xp.goalXp).toBe(20);
    expect(xp.fraction).toBeCloseTo(0.4, 5);
    expect(xp.met).toBe(false);
    expect(xp.eyebrow).toBe("Regular goal");
    expect(xp.headline).toBe("8 of 20 XP today");
    expect(xp.line).toBe("12 more XP and today counts toward your streak.");
  });

  it("reads the tier from the settings the student actually chose", () => {
    const journal: readonly EconomyEvent[] = [
      { kind: "settings", at: at(2), tz: TZ, dailyGoal: "serious" },
      { kind: "resonance_found", at: at(0, 9), tz: TZ, nodeId: "n1" },
    ];
    const xp = model(journal).xp;
    expect(xp.eyebrow).toBe("Serious goal");
    expect(xp.goalXp).toBe(35);
  });

  it("fills and switches copy when the goal is met, and never overshoots the arc", () => {
    const journal: readonly EconomyEvent[] = [
      { kind: "settings", at: at(1), tz: TZ, dailyGoal: "casual" },
      countedDay(0, "n1"),
    ];
    const xp = model(journal).xp;
    // 20 for the clear plus the 10 the met goal itself pays, against a 10 goal.
    expect(xp.met).toBe(true);
    expect(xp.fraction).toBe(1);
    expect(xp.headline).toBe("Daily goal met");
    expect(xp.line).toContain("counts toward your streak");
  });
});

describe("hudModel, the streak flame", () => {
  const fiveDays: readonly EconomyEvent[] = [
    { kind: "settings", at: at(6), tz: TZ, dailyGoal: "regular" },
    countedDay(5, "n5"),
    countedDay(4, "n4"),
    countedDay(3, "n3"),
    countedDay(2, "n2"),
    countedDay(1, "n1"),
  ];

  it("is unlit while today is still unmet, and still reports the run", () => {
    const streak = model(fiveDays).streak;
    expect(streak.days).toBe(5);
    expect(streak.lit).toBe(false);
    expect(streak.headline).toBe("5 day streak");
    expect(streak.label).toContain("today not counted yet");
  });

  it("lights the moment today counts", () => {
    const streak = model([...fiveDays, countedDay(0, "n0")]).streak;
    expect(streak.days).toBe(6);
    expect(streak.lit).toBe(true);
    expect(streak.line).toContain("Today is counted");
  });

  it("names the free rest day once the evening has turned, and never scolds", () => {
    const evening = model(fiveDays, "2026-08-28T23:30:00.000Z").streak;
    expect(evening.atRisk).toBe(true);
    expect(evening.line).toContain("rest day");
    expect(evening.line).not.toMatch(/should|lose|lost|don't|fail/i);
  });
});

describe("hudModel, charge", () => {
  it("reads the meter against the cap without spending anything on a wrong answer", () => {
    const journal: readonly EconomyEvent[] = [
      { kind: "node_started", at: at(0, 14), tz: TZ, nodeId: "a", nodeKind: "concept" },
      { kind: "node_started", at: at(0, 14), tz: TZ, nodeId: "b", nodeKind: "reaction" },
      { kind: "attempt", at: at(0, 14), tz: TZ, nodeId: "b", problemId: "p1", correct: false },
      { kind: "attempt", at: at(0, 14), tz: TZ, nodeId: "b", problemId: "p2", correct: false },
    ];
    const charge = model(journal).charge;
    // 30 minus a concept's 5 and a reaction's 8. The two wrong attempts are free,
    // which is the rule the copy below promises out loud.
    expect(charge.current).toBe(17);
    expect(charge.cap).toBe(30);
    expect(charge.value).toBe("17");
    expect(charge.fraction).toBeCloseTo(17 / 30, 5);
    expect(charge.examWindow).toBe(false);
    expect(charge.line).toContain("Getting things wrong never does.");
  });

  it("goes flat at zero rather than reading as an error", () => {
    const journal: readonly EconomyEvent[] = Array.from({ length: 6 }, (_unused, i) => ({
      kind: "node_started" as const,
      at: at(0, 14),
      tz: TZ,
      nodeId: `n${i}`,
      nodeKind: "reaction" as const,
    }));
    const charge = model(journal).charge;
    expect(charge.current).toBe(0);
    expect(charge.fraction).toBe(0);
    expect(charge.value).toBe("0");
  });

  it("switches to the no limits state inside the exam window and says how long", () => {
    const journal: readonly EconomyEvent[] = [
      { kind: "settings", at: at(1), tz: TZ, examDate: "2026-09-06" },
      { kind: "node_started", at: at(0, 14), tz: TZ, nodeId: "a", nodeKind: "reaction" },
    ];
    const charge = model(journal).charge;
    expect(charge.examWindow).toBe(true);
    expect(charge.daysLeft).toBe(9);
    expect(charge.value).toBe("∞");
    expect(charge.daysLabel).toBe("9d");
    expect(charge.fraction).toBe(1);
    expect(charge.headline).toBe("No limits, exam in 9 days");
  });

  it("reads the exam date as a date, not as a count, on the last two days", () => {
    const tomorrow: readonly EconomyEvent[] = [{ kind: "settings", at: at(1), tz: TZ, examDate: "2026-08-29" }];
    expect(model(tomorrow).charge.headline).toBe("No limits, exam tomorrow");
    const today: readonly EconomyEvent[] = [{ kind: "settings", at: at(1), tz: TZ, examDate: "2026-08-28" }];
    expect(model(today).charge.headline).toBe("No limits, exam today");
    expect(model(today).charge.daysLabel).toBe("today");
  });
});

describe("hudModel, the voice", () => {
  const journals: readonly (readonly EconomyEvent[])[] = [
    [],
    [{ kind: "settings", at: at(1), tz: TZ, dailyGoal: "casual" }],
    [{ kind: "settings", at: at(1), tz: TZ, examDate: "2026-09-02" }],
    [countedDay(0, "n0")],
    [countedDay(1, "n1"), { kind: "node_started", at: at(0, 14), tz: TZ, nodeId: "b", nodeKind: "quiz" }],
  ];

  it("never scolds, never asks a rhetorical question, and never prices a mistake", () => {
    for (const journal of journals) {
      for (const readout of hudReadouts(hudModel(deriveEconomy(journal, NOW)))) {
        expect(readout.line).not.toMatch(/\?/);
        expect(readout.line).not.toMatch(/you should|you failed|you lost|don't forget|careful/i);
        expect(readout.line.length).toBeGreaterThan(0);
        expect(readout.headline.length).toBeGreaterThan(0);
        expect(readout.eyebrow.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives every readout an accessible name that says the state, not the glyph", () => {
    for (const journal of journals) {
      for (const readout of hudReadouts(hudModel(deriveEconomy(journal, NOW)))) {
        expect(readout.label).toMatch(/[a-z]/);
        expect(readout.label).not.toBe(readout.value);
      }
    }
  });

  it("keeps mastery out of the header, per ECONOMY.md's presentation rules", () => {
    const journal: readonly EconomyEvent[] = [countedDay(1, "n1"), countedDay(0, "n0")];
    const text = hudReadouts(hudModel(deriveEconomy(journal, NOW)))
      .map((readout) => `${readout.eyebrow} ${readout.headline} ${readout.line} ${readout.label}`)
      .join(" ");
    expect(text).not.toMatch(/mastery|rank|arrow pusher|mechanist/i);
  });
});


/**
 * Round two's header is three buttons, not four, and the coach mark is a moment
 * rather than a definition. Both of those are claims about the model, so both
 * are checked here rather than only in the capture.
 */
describe("hudModel, the three button header", () => {
  it("gives a button to every system except the goal, which the header edge draws", () => {
    expect([...HUD_BUTTON_IDS]).toEqual(["diamonds", "streak", "charge"]);
    // The goal is still a readout and still carries its own sentence: it moved
    // surface, it did not disappear.
    expect(HUD_ITEM_IDS).toContain("xp");
    expect(HUD_BUTTON_IDS).not.toContain("xp");
  });

  it("states the rule rather than repeating the eyebrow in the headline", () => {
    const charge = model([]).charge;
    expect(charge.headline).toBe("Mistakes never cost charge");
    // The defect the critic named: the small caps eyebrow and the headline said
    // the same word in adjacent lines.
    expect(charge.headline.toLowerCase()).not.toContain(charge.eyebrow.toLowerCase() + " ");
    expect(charge.headline).not.toMatch(/\d/);
  });
});

describe("hudModel, the coach mark's unit rows", () => {
  const fiveDays: readonly EconomyEvent[] = [
    { kind: "settings", at: at(6), tz: TZ, dailyGoal: "regular" },
    countedDay(5, "n5"),
    countedDay(4, "n4"),
    countedDay(3, "n3"),
    countedDay(2, "n2"),
    countedDay(1, "n1"),
  ];

  it("draws seven days ending today, with the run marked and today last", () => {
    const week = model(fiveDays).streak.week;
    expect(week).toHaveLength(7);
    expect(week[6]?.today).toBe(true);
    expect(week.filter((day) => day.today)).toHaveLength(1);
    // Five counted days ending YESTERDAY, because today is not counted yet.
    expect(week.map((day) => day.counted)).toEqual([false, true, true, true, true, true, false]);
    expect(week.every((day) => day.letter.length > 0)).toBe(true);
  });

  it("moves the run onto today the moment today counts", () => {
    const week = model([...fiveDays, countedDay(0, "n0")]).streak.week;
    // Six counted days now: the five before today, plus today. Seven slots, so
    // the oldest one falls off the left of the strip.
    expect(week.map((day) => day.counted)).toEqual([false, true, true, true, true, true, true]);
    expect(week[6]?.counted).toBe(true);
  });

  it("draws nothing counted on an empty account rather than a broken strip", () => {
    const week = model([]).streak.week;
    expect(week).toHaveLength(7);
    expect(week.some((day) => day.counted)).toBe(false);
  });

  it("reads how far the next point has come, and claims none at the cap", () => {
    // Nothing spent, so the meter is full and no point is on its way.
    expect(model([]).charge.nextFraction).toBe(0);

    const spent: readonly EconomyEvent[] = [
      { kind: "node_started", at: at(0, 13), tz: TZ, nodeId: "a", nodeKind: "reaction" },
    ];
    // The clear happened at 13:00 and NOW is 14:00, so regen has run for a whole
    // number of half hours and the next point has only just started.
    const fraction = model(spent).charge.nextFraction;
    expect(fraction).toBeGreaterThanOrEqual(0);
    expect(fraction).toBeLessThanOrEqual(1);
  });

  it("never lets the next point read as arrived inside the exam window", () => {
    const journal: readonly EconomyEvent[] = [
      { kind: "settings", at: at(1), tz: TZ, examDate: "2026-09-06" },
      { kind: "node_started", at: at(0, 13), tz: TZ, nodeId: "a", nodeKind: "reaction" },
    ];
    expect(model(journal).charge.nextFraction).toBe(0);
  });
});
