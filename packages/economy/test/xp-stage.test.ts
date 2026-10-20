/**
 * XP, owner 2026-10-20: every lesson, quiz, practice run and review clear
 * awards XP, and the HUD says "N XP to the next stage!". The stage curve is
 * rules.ts's (stageFor), documented in docs/ECONOMY.md, XP stages.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor } from "../src/derive.ts";
import type { EconomyEvent, NodeKind } from "../src/journal.ts";
import { XP_STAGE_STEP, stageFor } from "../src/rules.ts";
import { at, cleared, TZ } from "./helpers.ts";

const DAY = "2026-10-20";
const NOW = at(DAY, "22:00");

describe("the stage curve", () => {
  it("opens stage s + 1 after XP_STAGE_STEP * s more XP: 0, 50, 150, 300, 500", () => {
    expect(XP_STAGE_STEP).toBe(50);
    expect(stageFor(0)).toEqual({ stage: 1, startXp: 0, nextXp: 50, toNext: 50 });
    expect(stageFor(49)).toEqual({ stage: 1, startXp: 0, nextXp: 50, toNext: 1 });
    expect(stageFor(50)).toEqual({ stage: 2, startXp: 50, nextXp: 150, toNext: 100 });
    expect(stageFor(149).stage).toBe(2);
    expect(stageFor(150)).toEqual({ stage: 3, startXp: 150, nextXp: 300, toNext: 150 });
    expect(stageFor(300).stage).toBe(4);
    expect(stageFor(500).stage).toBe(5);
  });

  it("never says zero XP to go, and reads nonsense as nothing earned", () => {
    for (let total = 0; total < 800; total += 7) expect(stageFor(total).toNext).toBeGreaterThan(0);
    expect(stageFor(-5)).toEqual(stageFor(0));
    expect(stageFor(Number.NaN)).toEqual(stageFor(0));
  });

  it("is on the snapshot, read off the same total the HUD shows", () => {
    const journal = [1, 2, 3, 4, 5].map((i) => cleared(`n${i}`, "concept", DAY, { time: `10:0${i}` }));
    const xp = deriveEconomy(journal, NOW).xp;
    // Five concept first clears (50) plus the regular goal bonus (10).
    expect(xp.total).toBe(60);
    expect(xp).toMatchObject({ stage: 2, stageStartXp: 50, nextStageXp: 150, toNextStage: 90 });
  });
});

describe("every clear path awards XP", () => {
  const xpOf = (history: readonly EconomyEvent[], event: EconomyEvent) =>
    receiptFor(history, event, NOW).xp.reduce((sum, line) => sum + line.amount, 0);

  it("pays a first clear and a replay of every lesson kind", () => {
    const kinds: readonly NodeKind[] = ["concept", "reaction", "branch", "tutorial", "intro", "review"];
    for (const kind of kinds) {
      const first = cleared(`${kind}-1`, kind, DAY, { time: "10:00" });
      expect(xpOf([], first), kind).toBeGreaterThan(0);
      expect(xpOf([first], cleared(`${kind}-1`, kind, DAY, { time: "11:00" })), `${kind} replay`).toBeGreaterThan(0);
    }
  });

  it("pays a quiz pass, a Challenge pass and a completed flashcard run", () => {
    const quiz: EconomyEvent = { kind: "quiz_passed", at: at(DAY, "10:00"), tz: TZ, unitId: "u1", flawless: false };
    expect(xpOf([], quiz)).toBeGreaterThan(0);
    const clear = cleared("n1", "concept", DAY, { time: "10:00" });
    const challenge: EconomyEvent = { kind: "challenge_passed", at: at(DAY, "11:00"), tz: TZ, nodeId: "n1" };
    expect(xpOf([clear], challenge)).toBeGreaterThan(0);
    const cards: EconomyEvent = { kind: "cards_reviewed", at: at(DAY, "12:00"), tz: TZ, graded: 5 };
    expect(xpOf([], cards)).toBeGreaterThan(0);
  });
});
