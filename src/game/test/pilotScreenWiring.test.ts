// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?targets=1&store=1"}

/**
 * The wiring test the undo judge demanded: everything in pilotScreen.test.ts
 * holds the pure machine, so deleting the onUndo dispatch in PilotScreen.tsx
 * left the whole suite green, which is the exact shape of the old trainer's
 * undo-that-exists-but-is-not-wired sin. This file mounts the REAL screen
 * over the real SN2 demo step, commits arrows through the component's own
 * interaction store (exposed by the ?store=1 debug flag, the same family as
 * __pilotTargets), clicks the rendered chips, and reads the machine back.
 *
 * The suite runs in node everywhere else; this file opts into jsdom alone
 * via the pragma above, and drives the store directly because jsdom has no
 * getScreenCTM for the canvas's pointer adapter to use.
 */

import { afterEach, describe, expect, it } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { currentDraft, type InteractionStore, type Point2 } from "@blueberry/interaction";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../demo/sn2Step";
import { PilotScreen, type PilotProblem } from "../pilot/screen/PilotScreen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const problem: PilotProblem = {
  step: SN2_DEMO_STEP,
  fromHints: SN2_FROM_HINTS,
  toHints: SN2_TO_HINTS,
  mode: "reaction",
  title: "SN2 at bromomethane",
  prompt: "Push the electrons for this SN2 in one step.",
  hint: "Tap the oxygen to open its lone pairs, and remember the bromide has to let go.",
  successLine: "Back-side attack: the hydroxide lone pair forms the new C-O bond as the bromide leaves.",
};

let mounted: { root: Root; container: HTMLElement } | null = null;

function mount(): { container: HTMLElement; store: InteractionStore } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => {
    root.render(createElement(PilotScreen, { problem, onExit: () => undefined, reducedMotion: true }));
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
});

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

function buttonLabelled(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === label);
}

function press(container: HTMLElement, label: string): void {
  const button = buttonLabelled(container, label);
  if (button === undefined) throw new Error(`no rendered button labelled ${label}`);
  if (button.disabled) throw new Error(`button ${label} is disabled`);
  act(() => button.click());
}

/** Both pushes of the SN2, through the store, the way the canvas would send them. */
function drawBothArrows(container: HTMLElement, store: InteractionStore, checkBetween: boolean): void {
  tap(store, targetCentre({ kind: "atom", atomId: "o1" }));
  drag(store, targetCentre({ kind: "lonePair", atomId: "o1" }), targetCentre({ kind: "atom", atomId: "c1" }));
  expect(arrowCount(store)).toBe(1);
  if (checkBetween) press(container, "Check");
  drag(
    store,
    targetCentre({ kind: "bondEndHandle", bondId: "b-cbr", atomId: "br1" }),
    targetCentre({ kind: "atom", atomId: "br1" }),
  );
  expect(arrowCount(store)).toBe(2);
}

/* ---------------- the pins ---------------- */

describe("the UNDO chip is wired to the machine", () => {
  it("clicking UNDO pops committed arrows, and the Replay chip unmounts once the record is no longer a prefix", () => {
    const { container, store } = mount();
    drawBothArrows(container, store, true);
    expect(buttonLabelled(container, "Replay")).toBeDefined();

    // One press pops one machine entry (an arrow, an arming, or a reveal),
    // so walk the button down to an empty drawing with a hard cap. If the
    // onUndo dispatch is ever unwired, the count never falls and this fails.
    const before = arrowCount(store);
    expect(before).toBe(2);
    for (let i = 0; i < 8 && arrowCount(store) > 0; i += 1) press(container, "Undo");
    expect(arrowCount(store)).toBe(0);
    expect(arrowCount(store)).toBeLessThan(before);

    // The one recorded step held the first arrow; an empty drawing is not a
    // superset of it, so the record dropped and the Replay chip left with it.
    expect(buttonLabelled(container, "Replay")).toBeUndefined();
    expect(buttonLabelled(container, "Close replay")).toBeUndefined();
  });
});

describe("the won layout's chip set", () => {
  it("offers Replay and Continue only: no redraw chip, no Undo, no Check, no hint", () => {
    const { container, store } = mount();
    drawBothArrows(container, store, false);
    press(container, "Check");

    // The win: Continue and Replay stand, and re-adding any redraw chip to
    // the won layout is exactly what makes this red.
    expect(buttonLabelled(container, "Continue")).toBeDefined();
    expect(buttonLabelled(container, "Replay")).toBeDefined();
    const labels = [...container.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim());
    expect(labels.filter((label) => /redraw|draw it again/i.test(label))).toEqual([]);
    expect(buttonLabelled(container, "Undo")).toBeUndefined();
    expect(buttonLabelled(container, "Check")).toBeUndefined();

    // And the hint pill no longer commands the completed action.
    expect(container.textContent).not.toContain(problem.hint);
  });
});
