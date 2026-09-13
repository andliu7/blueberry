// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?targets=1&store=1"}

/**
 * The fork and the strip, wired. pilotFork.test.ts holds the pure model, and
 * a pure model can be right while the screen never mounts the chooser, never
 * reads the branch grade, or lets a look-back leak the live step. This file
 * mounts the REAL screen over the registry's SN1 fork, chooses routes by
 * clicking the rendered pucks, commits arrows through the exposed store the
 * way pilotScreenWiring.test.ts does, and reads the DOM back.
 */

import { afterEach, describe, expect, it } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { currentDraft, type InteractionStore, type Point2 } from "@blueberry/interaction";
import { TRAINER_SEQUENCES } from "../demo/sequences";
import { questionFromSequence } from "../tabs/trainer/engine/question";
import { TrainerScreen } from "../tabs/trainer/engine/TrainerScreen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sn1 = TRAINER_SEQUENCES.find((entry) => entry.id === "seq-sn1");
if (sn1 === undefined) throw new Error("seq-sn1 missing from the registry");
const question = questionFromSequence(sn1);
const forkStep = question.steps.findIndex((step) => step.fork !== undefined);
if (forkStep < 0) throw new Error("seq-sn1 carries no fork");

let mounted: { root: Root; container: HTMLElement } | null = null;

function mount(stepIndex: number): { container: HTMLElement; store: () => InteractionStore } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => {
    root.render(createElement(TrainerScreen, { question, stepIndex, onExit: () => undefined, reducedMotion: true }));
  });
  // The store is rebuilt whenever the played step changes (a route pick is
  // one such change), so callers read it fresh rather than holding one.
  return {
    container,
    store: () => {
      const store = window.__pilotStore;
      if (store === undefined) throw new Error("the ?store=1 debug hook did not expose the interaction store");
      return store;
    },
  };
}

afterEach(() => {
  if (mounted !== null) {
    const { root, container } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = null;
  }
});

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
  return [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim().startsWith(label));
}
function press(container: HTMLElement, label: string): void {
  const button = buttonLabelled(container, label);
  if (button === undefined) throw new Error(`no rendered button labelled ${label}`);
  if (button.disabled) throw new Error(`button ${label} is disabled`);
  act(() => button.click());
}
function pickRoute(container: HTMLElement, id: string): void {
  const button = container.querySelector<HTMLButtonElement>(`[data-fork-route="${id}"]`);
  if (button === null) throw new Error(`no route puck ${id}`);
  act(() => button.click());
}

/** The E1 branch: water takes the explicit beta hydrogen, the C-H pair folds into the C=C. */
function drawE1(store: InteractionStore): void {
  tap(store, targetCentre({ kind: "atom", atomId: "ow" }));
  drag(store, targetCentre({ kind: "lonePair", atomId: "ow" }), targetCentre({ kind: "atom", atomId: "hb" }));
  drag(store, targetCentre({ kind: "bondEndHandle", bondId: "b-1hb", atomId: "c1" }), targetCentre({ kind: "atom", atomId: "c0" }));
  expect(arrowCount(store)).toBe(2);
}

/** The capture: water's lone pair takes the empty carbon. */
function drawCapture(store: InteractionStore): void {
  tap(store, targetCentre({ kind: "atom", atomId: "ow" }));
  drag(store, targetCentre({ kind: "lonePair", atomId: "ow" }), targetCentre({ kind: "atom", atomId: "c0" }));
  expect(arrowCount(store)).toBe(1);
}

describe("the fork is wired to the screen", () => {
  it("shows the chooser at the fork step with nothing drawable until a route is picked", () => {
    const { container } = mount(forkStep);
    expect(container.querySelector("[data-fork-chooser]")).not.toBeNull();
    expect(container.querySelectorAll("[data-fork-route]").length).toBe(question.steps[forkStep]!.fork!.routes.length);
    expect(buttonLabelled(container, "Check")).toBeUndefined();
    expect(buttonLabelled(container, "Undo")).toBeUndefined();
    // The prompt asks the question without answering it, and nothing else on
    // the screen names a route: not the step's own prompt, not the title,
    // not a hint pill. The conditions line is the whole question.
    expect(container.textContent).toContain(question.steps[forkStep]!.fork!.prompt);
    expect(container.textContent).not.toContain(question.steps[forkStep]!.prompt);
    expect(container.textContent).not.toContain(question.title);
    // The hint on a fork step is the conditions line (shown once, by the chooser) or authored copy that must stay off screen.
    const hint = question.steps[forkStep]!.hint;
    if (hint !== question.steps[forkStep]!.fork!.conditions) expect(container.textContent).not.toContain(hint);
    expect(container.textContent.split(question.steps[forkStep]!.fork!.conditions).length).toBe(2);
    for (const route of question.steps[forkStep]!.fork!.routes) {
      expect(container.textContent).not.toContain(route.why);
    }
  });

  it("right arrows on the wrong branch earn the branch card, never the win, and the fork can be chosen again", () => {
    const { container, store } = mount(forkStep);
    pickRoute(container, "route-e1");
    expect(container.querySelector("[data-fork-chooser]")).toBeNull();
    drawE1(store());
    press(container, "Check");
    expect(container.querySelector("[data-branch-verdict]")).not.toBeNull();
    expect(container.textContent).not.toContain("Goal achieved");
    expect(buttonLabelled(container, "Continue")).toBeUndefined();
    expect(buttonLabelled(container, "Check")).toBeUndefined();
    expect(buttonLabelled(container, "Undo")).toBeUndefined();
    press(container, "Choose another route");
    expect(container.querySelector("[data-fork-chooser]")).not.toBeNull();
    expect(container.querySelector("[data-branch-verdict]")).toBeNull();
  });

  it("wrong arrows on the wrong branch get the ordinary arrow verdict, not the branch card", () => {
    const { container, store } = mount(forkStep);
    pickRoute(container, "route-e1");
    // Only the proton grab: an incomplete drawing, which the first grade names.
    const s = store();
    tap(s, targetCentre({ kind: "atom", atomId: "ow" }));
    drag(s, targetCentre({ kind: "lonePair", atomId: "ow" }), targetCentre({ kind: "atom", atomId: "hb" }));
    press(container, "Check");
    expect(container.querySelector("[data-branch-verdict]")).toBeNull();
    expect(container.textContent).toMatch(/1 of 2/);
  });

  it("the favoured route wins and the win names the route", () => {
    const { container, store } = mount(forkStep);
    pickRoute(container, "route-capture");
    drawCapture(store());
    press(container, "Check");
    expect(container.textContent).toContain("Goal achieved");
    expect(container.textContent).toContain("Route: Capture by water");
    expect(buttonLabelled(container, "Continue")).toBeDefined();
  });
});

describe("no fork in the registry names its answer before the choice", () => {
  const forkedQuestions = TRAINER_SEQUENCES.filter((entry) => entry.steps.some((step) => step.fork !== undefined)).map(questionFromSequence);
  for (const q of forkedQuestions) {
    for (const [index, step] of q.steps.entries()) {
      const fork = step.fork;
      if (fork === undefined) continue;
      it(`${q.id} step ${index + 1}: the chooser shows the conditions once and no route's reasoning, hint or title`, () => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        mounted = { root, container };
        act(() => {
          root.render(createElement(TrainerScreen, { question: q, stepIndex: index, onExit: () => undefined, reducedMotion: true }));
        });
        const text = container.textContent;
        expect(container.querySelector("[data-fork-chooser]")).not.toBeNull();
        expect(text).toContain(fork.prompt);
        expect(text).not.toContain(step.prompt);
        expect(text).not.toContain(q.title);
        if (step.hint !== fork.conditions) expect(text).not.toContain(step.hint);
        expect(text.split(fork.conditions).length).toBe(2);
        for (const route of fork.routes) {
          expect(text).not.toContain(route.why);
          expect(text).toContain(route.label);
        }
      });
    }
  }
});

describe("the strip is wired to the screen", () => {
  it("renders one node per step plus the product, and looks back without leaking the live step", () => {
    const { container } = mount(1);
    const nodes = container.querySelectorAll("[data-strip-node]");
    expect(nodes.length).toBe(question.steps.length + 1);
    const first = container.querySelector<SVGGElement>('[data-strip-node="0"] circle');
    if (first === null) throw new Error("no first node");
    act(() => first.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 })));
    // jsdom has no layout, so the pointer path cannot resolve a node; the keyboard path can.
    const strip = container.querySelector<HTMLElement>("[data-step-strip]");
    if (strip === null) throw new Error("no strip");
    act(() => strip.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
    expect(container.textContent).toContain(question.steps[0]!.prompt);
    expect(buttonLabelled(container, "Back to step 2")).toBeDefined();
    expect(buttonLabelled(container, "Check")).toBeUndefined();
    act(() => strip.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(buttonLabelled(container, "Back to step 2")).toBeUndefined();
    // Ahead of the live step is not reachable: End lands on the live step, never the product.
    act(() => strip.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(buttonLabelled(container, "Back to step 2")).toBeUndefined();
  });

  it("renders no strip for a single-step question", () => {
    const single = { ...question, steps: question.steps.slice(0, 1) };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mounted = { root, container };
    act(() => {
      root.render(createElement(TrainerScreen, { question: single, onExit: () => undefined, reducedMotion: true }));
    });
    expect(container.querySelector("[data-step-strip]")).toBeNull();
  });
});
