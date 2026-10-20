/**
 * Chests EARNED and SAVED, owner 2026-10-20 (docs/ECONOMY.md, Chests).
 *
 * Completing a task drops a chest right away; the student opens it now or
 * later; saved chests stack and can be opened one by one or all at once. Every
 * reward is fixed (CHEST_REWARD). The pathway chest that predates this keeps
 * paying exactly what it always paid, which test/chest.test.ts pins from the
 * other side.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor } from "../src/derive.ts";
import { isEconomyEvent, type EconomyEvent, type JournalledChestSource } from "../src/journal.ts";
import { CHEST_REWARD, DIAMONDS_CHEST, ONBOARDING_GIFT_CHEST_ID, dailyGiftChestId } from "../src/rules.ts";
import { at, cleared, started, TZ } from "./helpers.ts";

// A day whose rotating quest is the card run, so nothing below completes it by accident.
const DAY = "2026-10-20";
const NOW = at(DAY, "21:00");

function earn(source: JournalledChestSource, time: string, options: { date?: string; tz?: string; ref?: string } = {}): EconomyEvent {
  const tz = options.tz ?? TZ;
  const base = { kind: "chest_earned" as const, at: at(options.date ?? DAY, time, tz), tz, source };
  return options.ref === undefined ? base : { ...base, ref: options.ref };
}

function open(chestId: string, time: string, date = DAY): EconomyEvent {
  return { kind: "chest_opened", at: at(date, time), tz: TZ, chestId };
}

describe("a daily gift", () => {
  it("is saved when earned and pays nothing until it is opened", () => {
    const snapshot = deriveEconomy([earn("daily_gift", "08:00")], NOW);
    expect(snapshot.chests.saved).toEqual([
      { id: dailyGiftChestId(DAY), source: "daily_gift", earnedAt: at(DAY, "08:00"), reward: CHEST_REWARD.daily_gift },
    ]);
    expect(snapshot.chests.savedReward).toEqual({ diamonds: 5, xp: 0 });
    expect(snapshot.chests.giftDays).toEqual([DAY]);
    expect(snapshot.diamonds.balance).toBe(0);
  });

  it("says on the receipt which chest the event earned", () => {
    const receipt = receiptFor([], earn("daily_gift", "08:00"), NOW);
    expect(receipt.chestsEarned.map((chest) => chest.id)).toEqual([dailyGiftChestId(DAY)]);
    expect(receipt.diamonds).toEqual([]);
  });

  it("pays its fixed reward when opened, now or hours later, and leaves the inventory", () => {
    const earned = [earn("daily_gift", "08:00")];
    const receipt = receiptFor(earned, open(dailyGiftChestId(DAY), "20:00"), NOW);
    expect(receipt.diamonds).toEqual([{ label: "Daily gift", amount: 5 }]);
    const after = deriveEconomy([...earned, open(dailyGiftChestId(DAY), "20:00")], NOW);
    expect(after.diamonds.balance).toBe(5);
    expect(after.chests.saved).toEqual([]);
  });

  it("counts once per local day however often the app is opened", () => {
    const journal = [earn("daily_gift", "08:00"), earn("daily_gift", "12:00"), earn("daily_gift", "23:59")];
    expect(deriveEconomy(journal, NOW).chests.saved).toHaveLength(1);
    expect(receiptFor(journal.slice(0, 1), journal[1] as EconomyEvent, NOW).chestsEarned).toEqual([]);
  });

  it("comes again after the local day boundary, and the saved gifts stack", () => {
    const journal = [earn("daily_gift", "23:59"), earn("daily_gift", "00:01", { date: "2026-10-21" })];
    const snapshot = deriveEconomy(journal, at("2026-10-21", "09:00"));
    expect(snapshot.chests.saved.map((chest) => chest.id)).toEqual([dailyGiftChestId(DAY), dailyGiftChestId("2026-10-21")]);
    expect(snapshot.chests.savedReward.diamonds).toBe(10);
  });

  it("reads the day in the zone the student was in, not in UTC", () => {
    // 07:00 in Tokyo on the 21st is 22:00 UTC on the 20th: Tokyo's day is the 21st.
    const tokyo = earn("daily_gift", "07:00", { date: "2026-10-21", tz: "Asia/Tokyo" });
    const tokyoAgain = earn("daily_gift", "21:00", { date: "2026-10-21", tz: "Asia/Tokyo" });
    // 18:00 in New York on the 20th is 22:00 UTC the same day: New York's day is the 20th.
    const newYork = earn("daily_gift", "18:00", { date: DAY, tz: "America/New_York" });
    const snapshot = deriveEconomy([tokyo, tokyoAgain, newYork], at("2026-10-21", "23:00"));
    expect(snapshot.chests.giftDays).toEqual([DAY, "2026-10-21"]);
    expect(snapshot.chests.saved).toHaveLength(2);
  });
});

describe("the onboarding gift", () => {
  it("is earned once, ever", () => {
    const journal = [earn("onboarding_gift", "08:00"), earn("onboarding_gift", "09:00"), earn("onboarding_gift", "08:00", { date: "2026-10-25" })];
    const snapshot = deriveEconomy(journal, at("2026-10-25", "12:00"));
    expect(snapshot.chests.saved.map((chest) => chest.id)).toEqual([ONBOARDING_GIFT_CHEST_ID]);
    expect(snapshot.chests.onboardingGiftEarned).toBe(true);
    expect(deriveEconomy([], NOW).chests.onboardingGiftEarned).toBe(false);
  });

  it("pays fixed diamonds and XP, once, and the XP never fills the daily goal", () => {
    const journal = [earn("onboarding_gift", "08:00"), open(ONBOARDING_GIFT_CHEST_ID, "08:01"), open(ONBOARDING_GIFT_CHEST_ID, "08:02")];
    const receipt = receiptFor(journal.slice(0, 1), journal[1] as EconomyEvent, NOW);
    expect(receipt.diamonds).toEqual([{ label: "Welcome gift", amount: CHEST_REWARD.onboarding_gift.diamonds }]);
    expect(receipt.xp).toEqual([{ label: "Welcome gift", amount: CHEST_REWARD.onboarding_gift.xp }]);
    const snapshot = deriveEconomy(journal, NOW);
    expect(snapshot.diamonds.balance).toBe(50);
    expect(snapshot.xp.total).toBe(20);
    expect(snapshot.xp.today).toBe(0);
    expect(snapshot.xp.goalMet).toBe(false);
    expect(snapshot.streak.todayCounted).toBe(false);
    // Still earned after it is opened, so the shell never offers it again.
    expect(snapshot.chests.onboardingGiftEarned).toBe(true);
  });
});

describe("a section final chest", () => {
  it("is saved under the pathway chest id and pays the pathway chest amount", () => {
    const journal = [earn("section_final", "10:00", { ref: "u1-chest-a" })];
    expect(deriveEconomy(journal, NOW).chests.saved.map((chest) => chest.id)).toEqual(["u1-chest-a"]);
    const receipt = receiptFor(journal, open("u1-chest-a", "10:05"), NOW);
    expect(receipt.diamonds).toEqual([{ label: "Treasure chest", amount: DIAMONDS_CHEST }]);
  });

  it("is not saved again once the pathway chest was opened the old way", () => {
    const journal = [open("u1-chest-a", "09:00"), earn("section_final", "10:00", { ref: "u1-chest-a" }), open("u1-chest-a", "10:05")];
    const snapshot = deriveEconomy(journal, NOW);
    expect(snapshot.chests.saved).toEqual([]);
    expect(snapshot.diamonds.balance).toBe(DIAMONDS_CHEST);
  });

  it("cannot borrow an id the derivation mints", () => {
    const journal = [earn("section_final", "10:00", { ref: dailyGiftChestId(DAY) }), open(dailyGiftChestId(DAY), "10:05")];
    const snapshot = deriveEconomy(journal, NOW);
    expect(snapshot.chests.saved).toEqual([]);
    expect(snapshot.diamonds.balance).toBe(0);
  });
});

describe("opening", () => {
  it("pays nothing for a minted chest that was never earned, and it can still be earned and opened later", () => {
    const early = open(dailyGiftChestId(DAY), "07:00");
    expect(deriveEconomy([early], NOW).diamonds.balance).toBe(0);
    const journal = [early, earn("daily_gift", "08:00"), open(dailyGiftChestId(DAY), "09:00")];
    expect(deriveEconomy(journal, NOW).diamonds.balance).toBe(5);
  });

  it("opens every saved chest at once, and the receipts add up to what the inventory promised", () => {
    const journal: EconomyEvent[] = [
      earn("onboarding_gift", "08:00"),
      earn("daily_gift", "08:00"),
      earn("section_final", "10:00", { ref: "u1-chest-a" }),
    ];
    const before = deriveEconomy(journal, NOW);
    expect(before.chests.saved).toHaveLength(3);
    const promised = before.chests.savedReward;
    let diamonds = 0;
    let xp = 0;
    const history = [...journal];
    for (const chest of before.chests.saved) {
      const event = open(chest.id, "20:00");
      const receipt = receiptFor(history, event, NOW);
      diamonds += receipt.diamonds.reduce((sum, line) => sum + line.amount, 0);
      xp += receipt.xp.reduce((sum, line) => sum + line.amount, 0);
      history.push(event);
    }
    const after = deriveEconomy(history, NOW);
    expect({ diamonds, xp }).toEqual(promised);
    expect(promised).toEqual({ diamonds: 50 + 5 + DIAMONDS_CHEST, xp: 20 });
    expect(after.diamonds.balance - before.diamonds.balance).toBe(promised.diamonds);
    expect(after.chests.saved).toEqual([]);
  });
});

describe("an old journal", () => {
  it("derives the diamond balance it derived before chests could be saved", () => {
    // Only event kinds that existed before 2026-10-20. By the old rules: a spine
    // first clear 10 + 5, two pathway chests 15 each, a review drill 5.
    const journal: EconomyEvent[] = [
      started("a", "concept", DAY, "09:00"),
      cleared("a", "concept", DAY, { time: "09:10", spine: true }),
      open("u1-chest-a", "09:20"),
      open("u1-chest-b", "09:21"),
      open("u1-chest-a", "09:22"),
      cleared("r1", "review", DAY, { time: "09:30" }),
    ];
    const snapshot = deriveEconomy(journal, NOW);
    expect(snapshot.diamonds.balance).toBe(10 + 5 + 15 + 15 + 5);
    expect(snapshot.chests.saved).toEqual([]);
  });
});

describe("the journal shape", () => {
  it("keeps a chest_earned for the three journalled sources and refuses the rest", () => {
    expect(isEconomyEvent(earn("daily_gift", "08:00"))).toBe(true);
    expect(isEconomyEvent(earn("onboarding_gift", "08:00"))).toBe(true);
    expect(isEconomyEvent(earn("section_final", "08:00", { ref: "u1-chest-a" }))).toBe(true);
    expect(isEconomyEvent(earn("section_final", "08:00"))).toBe(false);
    expect(isEconomyEvent({ kind: "chest_earned", at: at(DAY), tz: TZ, source: "daily_quest" })).toBe(false);
    expect(isEconomyEvent({ kind: "chest_earned", at: at(DAY), tz: TZ, source: "jackpot" })).toBe(false);
  });

  it("keeps a node_started entry of challenge or final, and refuses any other", () => {
    const base = { kind: "node_started", at: at(DAY), tz: TZ, nodeId: "n1", nodeKind: "concept" };
    expect(isEconomyEvent({ ...base, entry: "challenge" })).toBe(true);
    expect(isEconomyEvent({ ...base, entry: "final" })).toBe(true);
    expect(isEconomyEvent({ ...base, entry: "free" })).toBe(false);
  });
});
