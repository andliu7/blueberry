// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?targets=1&store=1"}

/**
 * Audit 23 Oct, section 5 #8: on the arrow stage a drag that ended on nothing
 * drew nothing, said nothing, and lit Undo as if a move had been made. This
 * mounts the real screen over the SN2 demo and sends the drags through the
 * canvas's own pointer handlers, so the screen's dispatch wrapper (the part
 * that reads the machine's report) is what is under test. jsdom has no
 * getScreenCTM, so the canvas is given an identity one: client pixels are
 * canvas pixels.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { currentDraft, type InteractionStore, type Point2 } from "@blueberry/interaction";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../demo/sn2Step";
import { TrainerScreen } from "../tabs/trainer/engine/TrainerScreen";
import type { TrainerQuestion } from "../tabs/trainer/engine/question";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HINT = "Tap the oxygen to open its lone pairs, and remember the bromide has to let go.";
const question: TrainerQuestion = {
  id: "sn2",
  kind: "reaction",
  title: "SN2 at bromomethane",
  steps: [{ step: SN2_DEMO_STEP, fromHints: SN2_FROM_HINTS, toHints: SN2_TO_HINTS, prompt: "Push the electrons for this SN2 in one step.", hint: HINT }],
  successLine: "Back-side attack: the hydroxide lone pair forms the new C-O bond as the bromide leaves.",
  wonPill: "Goal achieved",
};

beforeAll(() => {
  // An identity screen matrix and the one DOMPoint method the adapter calls.
  const identity = { inverse: () => identity };
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", { configurable: true, value: () => identity });
  if (typeof globalThis.DOMPoint === "undefined") {
    (globalThis as Record<string, unknown>).DOMPoint = class {
      readonly x: number;
      readonly y: number;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
      matrixTransform() {
        return this;
      }
    };
  }
});

let mounted: { root: Root; container: HTMLElement } | null = null;

function mount(): { container: HTMLElement; store: InteractionStore } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => root.render(createElement(TrainerScreen, { question, onExit: () => undefined, reducedMotion: true })));
  const store = window.__pilotStore;
  if (store === undefined) throw new Error("the ?store=1 debug hook did not expose the interaction store");
  return { container, store };
}

afterEach(() => {
  if (mounted !== null) {
    act(() => mounted!.root.unmount());
    mounted.container.remove();
    mounted = null;
  }
});

function targetCentre(match: Record<string, unknown>): Point2 {
  const hit = (window.__pilotTargets ?? []).find((entry) =>
    Object.entries(match).every(([key, value]) => (entry.target as unknown as Record<string, unknown>)[key] === value),
  );
  if (hit === undefined) throw new Error(`no target for ${JSON.stringify(match)}`);
  return hit.centre;
}

let clock = 0;
function fire(container: HTMLElement, type: string, at: Point2): void {
  const canvas = container.querySelector("[data-pilot-canvas]");
  if (canvas === null) throw new Error("no canvas");
  clock += 16;
  // jsdom has no PointerEvent; React reads the same fields off a MouseEvent of the pointer type.
  act(() => void canvas.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: at.x, clientY: at.y, button: 0, buttons: type === "pointerup" ? 0 : 1 })));
}

function dragOnCanvas(container: HTMLElement, from: Point2, to: Point2): void {
  fire(container, "pointerdown", from);
  fire(container, "pointermove", { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
  fire(container, "pointermove", to);
  fire(container, "pointerup", to);
}

function arrowCount(store: InteractionStore): number {
  const draft = currentDraft(store.getSnapshot());
  return draft.shape === "mechanism" ? draft.arrows.length : -1;
}

const undoChip = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLButtonElement>("button")].find((b) => (b.textContent ?? "").trim() === "Undo");
const hintPill = (container: HTMLElement) => container.querySelector('[role="status"]');

const NOWHERE: Point2 = { x: -4000, y: -4000 };

describe("a drag that ends on nothing", () => {
  it("says where to drop it, and leaves Undo off with nothing drawn", () => {
    const { container, store } = mount();
    expect(hintPill(container)?.textContent).toBe(HINT);
    dragOnCanvas(container, targetCentre({ kind: "bondEndHandle", bondId: "b-cbr", atomId: "br1" }), NOWHERE);
    expect(arrowCount(store)).toBe(0);
    expect(hintPill(container)?.textContent).toBe("Drop it on an atom or bond.");
    expect(undoChip(container)?.disabled).toBe(true);
    // The next press puts the hint back.
    fire(container, "pointerdown", targetCentre({ kind: "bondEndHandle", bondId: "b-cbr", atomId: "br1" }));
    expect(hintPill(container)?.textContent).toBe(HINT);
  });

  it("does not cost a press of Undo: one press still takes back the last arrow", () => {
    const { container, store } = mount();
    dragOnCanvas(
      container,
      targetCentre({ kind: "bondEndHandle", bondId: "b-cbr", atomId: "br1" }),
      targetCentre({ kind: "atom", atomId: "br1" }),
    );
    expect(arrowCount(store)).toBe(1);
    dragOnCanvas(container, targetCentre({ kind: "lonePair", atomId: "o1" }), NOWHERE);
    expect(arrowCount(store)).toBe(1);
    expect(undoChip(container)?.disabled).toBe(false);
    act(() => undoChip(container)?.click());
    expect(arrowCount(store)).toBe(0);
  });
});
