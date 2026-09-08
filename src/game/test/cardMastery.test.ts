/**
 * Mastery, the retention fraction the deck tiles and the fanned cards draw.
 *
 * THE PROPERTY THAT MATTERS: mastery is derived from the scheduler's own
 * interval and nothing else, so the thin green bar can never disagree with
 * the schedule it summarises. The ramp's two edges are pinned, the learning
 * boundary against the scheduler's own GRADUATING_INTERVAL_DAYS rather than
 * a copied literal, and the last dot is asserted unearned until maturity,
 * because 4.6 dots drawn as 5 is a promise the schedule has not kept.
 */

import { describe, expect, it } from "vitest";

import {
  LEARNING_MASTERY,
  MASTERY_DOTS,
  MATURE_INTERVAL_DAYS,
  cardMastery,
  deckMastery,
  masteryDots,
} from "../cards/ui/mastery";
import { GRADUATING_INTERVAL_DAYS } from "../cards/scheduler";
import type { Card, DeckSnapshot, ReviewState } from "../cards/types";
import { EMPTY_DECKS } from "../cards/types";

function state(interval: number, lastRating: ReviewState["lastRating"] = "good"): ReviewState {
  return { cardId: "c", interval, ease: 2.5, dueAt: "2026-08-27T12:00:00.000Z", lastRating };
}

describe("one card's fraction", () => {
  it("a card nobody has rated is zero, whether missing or never pressed", () => {
    expect(cardMastery(undefined)).toBe(0);
    expect(cardMastery(state(0, null))).toBe(0);
  });

  it("a learning card is met but not retained, at the flat learning step", () => {
    expect(cardMastery(state(GRADUATING_INTERVAL_DAYS / 2))).toBe(LEARNING_MASTERY);
    expect(cardMastery(state(0.007, "again"))).toBe(LEARNING_MASTERY);
  });

  it("graduation starts the linear ramp at the scheduler's own boundary", () => {
    expect(cardMastery(state(GRADUATING_INTERVAL_DAYS))).toBeCloseTo(
      GRADUATING_INTERVAL_DAYS / MATURE_INTERVAL_DAYS,
    );
  });

  it("maturity pegs at one and stays there", () => {
    expect(cardMastery(state(MATURE_INTERVAL_DAYS))).toBe(1);
    expect(cardMastery(state(300))).toBe(1);
  });
});

describe("a deck's fraction", () => {
  it("an empty deck is zero, not NaN", () => {
    const snapshot: DeckSnapshot = {
      ...EMPTY_DECKS,
      decks: { d: { id: "d", title: "Empty", kind: "personal", cardIds: [] } },
    };
    expect(deckMastery(snapshot, "d")).toBe(0);
    expect(deckMastery(EMPTY_DECKS, "missing")).toBe(0);
  });

  it("unrated cards count at zero: five mature cards of forty is not a full bar", () => {
    const card = (id: string): Card => ({
      id,
      front: "f",
      back: "b",
      why: "w",
      tags: [],
      source: { kind: "lesson", lessonId: "l", beatId: "b" },
    });
    const snapshot: DeckSnapshot = {
      ...EMPTY_DECKS,
      cards: { a: card("a"), b: card("b") },
      decks: { d: { id: "d", title: "Half", kind: "personal", cardIds: ["a", "b"] } },
      review: { a: { ...state(MATURE_INTERVAL_DAYS), cardId: "a" } },
    };
    expect(deckMastery(snapshot, "d")).toBeCloseTo(0.5);
  });
});

describe("the dots on a fanned card", () => {
  it("zero for an unmet card, all five only at maturity", () => {
    expect(masteryDots(undefined)).toBe(0);
    expect(masteryDots(state(MATURE_INTERVAL_DAYS))).toBe(MASTERY_DOTS);
  });

  it("the last dot is unearned below maturity, however close", () => {
    expect(masteryDots(state(MATURE_INTERVAL_DAYS - 1))).toBeLessThan(MASTERY_DOTS);
  });

  it("dots never exceed the row and never go negative", () => {
    for (const interval of [0, 0.007, 1, 3, 8, 20, 21, 100]) {
      const dots = masteryDots(state(interval));
      expect(dots).toBeGreaterThanOrEqual(0);
      expect(dots).toBeLessThanOrEqual(MASTERY_DOTS);
    }
  });
});
