/**
 * The Feed tab's quests, against real journals run through the real engine.
 *
 * Nothing here hand builds an EconomySnapshot. Every case is a journal and a
 * seeded clock through `feedModel`, so a rule that moves in packages/economy
 * shows up here as a failing quest rather than a fixture that quietly still
 * passes. Same standard as streakModel.test.ts.
 *
 * THE CLOCK IS PART OF THE SURFACE (measurements/gauntlet-economy/LOG.md):
 * every case pins `now`, and the last block runs the same journal at 09:00
 * and 23:00 to prove no quest label, reading, or fraction branches on the
 * hour. The streak's at-risk copy famously does; the Feed's must not.
 */

import { describe, expect, it } from "vitest";
import { DAILY_GOAL_XP, DEFAULT_DAILY_GOAL, type EconomyEvent } from "@blueberry/economy";
import { feedModel, QUEST_CORRECT_TARGET, type QuestMotif } from "../tabs/feed/feedModel";

const TZ = "UTC";
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

function attempt(daysAgo: number, i: number, correct: boolean): EconomyEvent {
  return {
    kind: "attempt",
    at: at(daysAgo),
    tz: TZ,
    nodeId: "seed:node",
    problemId: `seed:node#${i}`,
    correct,
  };
}

const CASUAL: EconomyEvent = { kind: "settings", at: at(3), tz: TZ, dailyGoal: "casual" };

function questById(journal: readonly EconomyEvent[], id: string, now = NOW) {
  const found = feedModel(journal, now).quests.find((q) => q.id === id);
  if (found === undefined) throw new Error(`no quest ${id}`);
  return found;
}

describe("the empty journal", () => {
  const model = feedModel([], NOW);

  it("still offers all three quests, none done, none pretending", () => {
    expect(model.quests.map((q) => q.id)).toEqual(["earn-xp", "keep-streak", "get-right"]);
    expect(model.quests.every((q) => !q.done)).toBe(true);
    expect(model.quests.every((q) => q.progress === 0)).toBe(true);
    expect(model.doneCount).toBe(0);
  });

  it("holds a student who never picked a goal to the engine's default tier", () => {
    const quest = questById([], "earn-xp");
    expect(quest.target).toBe(DAILY_GOAL_XP[DEFAULT_DAILY_GOAL]);
    expect(quest.label).toBe(`Earn ${DAILY_GOAL_XP[DEFAULT_DAILY_GOAL]} XP`);
    expect(quest.reading).toBe(`0 / ${DAILY_GOAL_XP[DEFAULT_DAILY_GOAL]} XP`);
  });

  it("frames the unmet streak as open, never as at risk", () => {
    expect(questById([], "keep-streak").reading).toBe("Today is open");
  });
});

describe("the earn-xp quest", () => {
  it("is done when the ENGINE says the goal is met, and the bar agrees with the number", () => {
    const quest = questById([CASUAL, clear(0, "seed:today")], "earn-xp");
    expect(quest.done).toBe(true);
    expect(quest.fraction).toBe(1);
    expect(quest.reading).toBe("10 / 10 XP");
  });

  it("clamps past the goal, so the bar never overflows its own track", () => {
    // Two clears plus the goal bonus is 30 XP against a 10 XP goal.
    const quest = questById([CASUAL, clear(0, "seed:a"), clear(0, "seed:b")], "earn-xp");
    expect(quest.progress).toBe(10);
    expect(quest.fraction).toBe(1);
    expect(quest.reading).toBe("10 / 10 XP");
  });

  it("counts only today: yesterday's clear moves nothing", () => {
    const quest = questById([CASUAL, clear(1, "seed:yesterday")], "earn-xp");
    expect(quest.progress).toBe(0);
    expect(quest.done).toBe(false);
  });
});

describe("the keep-streak quest", () => {
  it("reads the day count off the engine once today counted", () => {
    const journal = [CASUAL, clear(2, "seed:a"), clear(1, "seed:b"), clear(0, "seed:c")];
    const quest = questById(journal, "keep-streak");
    expect(quest.done).toBe(true);
    expect(quest.reading).toBe("Day 3");
  });
});

describe("the get-right quest", () => {
  it("counts correct answers and only correct answers", () => {
    const journal = [
      attempt(0, 1, true),
      attempt(0, 2, false),
      attempt(0, 3, true),
      attempt(0, 4, false),
      attempt(0, 5, true),
    ];
    const quest = questById(journal, "get-right");
    expect(quest.progress).toBe(3);
    expect(quest.fraction).toBeCloseTo(3 / QUEST_CORRECT_TARGET);
    expect(quest.done).toBe(false);
    expect(quest.reading).toBe(`3 / ${QUEST_CORRECT_TARGET}`);
  });

  it("clamps a big day to the target and reports done", () => {
    const journal = Array.from({ length: 9 }, (_, i) => attempt(0, i, true));
    const quest = questById(journal, "get-right");
    expect(quest.progress).toBe(QUEST_CORRECT_TARGET);
    expect(quest.done).toBe(true);
    expect(quest.reading).toBe(`${QUEST_CORRECT_TARGET} / ${QUEST_CORRECT_TARGET}`);
  });

  it("counts only today's local date", () => {
    const journal = [attempt(1, 1, true), attempt(1, 2, true)];
    expect(questById(journal, "get-right").progress).toBe(0);
  });
});

describe("the clock, which is part of the surface", () => {
  it("derives the same quests at 09:00 and 23:00, so nothing on the Feed branches on the hour", () => {
    const journal = [CASUAL, clear(1, "seed:yesterday"), attempt(0, 1, true), attempt(0, 2, false)];
    const morning = feedModel(journal, at(0, 9));
    const night = feedModel(journal, at(0, 23));
    // The snapshots differ (charge regen, at-risk); the QUESTS may not.
    expect(night.quests).toEqual(morning.quests);
    expect(night.doneCount).toBe(morning.doneCount);
  });
});

/**
 * THE ICON COLUMN IS INFORMATION, so it is asserted rather than eyeballed.
 *
 * A critic measured the built Feed against blueberry_r7-feed-v2_1788288479.png
 * and found three identical dark-navy outlined flasks where the image draws
 * three DIFFERENT motifs matched to their quests, and found all three drawing
 * no liquid at all because every quest sat at fraction 0, so the icon column
 * carried no colour and no information. Owner ruling 4 of 2026-09-04 is the
 * general form of it: "A node with no authored content still shows what KIND
 * it will be ... an empty chip reads as broken rather than unauthored."
 *
 * The motif lives on the model for that reason. A view that switches on an id
 * can be given two identical branches by anybody in a hurry; a model that
 * declares one motif per quest cannot, and the check below is what says so.
 */
describe("the motif each quest wears", () => {
  /** The drawn family. FeedTab.tsx has one component per member and no other. */
  const QUEST_MOTIFS: readonly QuestMotif[] = ["flask", "flame", "cards"];
  const quests = feedModel([CASUAL], NOW).quests;

  it("gives every quest a motif, so no row can render an empty icon", () => {
    for (const quest of quests) {
      expect(QUEST_MOTIFS, `${quest.id} has no motif`).toContain(quest.motif);
    }
  });

  it("gives the three quests three DIFFERENT motifs", () => {
    const seen = new Set(quests.map((quest) => quest.motif));
    expect(seen.size).toBe(quests.length);
  });

  it("puts the filling flask on the XP quest, which is the one that fills", () => {
    // The brief's own words, "a flask filling as progress". The flask is the
    // only motif that also carries a reading, so it belongs on the quest whose
    // progress is continuous rather than on the one-step streak quest.
    expect(quests.find((quest) => quest.id === "earn-xp")?.motif).toBe("flask");
    expect(quests.find((quest) => quest.id === "keep-streak")?.motif).toBe("flame");
  });

  it("keeps the motif fixed while the fraction moves, so the icon is not the meter", () => {
    const empty = feedModel([CASUAL], NOW).quests;
    const busy = feedModel([CASUAL, ...Array.from({ length: 9 }, (_, i) => attempt(0, i, true))], NOW).quests;
    expect(busy.map((quest) => quest.motif)).toEqual(empty.map((quest) => quest.motif));
  });
});
