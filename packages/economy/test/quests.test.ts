/**
 * Daily quests, owner 2026-10-20 (docs/ECONOMY.md, Daily quests).
 *
 * Three per local day: two recurring ("Finish 3 lessons or quizzes", "Train
 * for 30 minutes") and one rotating from QUEST_ROTATION. All derived from the
 * journal; completing one earns a chest and CHARGE_DAILY_QUEST energy. "Train
 * for 30 minutes" is a proxy, QUEST_MINUTES_PER_ACTIVITY per training activity,
 * because the journal records no time spent.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, questsFor, receiptFor } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { CHARGE_DAILY_QUEST, CHEST_REWARD, QUEST_MINUTES_PER_ACTIVITY, questChestId } from "../src/rules.ts";
import { at, cleared, started, TZ } from "./helpers.ts";

// Rotation by local date: the 20th is the card run, the 21st Earn 40 XP, the
// 22nd a review drill, the 23rd a flawless lesson.
const CARDS_DAY = "2026-10-20";
const XP_DAY = "2026-10-21";
const REVIEW_DAY = "2026-10-22";
const FLAWLESS_DAY = "2026-10-23";

const ids = (date: string) => questsFor(date).map((quest) => quest.id);
const quest = (date: string, events: readonly EconomyEvent[], id: string, now = at(date, "22:00")) =>
  deriveEconomy(events, now).quests.list.find((item) => item.id === id);

function lessons(date: string, count: number, first = 0): EconomyEvent[] {
  return Array.from({ length: count }, (unused, i) => cleared(`l${first + i}`, "concept", date, { time: `10:${String(10 + i).padStart(2, "0")}` }));
}

function cardRun(date: string, graded: number, time = "11:00"): EconomyEvent {
  return { kind: "cards_reviewed", at: at(date, time), tz: TZ, graded };
}

describe("which quests a day has", () => {
  it("is the two recurring quests and one rotating quest, picked by local date", () => {
    expect(ids(CARDS_DAY)).toEqual(["lessons", "train", "cards"]);
    expect(ids(XP_DAY)).toEqual(["lessons", "train", "xp"]);
    expect(ids(REVIEW_DAY)).toEqual(["lessons", "train", "review"]);
    expect(ids(FLAWLESS_DAY)).toEqual(["lessons", "train", "flawless"]);
    // The list is fixed and small, so the rotation comes round again.
    expect(ids("2026-10-24")).toEqual(ids(CARDS_DAY));
  });

  it("shows today's three, with titles and targets, on an empty journal", () => {
    const snapshot = deriveEconomy([], at(CARDS_DAY, "09:00"));
    expect(snapshot.quests.date).toBe(CARDS_DAY);
    expect(snapshot.quests.list.map((item) => [item.title, item.target, item.progress, item.done])).toEqual([
      ["Finish 3 lessons or quizzes", 3, 0, false],
      ["Train for 30 minutes", 30, 0, false],
      ["Finish a flashcard review", 1, 0, false],
    ]);
  });
});

describe("Finish 3 lessons or quizzes", () => {
  it("completes on the third clear, earns a saved chest and five energy", () => {
    const starts = [0, 1, 2].map((i) => started(`l${i}`, "concept", CARDS_DAY, `10:0${i}`));
    const journal = [...starts, ...lessons(CARDS_DAY, 3)];
    const third = journal[journal.length - 1] as EconomyEvent;
    const receipt = receiptFor(journal.slice(0, -1), third, at(CARDS_DAY, "10:20"));
    expect(receipt.questsCompleted).toEqual(["lessons"]);
    expect(receipt.chestsEarned.map((chest) => chest.id)).toEqual([questChestId(CARDS_DAY, "lessons")]);
    expect(receipt.charge.delta).toBe(CHARGE_DAILY_QUEST);
    const snapshot = deriveEconomy(journal, at(CARDS_DAY, "10:20"));
    // Three entries spend 9 of 20, the quest gives 5 back.
    expect(snapshot.charge.current).toBe(20 - 9 + 5);
    const done = snapshot.quests.list[0];
    expect(done).toMatchObject({ id: "lessons", progress: 3, done: true, completedAt: at(CARDS_DAY, "10:12") });
    expect(snapshot.chests.saved.map((chest) => [chest.id, chest.source, chest.reward])).toEqual([
      [questChestId(CARDS_DAY, "lessons"), "daily_quest", CHEST_REWARD.daily_quest],
    ]);
  });

  it("pays its diamonds only when the chest is opened", () => {
    const journal = lessons(CARDS_DAY, 3);
    const before = deriveEconomy(journal, at(CARDS_DAY, "22:00")).diamonds.balance;
    const opened: EconomyEvent = { kind: "chest_opened", at: at(CARDS_DAY, "21:00"), tz: TZ, chestId: questChestId(CARDS_DAY, "lessons") };
    const after = deriveEconomy([...journal, opened], at(CARDS_DAY, "22:00")).diamonds.balance;
    expect(after - before).toBe(CHEST_REWARD.daily_quest.diamonds);
  });

  it("counts a quiz pass, but not a review drill", () => {
    const quiz: EconomyEvent = { kind: "quiz_passed", at: at(CARDS_DAY, "11:00"), tz: TZ, unitId: "u1", flawless: false };
    const review = cleared("r1", "review", CARDS_DAY, { time: "11:05" });
    expect(quest(CARDS_DAY, [...lessons(CARDS_DAY, 2), quiz], "lessons")?.done).toBe(true);
    expect(quest(CARDS_DAY, [...lessons(CARDS_DAY, 2), review], "lessons")?.progress).toBe(2);
  });

  it("completes once a day, and the next local day starts again from zero", () => {
    const journal = [...lessons(CARDS_DAY, 5), ...lessons(XP_DAY, 1, 10)];
    expect(deriveEconomy(journal, at(CARDS_DAY, "22:00")).chests.saved.filter((c) => c.id.endsWith(":lessons"))).toHaveLength(1);
    const tomorrow = deriveEconomy(journal, at(XP_DAY, "22:00"));
    expect(tomorrow.quests.date).toBe(XP_DAY);
    expect(tomorrow.quests.list[0]).toMatchObject({ progress: 1, done: false });
  });

  it("reads the day in the student's own zone", () => {
    // 23:30 in New York on the 20th is the 21st in UTC: all three are the 20th locally.
    const tz = "America/New_York";
    const journal = [0, 1, 2].map((i) => cleared(`ny${i}`, "concept", CARDS_DAY, { time: `23:3${i}`, tz }));
    const snapshot = deriveEconomy(journal, at(CARDS_DAY, "23:50", tz));
    expect(snapshot.quests.date).toBe(CARDS_DAY);
    expect(snapshot.quests.list[0]?.done).toBe(true);
    expect(snapshot.chests.saved.map((chest) => chest.id)).toEqual([questChestId(CARDS_DAY, "lessons")]);
  });
});

describe("Train for 30 minutes, the documented proxy", () => {
  it("counts each training activity as five minutes", () => {
    expect(QUEST_MINUTES_PER_ACTIVITY).toBe(5);
    const five = [...lessons(CARDS_DAY, 3), cleared("r1", "review", CARDS_DAY, { time: "11:00" }), cardRun(CARDS_DAY, 5, "11:10")];
    expect(quest(CARDS_DAY, five, "train")).toMatchObject({ progress: 25, done: false });
    const six = [...five, { kind: "challenge_passed", at: at(CARDS_DAY, "11:20"), tz: TZ, nodeId: "l0" } as EconomyEvent];
    expect(quest(CARDS_DAY, six, "train")).toMatchObject({ progress: 30, done: true });
  });

  it("does not count a Challenge on an uncleared node or a card run too short to pay", () => {
    const journal = [
      { kind: "challenge_passed", at: at(CARDS_DAY, "11:20"), tz: TZ, nodeId: "never" } as EconomyEvent,
      cardRun(CARDS_DAY, 4),
    ];
    expect(quest(CARDS_DAY, journal, "train")?.progress).toBe(0);
  });

  it("does not move for wrong answers", () => {
    const wrong: EconomyEvent[] = Array.from({ length: 20 }, (unused, i) => ({
      kind: "attempt",
      at: at(CARDS_DAY, "12:00"),
      tz: TZ,
      nodeId: "l0",
      problemId: `p${i}`,
      correct: false,
    }));
    expect(deriveEconomy(wrong, at(CARDS_DAY, "22:00")).quests).toEqual(deriveEconomy([], at(CARDS_DAY, "22:00")).quests);
  });
});

describe("the rotating quest", () => {
  it("Finish a flashcard review: a run that would pay", () => {
    expect(quest(CARDS_DAY, [cardRun(CARDS_DAY, 4)], "cards")?.done).toBe(false);
    expect(quest(CARDS_DAY, [cardRun(CARDS_DAY, 5)], "cards")?.done).toBe(true);
  });

  it("Earn 40 XP: the day's XP from work, crossing 40", () => {
    const three = lessons(XP_DAY, 3);
    expect(quest(XP_DAY, three, "xp")).toMatchObject({ progress: 30, done: false });
    expect(quest(XP_DAY, lessons(XP_DAY, 4), "xp")).toMatchObject({ progress: 40, done: true });
  });

  it("Clear a review drill", () => {
    expect(quest(REVIEW_DAY, [cleared("r1", "review", REVIEW_DAY)], "review")?.done).toBe(true);
  });

  it("Finish a lesson with no misses", () => {
    expect(quest(FLAWLESS_DAY, lessons(FLAWLESS_DAY, 1), "flawless")?.done).toBe(false);
    expect(quest(FLAWLESS_DAY, [cleared("f1", "concept", FLAWLESS_DAY, { flawless: true })], "flawless")?.done).toBe(true);
  });

  it("earns a chest and energy like the recurring quests", () => {
    const journal = [started("x", "concept", REVIEW_DAY, "09:00"), cleared("r1", "review", REVIEW_DAY, { time: "09:10" })];
    const snapshot = deriveEconomy(journal, at(REVIEW_DAY, "09:15"));
    // 20 - 3 for the entry, + 3 for the review drill, + 5 for the quest, capped at 20.
    expect(snapshot.charge.current).toBe(20);
    expect(snapshot.chests.saved.map((chest) => chest.id)).toEqual([questChestId(REVIEW_DAY, "review")]);
    const deeper = [
      ...Array.from({ length: 5 }, (unused, i) => started(`x${i}`, "concept", REVIEW_DAY, `09:0${i}`)),
      cleared("r1", "review", REVIEW_DAY, { time: "09:10" }),
    ];
    // 20 - 15 + 3 + 5.
    expect(deriveEconomy(deeper, at(REVIEW_DAY, "09:15")).charge.current).toBe(13);
  });
});
