/**
 * The flashcard review run's reward: OWNER DECISION 2026-10-01, five diamonds
 * per completed run, the review drill rate (DIAMONDS_CARD_RUN in rules.ts).
 *
 * WHY PIN IT HERE. The Cards summary used to show a diamond number nothing
 * ever credited. The run now journals `cards_reviewed` and the derivation
 * alone decides whether it pays, so the rules are pinned on the derivation:
 *
 *   paid      a run with CARD_RUN_MIN_GRADED or more cards graded pays 5
 *   unpaid    a run opened and left early (fewer cards) pays nothing
 *   capped    at most CARD_RUNS_PAID_PER_DAY paying runs per local day
 *   stable    the same journal pays the same runs in any append order
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor } from "../src/derive.ts";
import { isEconomyEvent, type EconomyEvent } from "../src/journal.ts";
import {
  CARD_RUN_MIN_GRADED,
  CARD_RUNS_PAID_PER_DAY,
  DIAMONDS_CARD_RUN,
  DIAMONDS_REVIEW_CLEARED,
} from "../src/rules.ts";
import { at, TZ } from "./helpers.ts";

const DAY = "2026-10-01";

function run(graded: number, time: string, date: string = DAY): EconomyEvent {
  return { kind: "cards_reviewed", at: at(date, time), tz: TZ, graded };
}

const balance = (journal: readonly EconomyEvent[], date: string = DAY) => deriveEconomy(journal, at(date, "23:00")).diamonds.balance;

describe("a flashcard review run's diamonds", () => {
  it("is priced at the review drill rate, five, as the owner decided", () => {
    expect(DIAMONDS_CARD_RUN).toBe(DIAMONDS_REVIEW_CLEARED);
    expect(DIAMONDS_CARD_RUN).toBe(5);
  });

  it("pays a completed run, and the receipt says so", () => {
    const receipt = receiptFor([], run(CARD_RUN_MIN_GRADED, "10:00"), at(DAY, "10:00"));
    expect(receipt.diamonds).toEqual([{ label: "Card review", amount: DIAMONDS_CARD_RUN }]);
    expect(receipt.xp).toEqual([]);
    expect(balance([run(CARD_RUN_MIN_GRADED, "10:00")])).toBe(DIAMONDS_CARD_RUN);
  });

  it("pays nothing for a run opened and left before enough cards were graded", () => {
    expect(balance([run(CARD_RUN_MIN_GRADED - 1, "10:00")])).toBe(0);
    expect(balance([run(1, "10:00"), run(1, "10:01"), run(1, "10:02")])).toBe(0);
  });

  it("pays at most the day's cap of runs, and starts again the next local day", () => {
    const today = Array.from({ length: CARD_RUNS_PAID_PER_DAY + 2 }, (_, i) => run(CARD_RUN_MIN_GRADED, `1${i}:00`));
    expect(balance(today)).toBe(CARD_RUNS_PAID_PER_DAY * DIAMONDS_CARD_RUN);
    const tomorrow = [...today, run(CARD_RUN_MIN_GRADED, "09:00", "2026-10-02")];
    expect(balance(tomorrow, "2026-10-02")).toBe((CARD_RUNS_PAID_PER_DAY + 1) * DIAMONDS_CARD_RUN);
  });

  it("pays the same runs whatever order they were appended in", () => {
    const journal = [run(2, "08:00"), run(9, "09:00"), run(6, "10:00"), run(5, "11:00"), run(7, "12:00"), run(3, "13:00")];
    const reversed = [...journal].reverse();
    expect(deriveEconomy(reversed, at(DAY, "23:00"))).toEqual(deriveEconomy(journal, at(DAY, "23:00")));
    // The receipts, appended one at a time, sum to the balance.
    let sum = 0;
    journal.forEach((event, i) => {
      sum += receiptFor(journal.slice(0, i), event, event.at).diamonds.reduce((t, line) => t + line.amount, 0);
    });
    expect(sum).toBe(balance(journal));
  });

  it("rejects a malformed run from storage", () => {
    expect(isEconomyEvent(run(5, "10:00"))).toBe(true);
    for (const graded of [0, -1, 2.5, "5", undefined]) {
      expect(isEconomyEvent({ kind: "cards_reviewed", at: at(DAY, "10:00"), tz: TZ, graded }), String(graded)).toBe(false);
    }
  });
});
