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
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/* ------------------------------------------------------------------ */
/* Round 6: the two farms the round 4 critic found, driven through the  */
/* real Run component, button by button.                                */
/* ------------------------------------------------------------------ */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function lessonCard(id: string): Card {
  return { id, front: "f", back: "b", why: "", tags: [], source: { kind: "lesson", lessonId: "l1", beatId: `b-${id}` } };
}

/**
 * Mounts Run over `cards`, grades every showing with `rating` (a card graded
 * Again comes back once, so it is graded twice), and returns what Run asked
 * the economy to credit. Plain cards only: "Show the answer", then a grade.
 */
function runThrough(
  cards: readonly Card[],
  source: ReturnType<typeof createLocalDecks>,
  rating: string,
  summary: string[] = [],
): number[] {
  const credited: number[] = [];
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  act(() => {
    root.render(createElement(Run, { cards, source, journal: [], onExit: () => undefined, credit: (graded: number) => { credited.push(graded); return 0; } }));
  });
  for (let guard = 0; guard < cards.length * 3 && host.querySelector('[aria-label="Review finished"]') === null; guard += 1) {
    const show = [...host.querySelectorAll("button")].find((button) => button.textContent === "Show the answer");
    act(() => show?.click());
    const grade = host.querySelector<HTMLButtonElement>(`button[aria-label^="${rating},"]`);
    expect(grade, `the ${rating} button`).not.toBeNull();
    act(() => grade!.click());
  }
  expect(host.querySelector('[aria-label="Review finished"]')).not.toBeNull();
  summary.push(host.textContent ?? "");
  act(() => root.unmount());
  host.remove();
  return credited;
}

describe("the reward cannot be farmed (round 6)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pays nothing for five brand new cards the student just wrote in the composer", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON);
    const decks = createLocalDecks();
    const junk = ["j1", "j2", "j3", "j4", "j5"].map(card);
    for (const each of junk) decks.saveCard(each, PERSONAL_DECK_ID);
    expect(runThrough(junk, decks, "Good")).toEqual([0]);
  });

  it("pays nothing for cards the student lapsed on purpose and reviewed ten minutes later", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON);
    const decks = createLocalDecks();
    const cards = ["a", "b", "c", "d", "e", "f"].map(lessonCard);
    for (const each of cards) decks.saveCard(each, PERSONAL_DECK_ID);
    // Day 0 and day 1: two honest runs graduate every card to 3 days.
    runThrough(cards, decks, "Good");
    vi.setSystemTime(new Date(NOON.getTime() + 24 * 60 * MINUTE + MINUTE));
    expect(runThrough(cards, decks, "Good")).toEqual([6]);
    // The farm: "Review all" the same day, Again on every not-due card...
    vi.setSystemTime(new Date(NOON.getTime() + 24 * 60 * MINUTE + 2 * MINUTE));
    expect(runThrough(cards, decks, "Again")).toEqual([0]);
    // ...then wait out the ten minute step and review the relearning cards.
    vi.setSystemTime(new Date(NOON.getTime() + 24 * 60 * MINUTE + 13 * MINUTE));
    expect(runThrough(cards, decks, "Good")).toEqual([0]);
  });

  it("still pays a first look at five built-in cards, and a due review of graduated ones", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON);
    const decks = createLocalDecks();
    const cards = ["a", "b", "c", "d", "e"].map(lessonCard);
    for (const each of cards) decks.saveCard(each, PERSONAL_DECK_ID);
    expect(runThrough(cards, decks, "Good")).toEqual([5]);
    vi.setSystemTime(new Date(NOON.getTime() + 24 * 60 * MINUTE + MINUTE));
    expect(runThrough(cards, decks, "Good")).toEqual([5]);
  });

  it("counts a composer card once it has graduated and comes due", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON);
    const decks = createLocalDecks();
    const own = ["o1", "o2", "o3", "o4", "o5"].map(card);
    for (const each of own) decks.saveCard(each, PERSONAL_DECK_ID);
    expect(runThrough(own, decks, "Good")).toEqual([0]);
    vi.setSystemTime(new Date(NOON.getTime() + 24 * 60 * MINUTE + MINUTE));
    expect(runThrough(own, decks, "Good")).toEqual([5]);
  });
});

describe("the summary line says what the scheduler did (round 6)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not claim longer intervals after a cram that changed none of them", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON);
    const decks = createLocalDecks();
    const cards = ["a", "b", "c", "d", "e", "f"].map(lessonCard);
    for (const each of cards) decks.saveCard(each, PERSONAL_DECK_ID);
    const first: string[] = [];
    runThrough(cards, decks, "Good", first);
    // The first run really did move every card from new to one day.
    expect(first[0]).toContain("Those intervals just got longer");
    const before = JSON.stringify(decks.getSnapshot().review);
    vi.setSystemTime(new Date(NOON.getTime() + MINUTE));
    const cram: string[] = [];
    runThrough(cards, decks, "Good", cram);
    expect(JSON.stringify(decks.getSnapshot().review)).toBe(before);
    expect(cram[0]).not.toContain("got longer");
    expect(cram[0]).toContain("schedules did not change");
  });

  it("names the split when some intervals grew and others shrank", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON);
    const decks = createLocalDecks();
    const cards = ["a", "b"].map(lessonCard);
    for (const each of cards) decks.saveCard(each, PERSONAL_DECK_ID);
    runThrough(cards, decks, "Good");
    vi.setSystemTime(new Date(NOON.getTime() + 24 * 60 * MINUTE + MINUTE));
    // Card a: Good (1 d to 3 d). Card b: Again twice (1 d to 10 min).
    const text: string[] = [];
    const credited: number[] = [];
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(createElement(Run, { cards, source: decks, journal: [], onExit: () => undefined, credit: (g: number) => { credited.push(g); return 0; } }));
    });
    const grades = ["Good", "Again", "Again"];
    for (const rating of grades) {
      const show = [...host.querySelectorAll("button")].find((button) => button.textContent === "Show the answer");
      act(() => show?.click());
      act(() => host.querySelector<HTMLButtonElement>(`button[aria-label^="${rating},"]`)!.click());
    }
    text.push(host.textContent ?? "");
    act(() => root.unmount());
    host.remove();
    expect(text[0]).toContain("1 now waits longer");
    expect(text[0]).toContain("1 comes back sooner");
    expect(text[0]).not.toContain("Those intervals just got longer");
  });
});
