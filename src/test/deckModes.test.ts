// @vitest-environment jsdom

/**
 * Quizlet's set page on every study deck (owner, 15 Oct: "Decks are Quizlet-style"):
 * the study mode row, Learn, Test, Match, Write, and the term list with a star per card.
 *
 * Test and Match only reuse what each deck already says, so the checks that matter are
 * that a test question's marked answer is always that card's own answer, and that no
 * wrong choice is secretly the same answer in other words.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DECKS } from "@/data/decks";
import { isReference, type StudyDeck } from "@/data/types";
import { answerOf, buildTest, same } from "@/components/review/StudyModes";
import { DeckPage } from "@/components/review/DeckPage";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const study = DECKS.filter((d): d is StudyDeck => !isReference(d));

describe("a test is built only from the deck's own answers", () => {
  it("there are study decks to check (the check can fail)", () => {
    expect(study.length).toBeGreaterThan(3);
  });
  // Ten builds per deck, because each one draws a different random set of wrong choices.
  it.each(study.map((d) => [d.id, d] as const))("%s", (_, d) => {
    for (let round = 0; round < 10; round++) {
      const items = buildTest(d.questions);
      expect(items.length).toBe(Math.min(20, d.questions.length));
      for (const it of items) {
        const q = d.questions[it.qi]!;
        if (q.mc) {
          expect(it.options).toEqual(q.options);
        } else {
          // Exactly one choice is this card's answer, and it is the one marked right.
          expect(it.correct).toHaveLength(1);
          expect(it.options[it.correct[0]!]).toBe(answerOf(q));
          expect(it.options.filter((o) => same(o, answerOf(q)))).toHaveLength(
            1,
          );
        }
      }
    }
  });
});

describe("a typed answer matches ignoring case, spacing and subscripts", () => {
  it("NaBH4 matches NaBH₄, and a different word does not", () => {
    expect(same("nabh4", "NaBH₄")).toBe(true);
    expect(same(" 1-phenylethanol ", "1-Phenylethanol")).toBe(true);
    expect(same("2-phenylethanol", "1-Phenylethanol")).toBe(false);
    expect(same("", "")).toBe(false);
    expect(same("Δ", "Δ")).toBe(true);
  });
});

describe("the deck page", () => {
  let root: Root;
  let host: HTMLElement;
  const deck = study.find((d) => d.id === "carbonyl-addition")!;
  const tabs = () => [
    ...host.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ];
  const tab = (name: string) => tabs().find((t) => t.textContent === name)!;
  const click = (el: Element) => act(async () => (el as HTMLElement).click());

  beforeAll(() => {
    window.scrollTo = () => {};
    window.matchMedia ??= ((q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });
  const mount = async () => {
    localStorage.clear();
    window.location.hash = `#/deck/${deck.id}`;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => root.render(createElement(DeckPage, { deck })));
  };
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("offers the five study modes, Flashcards first", async () => {
    await mount();
    expect(tabs().map((t) => t.textContent)).toEqual([
      "Flashcards",
      "Learn",
      "Test",
      "Match",
      "Write",
    ]);
    expect(tab("Flashcards").getAttribute("aria-selected")).toBe("true");
  });

  it("Learn sends a Missed card back to the end until it is Got it", async () => {
    await mount();
    await click(tab("Learn"));
    const n = deck.questions.length;
    expect(host.textContent).toContain(`Learn: card 1 of ${n}`);
    await click(host.querySelector(".rv-btn")!); // Show answer
    await click(host.querySelector('.rv-rate[data-rate="red"]')!);
    expect(host.textContent).toContain(`Learn: card 2 of ${n + 1}`);
  });

  it("Test marks a right answer and counts it", async () => {
    await mount();
    await click(tab("Test"));
    const first = host.querySelector("ol > li")!;
    const q = deck.questions.find((x) => first.textContent?.includes(x.q))!;
    const right = [
      ...first.querySelectorAll<HTMLButtonElement>(".rv-option"),
    ].find((b) => b.textContent === answerOf(q))!;
    await click(right);
    await click(
      [...host.querySelectorAll("button")].find(
        (b) => b.textContent === "Check my answers",
      )!,
    );
    expect(first.getAttribute("data-result")).toBe("right");
    expect(host.textContent).toMatch(/\d+ of \d+ right\./);
  });

  it("Match clears a pair you match and keeps a wrong pair", async () => {
    await mount();
    await click(tab("Match"));
    const tiles = () => [
      ...host.querySelectorAll<HTMLButtonElement>(".rv-match"),
    ];
    expect(tiles()).toHaveLength(12);
    const qTile = tiles().find((t) => t.dataset.side === "q")!;
    const q = deck.questions.find((x) => qTile.textContent?.includes(x.q))!;
    const wrong = tiles().find(
      (t) => t.dataset.side === "a" && t.textContent !== answerOf(q),
    )!;
    await click(qTile);
    await click(wrong);
    expect(
      host.querySelectorAll('.rv-match[data-state="matched"]'),
    ).toHaveLength(0);
    await click(qTile);
    await click(
      tiles().find(
        (t) => t.dataset.side === "a" && t.textContent === answerOf(q),
      )!,
    );
    expect(
      host.querySelectorAll('.rv-match[data-state="matched"]'),
    ).toHaveLength(2);
  });

  it("Write takes an exact answer as right and saves it as Got it", async () => {
    await mount();
    await click(tab("Write"));
    const label = host.querySelector(".rv-card-box")!;
    const q = deck.questions.find((x) => label.textContent?.includes(x.q))!;
    const input = host.querySelector<HTMLInputElement>("#write-answer")!;
    await act(async () => {
      // React listens for the native input event; set the value through the prototype setter.
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, answerOf(q).toLowerCase());
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(
      [...host.querySelectorAll("button")].find(
        (b) => b.textContent === "Check",
      )!,
    );
    expect(host.querySelector(".rv-answer")?.getAttribute("data-mark")).toBe(
      "right",
    );
    await click(
      [...host.querySelectorAll("button")].find(
        (b) => b.textContent === "Next card",
      )!,
    );
    const saved = JSON.parse(
      localStorage.getItem(`grignard_lcta_progress_${deck.id}_v1`)!,
    );
    expect(saved.status[String(deck.questions.indexOf(q) + 1)]).toBe("green");
  });

  it("lists every card question beside answer, and a star keeps a card", async () => {
    await mount();
    const rows = host.querySelectorAll(".rv-term");
    expect(rows).toHaveLength(deck.questions.length);
    expect(rows[0]!.querySelector(".rv-term__back")?.textContent).toContain(
      deck.questions[0]!.badge!,
    );
    await click(rows[0]!.querySelector(".rv-star")!);
    expect(
      JSON.parse(localStorage.getItem(`bb_deck_stars_${deck.id}`)!),
    ).toEqual([0]);
    await click(
      [...host.querySelectorAll("button")].find(
        (b) => b.textContent === "Starred (1)",
      )!,
    );
    expect(host.querySelectorAll(".rv-term")).toHaveLength(1);
  });
});
