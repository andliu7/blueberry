/**
 * The review run: calling the product, the grade dock, the streak and the
 * swipe. Written with the 29 Sep rebuild; these are the run's promises.
 *
 * THE PINS THAT MATTER MOST:
 *   - Every option offered as a prediction is a real registry product, the
 *     answer is among them exactly once, and no wrong option is the same
 *     compound as the answer. A distractor that is secretly correct would
 *     teach the opposite of the truth.
 *   - Nothing about the answer reaches the front's markup: before the call,
 *     no option carries its product's name.
 *   - Every grade button carries the scheduler's own interval for that grade.
 *     This re-pins what the old ReviewSession screen promised.
 *
 * Rendering is react-dom/server, as elsewhere in this suite (no jsdom here);
 * clicks and swipes are pure functions (runStats.ts) and are tested as such.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { REACTIONS } from "../../data/reactions";
import { reactionCardFromStaged } from "../cards/reactionCard";
import { nextInterval, startCard } from "../cards/scheduler";
import { createLocalDecks } from "../cards/store";
import type { Card } from "../cards/types";
import { RATING_LABELS, RATINGS } from "../cards/types";
import { cardFromDraft } from "../cards/ui/composer";
import { intervalLabel } from "../cards/ui/intervalLabel";
import { predictionChoices, PREDICT_OPTIONS } from "../cards/ui/predict";
import { GradeDock, Run } from "../cards/ui/Run";
import {
  calledLine,
  ratingForKey,
  runStats,
  suggestedRating,
  SWIPE_MIN_PX,
  swipeRating,
} from "../cards/ui/runStats";

class MemoryStorage {
  private readonly entries = new Map<string, string>();
  get length(): number {
    return this.entries.size;
  }
  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
  removeItem(key: string): void {
    this.entries.delete(key);
  }
  clear(): void {
    this.entries.clear();
  }
  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage() as unknown as Storage;
});

const NOON = new Date(2026, 8, 29, 12, 0, 0, 0);

function registryCard(id: string): Card {
  const reaction = REACTIONS.find((entry) => entry.id === id);
  expect(reaction, id).toBeDefined();
  return reactionCardFromStaged(reaction!, NOON);
}

describe("calling the product", () => {
  it("offers every registry card three drawn options, the answer exactly once", () => {
    for (const reaction of REACTIONS) {
      const card = reactionCardFromStaged(reaction, NOON);
      const options = predictionChoices(card, REACTIONS);
      expect(options, reaction.id).not.toBeNull();
      if (options === null) continue;
      expect(options).toHaveLength(PREDICT_OPTIONS);
      expect(options.filter((option) => option.correct).map((option) => option.reactionId)).toEqual([reaction.id]);
    }
  });

  it("never offers a wrong option that is the same compound as the answer", () => {
    for (const reaction of REACTIONS) {
      const options = predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS) ?? [];
      const products = options.map((option) => REACTIONS.find((entry) => entry.id === option.reactionId)?.product);
      expect(new Set(products).size, reaction.id).toBe(products.length);
    }
  });

  it("draws every option from the registry's own RDKit art, never anything else", () => {
    for (const reaction of REACTIONS) {
      for (const option of predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS) ?? []) {
        const source = REACTIONS.find((entry) => entry.id === option.reactionId);
        expect(source).toBeDefined();
        expect(option.light).toBe(source?.art.product_light);
        expect(option.dark).toBe(source?.art.product_dark);
        expect(option.label).toBe(source?.product_label);
      }
    }
  });

  it("prefers siblings: reactions that start from the same material", () => {
    const options = predictionChoices(registryCard("nabh4-reduction"), REACTIONS) ?? [];
    const start = REACTIONS.find((entry) => entry.id === "nabh4-reduction")?.reactants[0];
    for (const option of options) {
      expect(REACTIONS.find((entry) => entry.id === option.reactionId)?.reactants[0]).toBe(start);
    }
  });

  it("deals the same options in the same order every time, and moves the answer between cards", () => {
    const card = registryCard("wolff-kishner");
    expect(predictionChoices(card, REACTIONS)).toEqual(predictionChoices(card, REACTIONS));
    const positions = new Set(
      REACTIONS.map((reaction) =>
        (predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS) ?? []).findIndex((option) => option.correct),
      ),
    );
    expect(positions.size).toBe(PREDICT_OPTIONS);
  });

  it("offers nothing to predict on a student's own card, which has no drawing", () => {
    const own = cardFromDraft({ setup: "my ketone", conditions: "NaBH4", product: "my alcohol" }, NOON);
    expect(predictionChoices(own, REACTIONS)).toBeNull();
  });
});

describe("the run's first frame", () => {
  it("asks for the call and names no product before it is made", () => {
    const card = registryCard("gilman-to-ketone");
    const source = createLocalDecks({ now: () => NOON });
    const html = renderToStaticMarkup(createElement(Run, { cards: [card], source, journal: [], onExit: () => undefined }));
    expect(html).toContain("Call the product");
    expect(html).toContain("Just flip it");
    for (const option of predictionChoices(card, REACTIONS) ?? []) {
      expect(html.includes(option.label), option.label).toBe(false);
    }
    // The run is the whole screen: its own exit, and a counter for the promise.
    expect(html).toContain('aria-label="End review"');
    expect(html).toContain("1 of 1");
  });

  it("offers a plain Show the answer on a card with nothing to call", () => {
    const own = cardFromDraft({ setup: "my ketone", conditions: "NaBH4", product: "my alcohol" }, NOON);
    const html = renderToStaticMarkup(
      createElement(Run, { cards: [own], source: createLocalDecks({ now: () => NOON }), journal: [], onExit: () => undefined }),
    );
    expect(html).toContain("Show the answer");
    expect(html.includes("Call the product")).toBe(false);
  });
});

describe("the grade dock", () => {
  it("carries the scheduler's own interval on every grade", () => {
    for (const state of [startCard("c", NOON), { ...startCard("c", NOON), interval: 8, lastRating: "good" as const }]) {
      const html = renderToStaticMarkup(createElement(GradeDock, { reviewState: state, suggested: null, onPress: () => undefined }));
      for (const rating of RATINGS) {
        const interval = nextInterval(state, rating);
        expect(html).toContain(`${RATING_LABELS[rating]}, comes back in ${intervalLabel(interval)}`);
        expect(html).toContain(intervalLabel(interval, "short"));
      }
    }
  });

  it("marks the suggested grade, and only that one", () => {
    const html = renderToStaticMarkup(
      createElement(GradeDock, { reviewState: startCard("c", NOON), suggested: "good", onPress: () => undefined }),
    );
    expect(html.match(/grade-chip--suggested/g)).toHaveLength(1);
    expect(html).toContain("Good, comes back in");
    expect(html).toContain(", suggested");
  });

  it("never paints Again in the error ramp", () => {
    const html = renderToStaticMarkup(
      createElement(GradeDock, { reviewState: startCard("c", NOON), suggested: null, onPress: () => undefined }),
    );
    expect(html).not.toMatch(/error|danger|red-/);
  });
});

describe("streaks, calls and swipes", () => {
  it("counts consecutive good or easy, restarts quietly on hard or again", () => {
    const stats = runStats(
      ["good", "easy", "hard", "good", "good", "good", "again"].map((rating, index) => ({
        cardId: `c${index}`,
        rating: rating as (typeof RATINGS)[number],
      })),
      [],
    );
    expect(stats.bestStreak).toBe(3);
    expect(stats.streak).toBe(0);
    expect(stats.split).toEqual({ again: 1, hard: 1, good: 4, easy: 1 });
  });

  it("tallies calls, and says nothing when none were made", () => {
    expect(calledLine(runStats([], []))).toBeNull();
    const stats = runStats([], [
      { cardId: "a", correct: true },
      { cardId: "b", correct: false },
    ]);
    expect(calledLine(stats)).toBe("Called it 1 of 2");
  });

  it("points a right call at Good and a wrong one at Again, and nothing at no call", () => {
    expect(suggestedRating(true)).toBe("good");
    expect(suggestedRating(false)).toBe("again");
    expect(suggestedRating(null)).toBeNull();
  });

  it("grades a swipe only past the threshold, right Good and left Again", () => {
    expect(swipeRating(SWIPE_MIN_PX - 1, 200)).toBeNull();
    expect(swipeRating(SWIPE_MIN_PX, 200)).toBe("good");
    expect(swipeRating(-SWIPE_MIN_PX, 200)).toBe("again");
    // On a wide card the threshold is a fraction of the width, not the floor.
    expect(swipeRating(SWIPE_MIN_PX + 1, 1000)).toBeNull();
  });

  it("maps keys 1 to 4 onto the grades in button order, and nothing else", () => {
    expect(["1", "2", "3", "4"].map(ratingForKey)).toEqual([...RATINGS]);
    for (const key of ["0", "5", "12", "a", " ", "Enter"]) expect(ratingForKey(key), key).toBeNull();
  });
});
