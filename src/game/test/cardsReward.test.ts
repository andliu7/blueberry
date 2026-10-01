// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?flags="}
/**
 * The card run's reward cannot be farmed (round 5).
 *
 * The owner's rule: a finished run of 5 or more graded cards pays 5 diamonds,
 * at most 3 paying runs a day. The round 3 critic paid it three times in a
 * minute by pressing "Review all" on cards graded Good a minute earlier. So
 * only cards that were DUE when the run started count toward the 5.
 *
 * `?flags=` is load bearing: under vitest import.meta.env.DEV is true and the
 * beta flags would seed the journal with synthetic events, so an economy test
 * could pass on fiction. An explicit empty list turns them off.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { CARD_RUN_MIN_GRADED, CARD_RUNS_PAID_PER_DAY, DIAMONDS_CARD_RUN } from "@blueberry/economy";
import { createLocalProgress } from "../app/progress";
import { createLocalDecks, PERSONAL_DECK_ID } from "../cards/store";
import type { Card } from "../cards/types";
import { Run } from "../cards/ui/Run";
import { dueAtRunStart, dueGraded, rewardLine } from "../cards/ui/runStats";

const NOON = new Date(2026, 8, 29, 12, 0, 0, 0);
const MINUTE = 60 * 1000;

function card(id: string): Card {
  return { id, front: "f", back: "b", why: "", tags: [], source: { kind: "composed", at: NOON.toISOString() } };
}

beforeEach(() => {
  localStorage.clear();
});

describe("which cards a run's reward counts", () => {
  it("counts new cards and due cards, and not a card graded Good a minute ago", () => {
    const clock = { at: NOON };
    const decks = createLocalDecks({ now: () => clock.at });
    const cards = ["a", "b", "c", "d", "e", "f"].map(card);
    for (const each of cards) decks.saveCard(each, PERSONAL_DECK_ID);

    // The first run: six new cards, all due, all graded Good.
    const first = dueAtRunStart(cards, decks.getSnapshot(), clock.at);
    expect(first.size).toBe(6);
    for (const each of cards) decks.rate(each.id, "good");
    expect(dueGraded(cards.map((each) => each.id), first)).toBe(6);

    // "Review all" one minute later: nothing was due, so nothing counts.
    clock.at = new Date(NOON.getTime() + MINUTE);
    const cram = dueAtRunStart(cards, decks.getSnapshot(), clock.at);
    expect(cram.size).toBe(0);
    expect(dueGraded(cards.map((each) => each.id), cram)).toBe(0);
  });

  it("counts a card once however many times the run showed it", () => {
    expect(dueGraded(["a", "a", "b"], new Set(["a", "b"]))).toBe(2);
    expect(dueGraded(["a", "b", "x"], new Set(["a"]))).toBe(1);
  });

  it("pays a cram run nothing, end to end through the progress store", () => {
    const progress = createLocalProgress();
    progress.reset();
    const before = progress.getSnapshot().economy.diamonds.balance;
    expect(progress.finishCardRun(dueGraded(["a", "b", "c", "d", "e", "f"], new Set()))).toBe(0);
    expect(progress.getSnapshot().economy.diamonds.balance).toBe(before);
  });

  it("passes the due count, not the finished count, to the credit", () => {
    // From the repo root: under jsdom import.meta.url is not a file URL.
    const source = readFileSync(resolve(process.cwd(), "src/game/cards/ui/Run.tsx"), "utf8");
    expect(source).toMatch(/credit\?\.\(\s*dueGraded\(/);
    expect(source).not.toMatch(/credit\?\.\(\s*sessionSummary/);
  });
});

describe("what the summary says when a run pays nothing", () => {
  it("says the daily cap was reached after a full run past the cap", () => {
    const progress = createLocalProgress();
    progress.reset();
    for (let i = 0; i < CARD_RUNS_PAID_PER_DAY; i += 1) {
      expect(progress.finishCardRun(CARD_RUN_MIN_GRADED + 1)).toBe(DIAMONDS_CARD_RUN);
    }
    const paid = progress.finishCardRun(CARD_RUN_MIN_GRADED + 1);
    expect(paid).toBe(0);
    const line = rewardLine(CARD_RUN_MIN_GRADED + 1, paid);
    expect(line).toContain(`Today's ${CARD_RUNS_PAID_PER_DAY} paid runs are done`);
    expect(line).not.toContain(`A run of ${CARD_RUN_MIN_GRADED} or more`);
  });

  it("states the rule, and that only due cards count, after a short run", () => {
    const line = rewardLine(2, 0);
    expect(line).toContain(`A run of ${CARD_RUN_MIN_GRADED} or more cards earns ${DIAMONDS_CARD_RUN} diamonds`);
    expect(line).toContain("due");
  });

  it("says nothing extra when the run paid", () => {
    expect(rewardLine(CARD_RUN_MIN_GRADED, DIAMONDS_CARD_RUN)).toBeNull();
  });

  it("renders the rule line on an unpaid run's summary", () => {
    const html = renderToStaticMarkup(
      createElement(Run, { cards: [], source: createLocalDecks({ now: () => NOON }), journal: [], onExit: () => undefined }),
    );
    expect(html).toContain(`A run of ${CARD_RUN_MIN_GRADED} or more cards earns ${DIAMONDS_CARD_RUN} diamonds`);
  });
});
