// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?targets=1&store=1"}

/**
 * The mascot's reaction vocabulary, pinned WHERE IT FIRES rather than where it
 * is defined.
 *
 * berryReaction.test.ts already covers the table: which mood, behaviour and
 * chain each outcome maps to. What nothing covered is that TrainerScreen.tsx
 * actually calls `react` on the graded verdicts, and that the call is deferred
 * to the sheet's rise instead of racing it. That is the same gap
 * pilotScreenWiring.test.ts opens on: "deleting the onUndo dispatch in
 * TrainerScreen.tsx left the whole suite green". Delete the three `react(...)`
 * calls at TrainerScreen.tsx and the mascot goes permanently blank while every
 * other test stays green, which is a character that only exists in a data file.
 *
 * So these pins mount the REAL screen over the real SN2 demo step, commit
 * arrows through the component's own interaction store (the ?store=1 debug
 * flag, same family as __pilotTargets), press the rendered Check, and read the
 * face back off the DOM.
 *
 * Nothing is added to the source to make this observable. `Berry` already
 * publishes `data-state` and an aria-label of "Blueberry, looking <mood>", and
 * `BlueberryMark` already publishes `.bb-eyes[data-mood]`, because the mood CSS
 * contract needs them. Reading the mood the student's screen reader is read is
 * a stronger pin than a test hook would be anyway.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { currentDraft, type InteractionStore, type Point2 } from "@blueberry/interaction";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../demo/sn2Step";
import { TrainerScreen } from "../tabs/trainer/engine/TrainerScreen";
import type { TrainerQuestion } from "../tabs/trainer/engine/question";
import { RISE_MS } from "../tabs/trainer/engine/FeedbackSheet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const problem = {
  step: SN2_DEMO_STEP,
  fromHints: SN2_FROM_HINTS,
  toHints: SN2_TO_HINTS,
  prompt: "Push the electrons for this SN2 in one step.",
  hint: "Tap the oxygen to open its lone pairs, and remember the bromide has to let go.",
};
const question: TrainerQuestion = {
  id: "sn2",
  kind: "reaction",
  title: "SN2 at bromomethane",
  steps: [problem],
  successLine: "Back-side attack: the hydroxide lone pair forms the new C-O bond as the bromide leaves.",
  wonPill: "Goal achieved",
};

let mounted: { root: Root; container: HTMLElement } | null = null;

function mount(reducedMotion: boolean): { container: HTMLElement; store: InteractionStore } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => {
    root.render(createElement(TrainerScreen, { question, onExit: () => undefined, reducedMotion }));
  });
  const store = window.__pilotStore;
  if (store === undefined) throw new Error("the ?store=1 debug hook did not expose the interaction store");
  return { container, store };
}

afterEach(() => {
  if (mounted !== null) {
    const { root, container } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = null;
  }
  vi.useRealTimers();
});

/* ---------------- reading the face ---------------- */

/**
 * Every mascot on the screen, as its mood. `[data-state]` is Berry's own root,
 * so this never picks up a bare BlueberryMark that is art rather than the
 * character. The trainer shows one at a time: the canvas berry while the
 * student draws, the sheet's companion once a verdict is up.
 */
function moods(container: HTMLElement): string[] {
  return [...container.querySelectorAll("[data-state] .bb-eyes")].map((eyes) => eyes.getAttribute("data-mood") ?? "");
}

/** The one mood on screen. Fails loudly rather than picking one if there are two. */
function mood(container: HTMLElement): string {
  const found = moods(container);
  if (found.length !== 1) throw new Error(`expected exactly one mascot, found ${found.length}: ${found.join(", ")}`);
  return found[0] ?? "";
}

function berryRoot(container: HTMLElement): HTMLElement {
  const node = container.querySelector<HTMLElement>("[data-state]");
  if (node === null) throw new Error("no mascot on the trainer screen");
  return node;
}

/** Correct answers, and only correct answers, throw sparkles. */
function hasSparkles(container: HTMLElement): boolean {
  return container.querySelector(".berry-sparkles") !== null;
}

/* ---------------- gesture plumbing over the real hit geometry ------------- */

let clock = 0;

function pointerAt(point: Point2) {
  clock += 16;
  return { pointerId: 1, pointerType: "touch" as const, point, timestampMs: clock };
}

function targetCentre(match: Record<string, unknown>): Point2 {
  const entries = window.__pilotTargets ?? [];
  const hit = entries.find((entry) =>
    Object.entries(match).every(([key, value]) => (entry.target as unknown as Record<string, unknown>)[key] === value),
  );
  if (hit === undefined) throw new Error(`no target for ${JSON.stringify(match)}`);
  return hit.centre;
}

function tap(store: InteractionStore, point: Point2): void {
  act(() => void store.dispatch({ kind: "pointerDown", pointer: pointerAt(point) }));
  act(() => void store.dispatch({ kind: "pointerUp", pointer: pointerAt(point) }));
}

function drag(store: InteractionStore, from: Point2, to: Point2): void {
  act(() => void store.dispatch({ kind: "pointerDown", pointer: pointerAt(from) }));
  act(() => void store.dispatch({ kind: "pointerMove", pointer: pointerAt({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }) }));
  act(() => void store.dispatch({ kind: "pointerMove", pointer: pointerAt(to) }));
  act(() => void store.dispatch({ kind: "pointerUp", pointer: pointerAt(to) }));
}

function arrowCount(store: InteractionStore): number {
  const draft = currentDraft(store.getSnapshot());
  if (draft.shape !== "mechanism") throw new Error("not a mechanism draft");
  return draft.arrows.length;
}

function press(container: HTMLElement, label: string): void {
  const button = [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === label);
  if (button === undefined) throw new Error(`no rendered button labelled ${label}`);
  if (button.disabled) throw new Error(`button ${label} is disabled`);
  act(() => button.click());
}

/** The nucleophile's push. One of the two the SN2 wants, so a Check here is incomplete. */
function drawFirstArrow(store: InteractionStore): void {
  tap(store, targetCentre({ kind: "atom", atomId: "o1" }));
  drag(store, targetCentre({ kind: "lonePair", atomId: "o1" }), targetCentre({ kind: "atom", atomId: "c1" }));
  expect(arrowCount(store)).toBe(1);
}

/** The leaving group's. With the first, the whole step. */
function drawSecondArrow(store: InteractionStore): void {
  drag(
    store,
    targetCentre({ kind: "bondEndHandle", bondId: "b-cbr", atomId: "br1" }),
    targetCentre({ kind: "atom", atomId: "br1" }),
  );
  expect(arrowCount(store)).toBe(2);
}

/* ---------------- the pins ---------------- */

describe("the mascot's four beats are wired to the trainer's verdicts", () => {
  it("waits on the work with the thinking face while the student draws", () => {
    // Beat 4, the resting state of this screen: TrainerScreen seeds
    // useBerryReactions with "leanIn", whose implied mood is "focused".
    // Attending to the canvas, not idling at the viewer.
    const { container, store } = mount(true);
    expect(mood(container)).toBe("focused");
    expect(hasSparkles(container)).toBe(false);

    // And it keeps attending across the drawing itself rather than reacting to
    // every arrow, which would make the character noise instead of feedback.
    drawFirstArrow(store);
    expect(mood(container)).toBe("focused");
  });

  it("celebrates a correct mechanism, with the sparkles a correct answer owns", () => {
    // Beat 2. reactionFor("correct") is happy + squash then bounce + sparkles.
    const { container, store } = mount(true);
    drawFirstArrow(store);
    drawSecondArrow(store);
    press(container, "Check");

    expect(mood(container)).toBe("happy");
    expect(hasSparkles(container)).toBe(true);
    expect(berryRoot(container).getAttribute("aria-label")).toContain("looking happy");
    // The win is not a char, and a correct answer never scolds.
    expect(berryRoot(container).getAttribute("data-state")).toBe("neutral");
  });

  it("is sympathetic on a near miss: thinking with the student, and no sparkles", () => {
    /*
     * Beat 3. A legal push toward a different change is the miss students
     * actually meet, and TrainerScreen grades it "not_requested", which the
     * table maps to thinking + leanIn. NOT a scolding face: "thinking" is the
     * friend who also has to work it out, and the sparkles that mark a win
     * stay off so the two beats never read alike.
     */
    const { container, store } = mount(true);
    tap(store, targetCentre({ kind: "atom", atomId: "o1" }));
    drag(store, targetCentre({ kind: "lonePair", atomId: "o1" }), targetCentre({ kind: "atom", atomId: "br1" }));
    press(container, "Check");

    expect(mood(container)).toBe("thinking");
    expect(hasSparkles(container)).toBe(false);
    expect(berryRoot(container).getAttribute("aria-label")).toContain("looking thinking");
  });

  it("goes back to waiting when the student clears the board", () => {
    // Beat 1: no reaction outlives the attempt it belongs to. Redraw is a
    // fresh stage, so the face settles off whatever it was reacting to and
    // returns to attending. Driven off a miss rather than a win because the
    // won layout retires the Redraw chip, which pilotScreenWiring.test.ts pins.
    const { container, store } = mount(true);
    tap(store, targetCentre({ kind: "atom", atomId: "o1" }));
    drag(store, targetCentre({ kind: "lonePair", atomId: "o1" }), targetCentre({ kind: "atom", atomId: "br1" }));
    press(container, "Check");
    expect(mood(container)).toBe("thinking");

    press(container, "Got it");
    press(container, "Redraw");
    expect(mood(container)).toBe("focused");
    expect(hasSparkles(container)).toBe(false);
  });
});

describe("the reaction rides the sheet's existing clock, not a parallel one", () => {
  it("holds the waiting face until RISE_MS has passed, then reacts", () => {
    /*
     * The pin that stops the mascot growing its own animation clock. Under
     * full motion TrainerScreen defers every sensory part of a verdict by
     * RISE_MS so the reaction lands as the sheet arrives rather than under it.
     * If somebody drops `afterRise` and calls `react` inline, the face changes
     * on the commit frame and the first assertion here goes red.
     *
     * A near miss rather than a win on purpose: the win also starts the bond
     * tween on requestAnimationFrame, and this test owns the timers.
     */
    vi.useFakeTimers();
    const { container, store } = mount(false);
    tap(store, targetCentre({ kind: "atom", atomId: "o1" }));
    drag(store, targetCentre({ kind: "lonePair", atomId: "o1" }), targetCentre({ kind: "atom", atomId: "br1" }));
    press(container, "Check");

    // The sheet is up and committed; the face has not moved yet.
    expect(container.querySelector("[data-answer-sheet]")).not.toBeNull();
    expect(mood(container)).toBe("focused");

    act(() => void vi.advanceTimersByTime(RISE_MS - 1));
    expect(mood(container)).toBe("focused");

    act(() => void vi.advanceTimersByTime(1));
    expect(mood(container)).toBe("thinking");
  });

  it("reacts on the commit frame under reduced motion, deferring nothing", () => {
    /*
     * The reduced-motion path is a path, not a disabled feature: a student who
     * asked for less movement still gets the character's answer, just without
     * the staged delay.
     *
     * Asserted as "already right, and unchanged by the clock" rather than as a
     * bare timer count. The screen legitimately keeps other timers of its own,
     * so counting them would pin something this test never claimed; what it
     * claims is that the mascot's reaction is not on one, and draining the
     * queue is the honest way to show that.
     */
    vi.useFakeTimers();
    const { container, store } = mount(true);
    tap(store, targetCentre({ kind: "atom", atomId: "o1" }));
    drag(store, targetCentre({ kind: "lonePair", atomId: "o1" }), targetCentre({ kind: "atom", atomId: "br1" }));
    press(container, "Check");

    expect(mood(container)).toBe("thinking");
    act(() => void vi.advanceTimersByTime(RISE_MS * 4));
    expect(mood(container)).toBe("thinking");
  });
});
