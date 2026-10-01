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

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CARD_RUN_MIN_GRADED, DIAMONDS_CARD_RUN } from "@blueberry/economy";
import { REACTIONS } from "../../data/reactions";
import { createLocalProgress } from "../app/progress";
import { reactionCardFromStaged } from "../cards/reactionCard";
import { nextInterval, startCard } from "../cards/scheduler";
import { createLocalDecks } from "../cards/store";
import type { Card } from "../cards/types";
import { RATING_LABELS, RATINGS } from "../cards/types";
import { cardFromDraft } from "../cards/ui/composer";
import { intervalLabel } from "../cards/ui/intervalLabel";
import { PREDICT_ANSWERS, PREDICT_DISTRACTORS, PREDICT_GAPS } from "../cards/predictDistractors.generated";
import { predictionChoices, PREDICT_OPTIONS } from "../cards/ui/predict";
import { GradeDock, Run } from "../cards/ui/Run";
import { formulaParts, isFormulaWord, normaliseFormula, proseParts } from "../cards/ui/formulaText";
import { CardFace } from "../cards/ui/CardFace";
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

/** Carbons in a SMILES string, aliphatic and aromatic; Cl, Ca, Cu, Cr and Co are not carbon. */
function smilesCarbons(smiles: string): number {
  return (smiles.match(/Cl|Ca|Cu|Cr|Co|C|c/g) ?? []).filter((atom) => atom === "C" || atom === "c").length;
}

/** The same characters in another order: "OC(=O)c1ccccc1" is "O=C(O)c1ccccc1". */
function sameSpecies(a: string, b: string): boolean {
  return [...a].sort().join("") === [...b].sort().join("");
}

/**
 * The test's own reading of rule 1's carbon allowance (the generator's is
 * carbon_shift in scripts/build_card_distractors.py): 0 unless a consumed
 * species that is not a start, or a released one that is not the product,
 * carries carbon; then the carbons between the first start and the answer.
 */
function carbonShift(reaction: (typeof REACTIONS)[number]): number {
  const consumed = reaction.balance_lhs.filter((s) => !reaction.reactants.some((r) => sameSpecies(r, s)));
  const released = reaction.balance_rhs.filter((s) => !sameSpecies(s, reaction.product));
  if (![...consumed, ...released].some((s) => smilesCarbons(s) > 0)) return 0;
  return Math.abs(carbons(reaction.product_formula) - smilesCarbons(reaction.reactants[0] ?? ""));
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

  /* ROUND 4, OWNER DECISION (1 Oct): the carbon half of this pin is relaxed
     for a reaction that moves carbon, and only for one. The element half is
     unchanged; the carbon half still holds exactly wherever the registry's
     balance shows no carbon carried in by a reagent or out by a byproduct,
     and where it does, the next test holds the count to the span the
     reaction itself covers. */
  it("gives every wrong option exactly the answer's elements, and its carbon count unless the reaction moves carbon", () => {
    for (const reaction of PREDICTED) {
      const answer = elements(reaction.product_formula);
      for (const option of predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS) ?? []) {
        if (option.correct) continue;
        expect([...elements(option.formula)].sort(), `${reaction.id} ${option.label}`).toEqual([...answer].sort());
        if (carbonShift(reaction) === 0) {
          expect(carbons(option.formula), `${reaction.id} ${option.label}`).toBe(carbons(reaction.product_formula));
        }
      }
    }
  });

  it("keeps a moved carbon count inside the span the reaction covers, read from the registry's balance", () => {
    let relaxed = 0;
    for (const reaction of PREDICTED) {
      const shift = carbonShift(reaction);
      const start = smilesCarbons(reaction.reactants[0] ?? "");
      const answer = carbons(reaction.product_formula);
      for (const option of predictionChoices(reactionCardFromStaged(reaction, NOON), REACTIONS) ?? []) {
        const count = carbons(option.formula);
        if (count !== answer) relaxed += 1;
        expect(count, `${reaction.id} ${option.label}`).toBeGreaterThanOrEqual(Math.min(start, answer) - shift);
        expect(count, `${reaction.id} ${option.label}`).toBeLessThanOrEqual(Math.max(start, answer) + shift);
      }
    }
    // The rule is in use: the malonic ester card offers the methylated
    // diester it passes through, eight carbons beside a three carbon acid.
    expect(relaxed).toBeGreaterThan(0);
    expect((PREDICT_DISTRACTORS["malonic-ester-synthesis"] ?? []).map((d) => d.smiles)).toContain("CCOC(=O)C(C)C(=O)OCC");
  });

  it("reads carbon moving from the balance: a reagent's carbon, a byproduct's, or none", () => {
    const byId = (id: string) => REACTIONS.find((r) => r.id === id)!;
    expect(carbonShift(byId("gilman-to-ketone"))).toBe(1); // CH3- from the cuprate
    expect(carbonShift(byId("lialh4-reduction"))).toBe(1); // methanol leaves
    expect(carbonShift(byId("malonic-ester-synthesis"))).toBe(4);
    expect(carbonShift(byId("socl2-acid-to-chloride"))).toBe(0); // SOCl2 carries none
    expect(carbonShift(byId("fischer-esterification"))).toBe(0); // methanol is a start
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

  /* THE ODD-ONE-OUT PINS, round 3. The round 2 critic solved eight cards
     without chemistry: both wrong options were one kind of mistake (both
     "substituted twice", both the group moved onto the ring), so the answer
     was the drawing that did not match the other two. */
  it("makes the two wrong options on a card two different kinds of mistake", () => {
    for (const reaction of PREDICTED) {
      const kinds = (PREDICT_DISTRACTORS[reaction.id] ?? []).map((d) => d.kind);
      expect(new Set(kinds).size, `${reaction.id}: ${kinds.join(", ")}`).toBe(kinds.length);
    }
  });

  it("never leaves the answer the odd formula out", () => {
    for (const reaction of PREDICTED) {
      const [first, second] = PREDICT_DISTRACTORS[reaction.id] ?? [];
      if (first === undefined || second === undefined || first.formula !== second.formula) continue;
      expect(reaction.product_formula, reaction.id).toBe(first.formula);
    }
  });

  /* THE LOOK-ALIKE PIN, round 3. "Pick the option most like the start"
     (Morgan fingerprint similarity) found the answer on 25 of 39 cards in
     round 2, against 13 by chance. Three strategies are scored here, because
     a deck where the answer is NEVER the closest teaches "never pick the
     closest" instead: the most similar, the middle and the least similar
     option, an exact tie splitting the credit. Each must stay within two
     standard errors of a fair three-way guess over the predict cards,
     2 * sqrt((1/3)(2/3) / n): the band a coin-flipping student lands in 19
     runs out of 20, so a strategy above it is learning something, not lucky.
     The similarities are RDKit's, written by the generator next to each
     structure; the generator's header says how they are measured. */
  it("gives no look-alike strategy better odds than a guess", () => {
    const strategies = ["closest", "middle", "farthest"] as const;
    const score = { closest: 0, middle: 0, farthest: 0 };
    for (const reaction of PREDICTED) {
      const answer = PREDICT_ANSWERS[reaction.id];
      expect(answer, reaction.id).toBeDefined();
      const values = [answer!.similarity, ...(PREDICT_DISTRACTORS[reaction.id] ?? []).map((d) => d.similarity)];
      const ordered = [...values].sort((a, b) => b - a);
      strategies.forEach((strategy, position) => {
        const tied = values.filter((value) => value === ordered[position]);
        score[strategy] += (ordered[position] === values[0] ? 1 : 0) / tied.length;
      });
    }
    const bound = 1 / 3 + 2 * Math.sqrt((1 / 3) * (2 / 3) / PREDICTED.length);
    for (const strategy of strategies) {
      expect(score[strategy] / PREDICTED.length, strategy).toBeLessThanOrEqual(bound);
    }
  });

  it("never makes the answer clearly the closest to the start on any one card", () => {
    // The generator's tie band (TIE in scripts/build_card_distractors.py).
    for (const reaction of PREDICTED) {
      const answer = PREDICT_ANSWERS[reaction.id]?.similarity ?? 1;
      const closest = Math.max(...(PREDICT_DISTRACTORS[reaction.id] ?? []).map((d) => d.similarity));
      expect(closest, reaction.id).toBeGreaterThanOrEqual(answer - 0.05);
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
    // A card that HAS a predict step: wolff-kishner, used before, is a gap
    // since round 3 and would compare null with null.
    const card = registryCard("lialh4-reduction");
    expect(predictionChoices(card, REACTIONS)).not.toBeNull();
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
    // gilman-to-ketone, used here before, has no predict step since round 3.
    const card = registryCard("lialh4-reduction");
    expect(predictionChoices(card, REACTIONS)).not.toBeNull();
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
  /* THE STREAK COUNTS RIGHT CALLS, round 3. It counted Good and Easy grades,
     and the round 2 critic ended a run of six wrong calls, each graded Good,
     on "7 Best streak" with a "6 in a row" chip on the way. */
  it("counts consecutive right calls, in the order made, and restarts quietly on a miss", () => {
    const calls = [true, true, false, true, true, true, false].map((correct, index) => ({ cardId: `c${index}`, correct }));
    const stats = runStats([], calls);
    expect(stats.bestStreak).toBe(3);
    expect(stats.streak).toBe(0);
  });

  it("gives no streak to wrong calls, however they are graded", () => {
    const ratings = Array.from({ length: 6 }, (_, index) => ({ cardId: `c${index}`, rating: "good" as const }));
    const calls = ratings.map(({ cardId }) => ({ cardId, correct: false }));
    const stats = runStats(ratings, calls);
    expect(stats.streak).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(calledLine(stats)).toBe("Called it 0 of 6");
    expect(stats.split).toEqual({ again: 0, hard: 0, good: 6, easy: 0 });
  });

  it("reads a card called twice once in the tally, and in order for the streak", () => {
    // a right, b wrong, c right, then b again after Again, right this time.
    const stats = runStats([], [
      { cardId: "a", correct: true },
      { cardId: "b", correct: false },
      { cardId: "c", correct: true },
      { cardId: "b", correct: true },
    ]);
    expect(stats.predicted).toBe(3);
    expect(stats.called).toBe(3);
    // The miss on b sat between a and c, so the best run is c then b.
    expect(stats.bestStreak).toBe(2);
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
  /* ROUND 4, OWNER DECISION (1 Oct): a completed run pays 5 diamonds through
     the economy (cards_reviewed, DIAMONDS_CARD_RUN). Round 3's pin that the
     summary shows NO diamonds pinned the reverse decision; what holds now is
     that the tile shows what was credited, never a number of its own. */
  it("shows the diamonds credited, zero when nothing was, and the rule beside a zero", () => {
    const html = renderToStaticMarkup(
      createElement(Run, { cards: [], source: createLocalDecks({ now: () => NOON }), journal: [], onExit: () => undefined }),
    );
    expect(html).toContain("Diamonds");
    expect(html).toMatch(/>0<\/span><span[^>]*>Diamonds/);
    expect(html).toContain(`A run of ${CARD_RUN_MIN_GRADED} or more cards earns ${DIAMONDS_CARD_RUN} diamonds`);
  });

  it("credits a completed run through the store, and the economy decides the amount", () => {
    const store = createLocalProgress();
    store.reset();
    expect(store.finishCardRun(CARD_RUN_MIN_GRADED - 1)).toBe(0);
    const before = store.getSnapshot().economy.diamonds.balance;
    const paid = store.finishCardRun(CARD_RUN_MIN_GRADED);
    expect(paid).toBe(DIAMONDS_CARD_RUN);
    expect(store.getSnapshot().economy.diamonds.balance - before).toBe(paid);
    expect(store.getSnapshot().journal.at(-1)).toMatchObject({ kind: "cards_reviewed", graded: CARD_RUN_MIN_GRADED });
    expect(store.finishCardRun(0)).toBe(0);
  });

  it("names no price in the run: the amount comes back from the store", () => {
    const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
    expect(read("../cards/ui/CardsHome.tsx")).toMatch(/finishCardRun\(/);
    expect(read("../cards/ui/Run.tsx")).not.toMatch(/DIAMONDS_REVIEW_CLEARED|credited\s*=\s*\d|setCredited\(\d/);
  });

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

  /* ROUND 3: "What matters here" printed NaNH2, NaBH4, H2SO4 and six more
     flat, because the note went to the page as plain text. Every count in a
     formula word of every registry note is now set as a subscript, and the
     prose around it, mechanism names included, is left alone. */
  it("sets every formula in every registry note, and nothing else", () => {
    for (const reaction of REACTIONS) {
      for (const stage of reaction.stages) {
        const parts = proseParts(stage.conditions.notes);
        // No formula word is left with its digits on the baseline.
        for (const part of parts.filter((run) => run.kind === "plain")) {
          for (const word of part.text.split(/\s+/)) {
            expect(isFormulaWord(word.replace(/[.,;:!?)]+$/, "")), `${reaction.id}: ${word}`).toBe(false);
          }
        }
      }
    }
    expect(proseParts("plus NaNH2.")).toEqual([
      { text: "plus NaNH", kind: "plain" },
      { text: "2", kind: "sub" },
      { text: ".", kind: "plain" },
    ]);
    for (const text of ["SN2, so a primary halide only.", "E1 through the carbocation", "1,2 and 1,4", "at -78 C"]) {
      expect(proseParts(text).every((run) => run.kind === "plain"), text).toBe(true);
    }
  });

  it("renders the acetylide card's note with NaNH2 subscripted", () => {
    const card = registryCard("acetylide-addition");
    const html = renderToStaticMarkup(createElement(CardFace, { card, revealed: true, onReveal: () => undefined }));
    expect(html).toContain("NaNH</span><sub>2</sub>");
  });

  /* ROUND 3: the workup note said "The reduction itself is not acidic" on a
     Grignard addition, an acetylide addition and an epoxide opening. It now
     names the reaction's own type, filled in by build_curriculum.py. */
  it("names each workup's first step by the reaction's own type", () => {
    for (const reaction of REACTIONS) {
      for (const stage of reaction.stages) {
        const named = stage.conditions.notes.match(/The (.+) itself is not acidic/);
        if (named !== null) expect(named[1], reaction.id).toBe(reaction.reaction_type);
      }
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

/* ROUND 6: THE ANSWER'S SLOT MOVES BETWEEN REVIEWS. The round 4 critic found
   the slot fixed per card (a hash of its id), so across spaced reviews a
   student could recall "the middle one" instead of the product. The order is
   now shuffled per review instance, and stays put within one. */
describe("option order per review", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const order = (options: readonly { readonly key: string }[] | null) => (options ?? []).map((option) => option.key).join("|");

  it("deals one review instance the same order every time", () => {
    const card = registryCard("lialh4-reduction");
    expect(order(predictionChoices(card, REACTIONS, undefined, undefined, "run-1:0"))).toBe(
      order(predictionChoices(card, REACTIONS, undefined, undefined, "run-1:0")),
    );
  });

  it("moves the answer through every slot, and reorders the wrong options, across one card's reviews", () => {
    const card = registryCard("lialh4-reduction");
    const slots = new Set<number>();
    const orders = new Set<string>();
    for (let review = 0; review < 30; review += 1) {
      const options = predictionChoices(card, REACTIONS, undefined, undefined, `review-${review}`) ?? [];
      slots.add(options.findIndex((option) => option.correct));
      orders.add(order(options));
    }
    expect(slots.size).toBe(PREDICT_OPTIONS);
    expect(orders.size).toBe(6); // all 3! orders of three options
  });

  it("deals a different order to the same card in runs opened at different times", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const card = registryCard("lialh4-reduction");
    const seen = new Set<string>();
    for (let minute = 0; minute < 12; minute += 1) {
      vi.setSystemTime(new Date(NOON.getTime() + minute * 60_000));
      const html = renderToStaticMarkup(
        createElement(Run, { cards: [card], source: createLocalDecks({ now: () => NOON }), journal: [], onExit: () => undefined }),
      );
      seen.add((html.match(/predict__art[^>]*src="[^"]*"|src="[^"]*"[^>]*predict__art/g) ?? []).join("|"));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
