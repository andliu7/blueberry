// @vitest-environment jsdom
/**
 * The priming preview and its recap, clicked (U1-P2 round 4). u1Priming.test.ts
 * pins the data and the first frame; this file pins what the taps do, so it
 * needs a DOM:
 *
 * 1. Pick, then CHECK: the guess LOCKS IN without the answer (no tray, no
 *    right or wrong on the options), so the lesson can still ask it as a real
 *    first attempt. A later tap changes nothing. START hands the pick on.
 * 2. SKIP passes the guess: the options are gone and START hands on null.
 * 3. The preview's map is shown whole, every idea in order.
 * 4. The recap shows the locked-in prediction UNMARKED and asks "Still
 *    agree?" (owner, queue item 17). CHECK marks the yes or no: a wrong call
 *    gets the tray, the answer and the why; a right call keeps the why behind
 *    "Ask for feedback". Then the map is rebuilt: a chip out of turn is
 *    refused and says so, the right chip fills the gap, and the last one
 *    finishes it. SKIP leaves at once.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonPreview } from "../beats/LessonPreview";
import { LessonRecap } from "../beats/LessonRecap";
import { firstSentence } from "../beats/AnswerTray";
import { guessFor, guessPayoff, mapPoolOrder, primingFor } from "../beats/priming";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // jsdom has no layout: give the few browser calls the preview makes a no-op.
  if (window.matchMedia === undefined) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  Element.prototype.scrollTo = function scrollTo() {};
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function open(node: string, onStart: (guess: string | null) => void = () => {}) {
  const priming = primingFor(node)!;
  act(() => {
    root.render(
      createElement(LessonPreview, {
        node,
        priming,
        strip: null,
        reducedMotion: true,
        onStart,
        onExit: () => {},
      }),
    );
  });
}

function recap(node: string, picked: string | null, onDone: () => void = () => {}) {
  act(() => {
    root.render(createElement(LessonRecap, { node, priming: primingFor(node)!, picked, reducedMotion: true, onDone }));
  });
}

function button(name: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === name || b.getAttribute("aria-label") === name,
  );
  if (found === undefined) throw new Error(`no button "${name}"`);
  return found;
}

/**
 * A "Still agree?" answer by its words. Once marked, the card also carries the
 * option mark's screen reader text, so it is found by its first span.
 */
function agree(text: string): HTMLButtonElement {
  const found = [...host.querySelectorAll<HTMLButtonElement>(".lesson-recap__agree button")].find(
    (b) => b.querySelector("span")?.textContent === text,
  );
  if (found === undefined) throw new Error(`no answer "${text}"`);
  return found;
}

function click(target: HTMLElement) {
  act(() => target.click());
}

describe("the guess locks in on CHECK, without the answer", () => {
  it("locks the pick, shows no verdict, and hands the pick to START", () => {
    const guess = guessFor("u1-x2")!;
    const wrong = guess.options.find((option) => option.id !== guess.correctOptionId)!;
    const right = guess.options.find((option) => option.id === guess.correctOptionId)!;
    const onStart = vi.fn();
    open("u1-x2", onStart);
    // CHECK is off until something is picked.
    expect(button("Check").disabled).toBe(true);
    click(button(wrong.text));
    expect(button("Check").disabled).toBe(false);
    click(button("Check"));

    // Locked in: no tray, and no right or wrong anywhere on the options.
    expect(host.querySelector("[data-answer-tray]")).toBeNull();
    expect(host.textContent).toContain("Locked in");
    expect(button(wrong.text).getAttribute("data-state")).toBe("picked");
    expect(button(right.text).getAttribute("data-state")).toBe("rest");

    // Locked: tapping another option now changes nothing.
    click(button(right.text));
    expect(button(right.text).getAttribute("aria-pressed")).toBe("false");
    expect(button(wrong.text).getAttribute("aria-disabled")).toBe("true");

    // CONTINUE goes on to the map, the guess is gone, and START hands on the pick.
    click(button("Continue"));
    expect(host.textContent).toContain("The map of this lesson");
    expect(host.querySelector(".primer-guess")).toBeNull();
    click(button("Start lesson"));
    expect(onStart).toHaveBeenCalledWith(wrong.id);
  });

  it("SKIP passes the guess, leaves no options on screen, and START hands on null", () => {
    const guess = guessFor("u1-x2")!;
    const onStart = vi.fn();
    open("u1-x2", onStart);
    click(button(guess.options[0].text));
    click(button("Skip"));
    expect(host.textContent).toContain("The map of this lesson");
    expect(host.querySelector(".primer-guess")).toBeNull();
    for (const option of guess.options) {
      expect(
        [...host.querySelectorAll("button")].some(
          (b) => b.getAttribute("aria-label") === option.text || b.textContent === option.text,
        ),
      ).toBe(false);
    }
    click(button("Start lesson"));
    expect(onStart).toHaveBeenCalledWith(null);
  });
});

describe("the preview shows the map whole", () => {
  it("draws every idea in order, linked from the last lesson, with nothing to place", () => {
    const priming = primingFor("u1-kvt")!;
    open("u1-kvt");
    click(button("Skip"));
    const chips = [...host.querySelectorAll(".primer-chain__chip")].map((chip) => chip.textContent);
    expect(chips).toEqual(priming.ideas.map((idea) => idea.label));
    expect(host.querySelector(".primer-chain__bridge")?.textContent).toContain("Last lesson");
    expect(host.querySelector(".primer-pool")).toBeNull();
  });

  it("opens on the map when the lesson has no guess", () => {
    const onStart = vi.fn();
    open("u1-ied", onStart);
    expect(host.querySelector(".primer-guess")).toBeNull();
    expect(host.textContent).toContain("The map of this lesson");
    click(button("Start lesson"));
    expect(onStart).toHaveBeenCalledWith(null);
  });
});

describe("the recap closes the loop", () => {
  // Owner change, queue item 17: two tests here used to expect the verdict
  // tray the moment the recap opened. The recap now asks "Still agree?"
  // first, so the tray is reached through yes or no and CHECK; the marks they
  // pinned (tray tone, the answer, the two drawn options) are still pinned.
  it("shows the prediction unmarked, with CHECK off until yes or no is picked", () => {
    const guess = guessFor("u1-x2")!;
    const wrong = guess.options.find((option) => option.id !== guess.correctOptionId)!;
    recap("u1-x2", wrong.id);
    expect(host.textContent).toContain("Here was your prediction");
    expect(host.textContent).toContain("Still agree?");
    expect(host.querySelector("[data-answer-tray]")).toBeNull();
    // Only their own pick, and nothing says right or wrong yet.
    expect(host.querySelectorAll(".primer-guess__option").length).toBe(1);
    expect(button(wrong.text).getAttribute("data-state")).toBe("picked");
    expect(button("Check").disabled).toBe(true);
    click(agree("Yes, I still agree"));
    expect(agree("Yes, I still agree").getAttribute("aria-pressed")).toBe("true");
    expect(button("Check").disabled).toBe(false);
  });

  it("standing by a wrong prediction: the tray, the answer and the lesson's why, then on to the map", () => {
    const guess = guessFor("u1-x2")!;
    const wrong = guess.options.find((option) => option.id !== guess.correctOptionId)!;
    const right = guess.options.find((option) => option.id === guess.correctOptionId)!;
    recap("u1-x2", wrong.id);
    click(agree("Yes, I still agree"));
    click(button("Check"));
    const tray = host.querySelector("[data-answer-tray]");
    expect(tray?.getAttribute("data-answer-tray")).toBe("wrong");
    expect(tray?.textContent).toContain("Not quite");
    expect(tray?.textContent).toContain(right.text);
    expect(tray?.textContent).toContain(firstSentence(guessPayoff("u1-x2", wrong.id)!.why).first);
    expect(button(wrong.text).getAttribute("data-state")).toBe("chosen");
    expect(button(right.text).getAttribute("data-state")).toBe("answer");
    // Only the pick and the answer are drawn, so the tray cannot hide a third.
    expect(host.querySelectorAll(".primer-guess__option").length).toBe(2);
    // The yes or no is marked too: "yes" was the wrong call here.
    expect(agree("Yes, I still agree").getAttribute("data-state")).toBe("chosen");
    expect(agree("No, I changed my mind").getAttribute("data-state")).toBe("answer");
    // A marked yes or no does not change on a later tap.
    click(agree("No, I changed my mind"));
    expect(agree("Yes, I still agree").getAttribute("aria-pressed")).toBe("true");
    click(button("Continue"));
    expect(host.textContent).toContain("Rebuild the map");
  });

  it("changing the mind on a wrong prediction is the right call, with the answer and feedback on request", () => {
    const guess = guessFor("u1-x2")!;
    const wrong = guess.options.find((option) => option.id !== guess.correctOptionId)!;
    const right = guess.options.find((option) => option.id === guess.correctOptionId)!;
    recap("u1-x2", wrong.id);
    click(agree("No, I changed my mind"));
    click(button("Check"));
    const tray = host.querySelector("[data-answer-tray]");
    expect(tray?.getAttribute("data-answer-tray")).toBe("right");
    expect(tray?.textContent).toContain("Right to change your mind!");
    expect(tray?.textContent).toContain(right.text);
    // The why waits behind "Ask for feedback", closed until asked for.
    const ask = tray?.querySelector("details.answer-tray__more");
    expect(ask?.querySelector("summary")?.textContent).toBe("Ask for feedback");
    expect(ask?.hasAttribute("open")).toBe(false);
    expect(ask?.textContent).toContain(guessPayoff("u1-x2", wrong.id)!.why);
  });

  it("standing by a right prediction says so, with the why behind Ask for feedback", () => {
    const guess = guessFor("u1-kvt")!;
    recap("u1-kvt", guess.correctOptionId);
    click(agree("Yes, I still agree"));
    click(button("Check"));
    const tray = host.querySelector("[data-answer-tray]");
    expect(tray?.getAttribute("data-answer-tray")).toBe("right");
    expect(tray?.textContent).toContain("You called it!");
    expect(tray?.querySelector("details.answer-tray__more summary")?.textContent).toBe("Ask for feedback");
    expect(host.querySelectorAll(".primer-guess__option").length).toBe(1);
  });

  it("doubting a right prediction is the wrong call: the answer was their own pick", () => {
    const guess = guessFor("u1-kvt")!;
    const right = guess.options.find((option) => option.id === guess.correctOptionId)!;
    recap("u1-kvt", guess.correctOptionId);
    click(agree("No, I changed my mind"));
    click(button("Check"));
    const tray = host.querySelector("[data-answer-tray]");
    expect(tray?.getAttribute("data-answer-tray")).toBe("wrong");
    expect(tray?.textContent).toContain("Your first call was right");
    expect(tray?.textContent).toContain(right.text);
    expect(agree("Yes, I still agree").getAttribute("data-state")).toBe("answer");
  });

  it("wears the lesson's frame: the progress bar fills as each step is done", () => {
    const guess = guessFor("u1-kvt")!;
    const priming = primingFor("u1-kvt")!;
    recap("u1-kvt", guess.correctOptionId);
    const bar = () => host.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow");
    expect(bar()).toBe("0");
    click(agree("Yes, I still agree"));
    click(button("Check"));
    expect(bar()).toBe("50");
    click(button("Continue"));
    for (const idea of priming.ideas) click(button(idea.label));
    expect(bar()).toBe("100");
  });

  it("opens on the map when the guess was skipped", () => {
    recap("u1-kvt", null);
    expect(host.querySelector("[data-answer-tray]")).toBeNull();
    expect(host.textContent).toContain("Rebuild the map");
  });

  it("refuses a chip out of turn, takes the right one, and finishes", () => {
    const priming = primingFor("u1-kvt")!;
    const onDone = vi.fn();
    recap("u1-kvt", null, onDone);
    const ideas = priming.ideas;
    const outOfTurn = mapPoolOrder(ideas).find((index) => index !== 0)!;

    click(button(ideas[outOfTurn].label));
    expect(button(ideas[outOfTurn].label).getAttribute("data-miss")).not.toBeNull();
    expect(host.querySelector(".primer-build__say")?.textContent).toContain("Not that one yet");
    expect(host.querySelectorAll(".primer-chain__step[data-filled]").length).toBe(0);

    ideas.forEach((idea, index) => {
      click(button(idea.label));
      expect(host.querySelectorAll(".primer-chain__step[data-filled]").length).toBe(index + 1);
    });
    expect(host.querySelector(".primer-pool")).toBeNull();
    expect(host.textContent).toContain("Map rebuilt");
    click(button("Continue"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("SKIP leaves the unbuilt map at once", () => {
    const onDone = vi.fn();
    recap("u1-kvt", null, onDone);
    click(button("Skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
