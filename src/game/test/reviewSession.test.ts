/**
 * The review session's reducer, and the words on the buttons.
 *
 * The one behaviour worth pinning hardest is the requeue cap. Pressing Again
 * puts a card back into this session, but only once, because the counter at
 * the top of the screen promises a session length and an unbounded queue makes
 * that number a lie. A test that only pressed Again once would never see the
 * cap, so the second press is exercised explicitly.
 */

import { describe, expect, it } from "vitest";

import type { Card } from "../cards/types";
import {
  currentCardId,
  isFinished,
  rateCurrent,
  reveal,
  reviewDiamonds,
  sessionCounter,
  sessionProgress,
  sessionSummary,
  startSession,
  summaryHeadline,
  REVIEW_DIAMONDS_CAP,
} from "../cards/ui/session";
import { intervalLabel } from "../cards/ui/intervalLabel";

function card(id: string): Card {
  return {
    id,
    front: `front ${id}`,
    back: `back ${id}`,
    why: "",
    tags: [],
    source: { kind: "lesson", lessonId: "l1", beatId: `b-${id}` },
  };
}

const THREE = [card("a"), card("b"), card("c")];

describe("starting a session", () => {
  it("keeps the order it was given and counts what it promised", () => {
    const state = startSession(THREE);
    expect(state.queue).toEqual(["a", "b", "c"]);
    expect(state.total).toBe(3);
    expect(currentCardId(state)).toBe("a");
    expect(isFinished(state)).toBe(false);
  });

  it("drops a duplicate rather than showing one card twice", () => {
    const state = startSession([card("a"), card("b"), card("a")]);
    expect(state.queue).toEqual(["a", "b"]);
    expect(state.total).toBe(2);
  });

  it("an empty session is finished the moment it starts", () => {
    const state = startSession([]);
    expect(isFinished(state)).toBe(true);
    expect(sessionProgress(state)).toBe(1);
  });
});

describe("reveal", () => {
  it("is idempotent, so a double tap cannot skip a card", () => {
    const once = reveal(startSession(THREE));
    const twice = reveal(once);
    expect(once.revealed).toBe(true);
    expect(twice).toBe(once);
    expect(currentCardId(twice)).toBe("a");
  });
});

describe("rating", () => {
  it("good moves on and counts the card as finished", () => {
    const outcome = rateCurrent(startSession(THREE), "good");
    expect(outcome).not.toBeNull();
    expect(outcome!.cameBack).toBe(false);
    expect(outcome!.state.queue).toEqual(["b", "c"]);
    expect(outcome!.state.finished).toEqual(["a"]);
    expect(outcome!.state.revealed).toBe(false);
  });

  it("again sends the card to the back and does not count it yet", () => {
    const outcome = rateCurrent(startSession(THREE), "again");
    expect(outcome!.cameBack).toBe(true);
    expect(outcome!.state.queue).toEqual(["b", "c", "a"]);
    expect(outcome!.state.finished).toEqual([]);
  });

  it("a card comes back at most once, so the session terminates", () => {
    let state = startSession([card("a")]);
    const first = rateCurrent(state, "again");
    state = first!.state;
    expect(state.queue).toEqual(["a"]);

    const second = rateCurrent(state, "again");
    expect(second!.cameBack).toBe(false);
    expect(second!.state.queue).toEqual([]);
    expect(second!.state.finished).toEqual(["a"]);
    expect(isFinished(second!.state)).toBe(true);
  });

  it("records every press, including the ones that did not finish a card", () => {
    let state = startSession([card("a")]);
    state = rateCurrent(state, "again")!.state;
    state = rateCurrent(state, "good")!.state;
    expect(state.ratings).toEqual([
      { cardId: "a", rating: "again" },
      { cardId: "a", rating: "good" },
    ]);
  });

  it("returns null when there is nothing on screen", () => {
    expect(rateCurrent(startSession([]), "good")).toBeNull();
  });
});

describe("what the screen reports", () => {
  it("the counter names the card being answered, never past the total", () => {
    let state = startSession(THREE);
    expect(sessionCounter(state)).toBe("1 of 3");
    state = rateCurrent(state, "good")!.state;
    expect(sessionCounter(state)).toBe("2 of 3");
    state = rateCurrent(state, "good")!.state;
    state = rateCurrent(state, "good")!.state;
    expect(sessionCounter(state)).toBe("3 of 3");
    expect(sessionProgress(state)).toBe(1);
  });

  it("summarises what actually happened, and the headline is specific to it", () => {
    let state = startSession(THREE);
    state = rateCurrent(state, "good")!.state;
    state = rateCurrent(state, "again")!.state; // b goes to the back
    state = rateCurrent(state, "easy")!.state; // c
    state = rateCurrent(state, "hard")!.state; // b again, finished this time

    const summary = sessionSummary(state);
    expect(summary.reviewed).toBe(3);
    expect(summary.cameBack).toBe(1);
    // a good, c easy. b's LAST rating was hard, so it is not counted as solid.
    expect(summary.solid).toBe(2);
    expect(summaryHeadline(summary)).toBe("One card needed a second look");
  });

  it("a clean run says so", () => {
    let state = startSession(THREE);
    for (let i = 0; i < 3; i += 1) state = rateCurrent(state, "good")!.state;
    expect(summaryHeadline(sessionSummary(state))).toBe("Straight through, no repeats");
  });
});

describe("the display reward", () => {
  it("is one per card and capped, and never goes negative", () => {
    expect(reviewDiamonds(0)).toBe(0);
    expect(reviewDiamonds(5)).toBe(5);
    expect(reviewDiamonds(1000)).toBe(REVIEW_DIAMONDS_CAP);
  });
});

describe("interval labels", () => {
  it("reads the scheduler's numbers in words a person uses", () => {
    // scheduler.AGAIN_INTERVAL_DAYS is ten minutes expressed in days.
    expect(intervalLabel(10 / (24 * 60))).toBe("10 min");
    expect(intervalLabel(1)).toBe("1 day");
    expect(intervalLabel(4)).toBe("4 days");
    expect(intervalLabel(7)).toBe("1 week");
    expect(intervalLabel(21)).toBe("3 weeks");
    expect(intervalLabel(60)).toBe("2 months");
    expect(intervalLabel(365)).toBe("1 year");
  });

  it("never rounds down to zero, because a zero would read as a bug", () => {
    expect(intervalLabel(0.0001)).toBe("1 min");
    expect(intervalLabel(0)).toBe("now");
    expect(intervalLabel(Number.NaN)).toBe("now");
  });
});
