/**
 * The review run: calling the product, the grade dock, the streak and the
 * swipe. Written with the 29 Sep rebuild; these are the run's promises.
 *
 * THE PINS THAT MATTER MOST:
 *   - The answer is among the options exactly once, and no wrong option can
 *     be told from it by counting atoms: each has the answer's elements and
 *     carbon count (round 2; the options are derived with RDKit by
 *     scripts/build_card_distractors.py).
 *   - Nothing about the answer reaches the front's markup: before the call,
 *     no option carries its product's name.
 *   - Every grade button carries the scheduler's own interval for that grade.
 *     This re-pins what the old ReviewSession screen promised.
 *
 * Rendering is react-dom/server, as elsewhere in this suite (no jsdom here);
 * clicks and swipes are pure functions (runStats.ts) and are tested as such.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
import { PREDICT_DISTRACTORS, PREDICT_GAPS } from "../cards/predictDistractors.generated";
import { predictionChoices, PREDICT_OPTIONS } from "../cards/ui/predict";
import { GradeDock, Run } from "../cards/ui/Run";
import { formulaParts, normaliseFormula } from "../cards/ui/formulaText";
import { sessionSummary, startSession, rateCurrent } from "../cards/ui/session";
import {
  calledLine,
  ratingForKey,
  runHeadline,
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

/** The elements a formula names, "C7H5ClO" -> C, H, Cl, O. Charge signs ignored. */
function elements(formula: string): Set<string> {
  return new Set(formula.match(/[A-Z][a-z]?/g) ?? []);
}

function carbons(formula: string): number {
  const match = formula.match(/C(\d*)(?![a-z])/);
  if (match === null) return 0;
  return match[1] === undefined || match[1] === "" ? 1 : Number(match[1]);
}

const PREDICTED = REACTIONS.filter((reaction) => !PREDICT_GAPS.includes(reaction.id));

describe("calling the product", () => {
  it("offers every reaction outside the named gaps three drawn options, the answer exactly once", () => {
    expect(PREDICTED.length).toBeGreaterThanOrEqual(REACTIONS.length - PREDICT_GAPS.length);
    for (const reaction of PREDICTED) {
      const options = predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS);
      expect(options, reaction.id).not.toBeNull();
      if (options === null) continue;
      expect(options).toHaveLength(PREDICT_OPTIONS);
      expect(options.filter((option) => option.correct).map((option) => option.key)).toEqual([reaction.id]);
    }
  });

  /* THE ATOM-COUNTING PIN, round 2. A critic picked the answer on four of six
     starter cards by finding the only option with the element the reagent
     brought (the only N after methylamine, the only Br after HBr). This fails
     whenever that is possible again, on any reaction. */
  it("never makes the answer the only option carrying an element the reagent brings", () => {
    for (const reaction of PREDICTED) {
      const options = predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS) ?? [];
      const fromStart = new Set(reaction.reactant_formulas.flatMap((formula) => [...elements(formula)]));
      const brought = [...elements(reaction.product_formula)].filter((element) => !fromStart.has(element));
      for (const element of brought) {
        const carriers = options.filter((option) => elements(option.formula).has(element));
        expect(carriers.length, `${reaction.id}: ${element}`).toBeGreaterThan(1);
      }
    }
  });

  it("gives every wrong option exactly the answer's elements and carbon count", () => {
    for (const reaction of PREDICTED) {
      const answer = elements(reaction.product_formula);
      for (const option of predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS) ?? []) {
        if (option.correct) continue;
        expect([...elements(option.formula)].sort(), `${reaction.id} ${option.label}`).toEqual([...answer].sort());
        expect(carbons(option.formula), `${reaction.id} ${option.label}`).toBe(carbons(reaction.product_formula));
      }
    }
  });

  it("offers two different wrong structures, neither of them the answer", () => {
    for (const reaction of PREDICTED) {
      const wrong = PREDICT_DISTRACTORS[reaction.id] ?? [];
      expect(new Set(wrong.map((d) => d.smiles)).size, reaction.id).toBe(wrong.length);
      for (const distractor of wrong) expect(distractor.smiles, reaction.id).not.toBe(reaction.product);
    }
  });

  it("ships every drawing it points at, in both themes", () => {
    for (const reaction of PREDICTED) {
      for (const option of predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS) ?? []) {
        for (const path of [option.light, option.dark]) {
          expect(path, `${reaction.id} ${option.label}`).toBeDefined();
          expect(existsSync(fileURLToPath(new URL(`../../../public/${path}`, import.meta.url))), path).toBe(true);
        }
      }
    }
  });

  it("puts the 1,2 product beside the 1,4 answer on the diene card, derived rather than typed", () => {
    const kinds = (PREDICT_DISTRACTORS["diene-1-4-addition"] ?? []).map((d) => d.kind);
    expect(kinds).toContain("allylic");
  });

  it("gives a named gap no predict step rather than a weak one", () => {
    for (const id of PREDICT_GAPS) {
      const reaction = REACTIONS.find((entry) => entry.id === id);
      expect(reaction, id).toBeDefined();
      expect(predictionChoices(reactionCardFromStaged(reaction!, NOON), REACTIONS)).toBeNull();
    }
  });

  it("deals the same options in the same order every time, and moves the answer between cards", () => {
    const card = registryCard("wolff-kishner");
    expect(predictionChoices(card, REACTIONS)).toEqual(predictionChoices(card, REACTIONS));
    const positions = new Set(
      PREDICTED.map((reaction) =>
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
  it("asks for the call, names no option, and gives the card no flip of its own", () => {
    const card = registryCard("gilman-to-ketone");
    const source = createLocalDecks({ now: () => NOON });
    const html = renderToStaticMarkup(createElement(Run, { cards: [card], source, journal: [], onExit: () => undefined }));
    expect(html).toContain("Call the product");
    expect(html).toContain("I don&#x27;t know yet");
    for (const option of predictionChoices(card, REACTIONS) ?? []) {
      expect(html.includes(option.label), option.label).toBe(false);
    }
    // The pick is the only way to the back: no reveal button, no flip button.
    expect(html).not.toContain('aria-label="Reveal the answer"');
    expect(html).not.toContain("Just flip");
    expect(html).toContain('aria-label="End review"');
    expect(html).toContain("1 of 1");
  });

  it("offers a plain Show the answer on a card with nothing to call", () => {
    const own = cardFromDraft({ setup: "my ketone", conditions: "NaBH4", product: "my alcohol" }, NOON);
    const html = renderToStaticMarkup(
      createElement(Run, { cards: [own], source: createLocalDecks({ now: () => NOON }), journal: [], onExit: () => undefined }),
    );
    expect(html).toContain("Show the answer");
    expect(html).toContain('aria-label="Reveal the answer"');
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

describe("the summary hears the calls", () => {
  function finished(ratings: readonly (typeof RATINGS)[number][]) {
    let state = startSession(ratings.map((_, index) => ({
      id: `c${index}`, front: "f", back: "b", why: "", tags: [], source: { kind: "composed" as const, at: "" },
    })));
    for (const rating of ratings) state = rateCurrent(state, rating)?.state ?? state;
    return state;
  }

  it("never calls a run with a wrong call straight through, even graded Good", () => {
    const state = finished(["good", "good"]);
    const stats = runStats(state.ratings, [{ cardId: "c0", correct: false }, { cardId: "c1", correct: true }]);
    expect(runHeadline(sessionSummary(state), stats)).toBe("One call to learn from");
    expect(runHeadline(sessionSummary(state), stats)).not.toMatch(/straight through/i);
  });

  it("says so when every call was right, and falls back to the grades with no calls", () => {
    const state = finished(["good", "easy"]);
    expect(runHeadline(sessionSummary(state), runStats(state.ratings, [{ cardId: "c0", correct: true }]))).toBe(
      "Every call right, straight through",
    );
    expect(runHeadline(sessionSummary(state), runStats(state.ratings, []))).toBe("Straight through, no repeats");
  });
});

describe("reagents set as formulas, never as SMILES", () => {
  const set = (text: string) => formulaParts(normaliseFormula(text));

  it("subscripts counts and superscripts charges", () => {
    expect(set("(CH3)2CuLi")).toEqual([
      { text: "(CH", kind: "plain" },
      { text: "3", kind: "sub" },
      { text: ")", kind: "plain" },
      { text: "2", kind: "sub" },
      { text: "CuLi", kind: "plain" },
    ]);
    expect(set("H3O+").map((part) => part.kind)).toEqual(["plain", "sub", "plain", "sup"]);
  });

  it("writes a triple bond as a triple bond and a minus as a minus", () => {
    expect(normaliseFormula("CH3C#C-")).toBe("CH3C≡C−");
    expect(normaliseFormula("OH-")).toBe("OH−");
  });

  it("leaves names and prose alone", () => {
    for (const text of ["buta-1,3-diene", "2-phenylpropan-2-ol", "pH 4 to 5", "N-methyl imine", "cyclopentene + NBS"]) {
      expect(normaliseFormula(text)).toBe(text);
      expect(set(text).every((part) => part.kind === "plain"), text).toBe(true);
    }
  });

  it("puts no SMILES syntax on any registry card's reagent line", () => {
    for (const reaction of REACTIONS) {
      const card = reactionCardFromStaged(reaction, NOON);
      for (const step of card.reaction?.reagentSteps ?? []) {
        expect(normaliseFormula(step.label), `${reaction.id}: ${step.label}`).not.toMatch(/[#[\]@\\]/);
      }
    }
  });
});
