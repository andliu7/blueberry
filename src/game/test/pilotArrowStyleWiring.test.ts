// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?targets=1&store=1"}

/**
 * The drag style setting is presentation only, pinned on the REAL screen.
 *
 * The owner's setting (settings/arrowStyle.ts) changes how a push is drawn
 * and nothing else. This mounts TrainerScreen over the SN2 step under every
 * style, draws the same pushes through the component's own interaction store
 * (the ?store=1 hook pilotScreenWiring.test.ts uses, since jsdom has no
 * getScreenCTM), and requires the same verdict every time: the same sheet
 * tone, the same headline. It also pins the half that should differ, the
 * drawing under the finger, and the verdict painted on the molecule.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { InteractionStore, Point2 } from "@blueberry/interaction";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../demo/sn2Step";
import { TrainerScreen } from "../tabs/trainer/engine/TrainerScreen";
import type { TrainerQuestion } from "../tabs/trainer/engine/question";
import { arrowStyleSetting, ARROW_STYLES, type ArrowStyle } from "../settings/arrowStyle";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const question: TrainerQuestion = {
  id: "sn2",
  kind: "reaction",
  title: "SN2 at bromomethane",
  steps: [{ step: SN2_DEMO_STEP, fromHints: SN2_FROM_HINTS, toHints: SN2_TO_HINTS, prompt: "Push the electrons.", hint: "Tap the oxygen." }],
  successLine: "Back-side attack.",
  wonPill: "Goal achieved",
};

let mounted: { root: Root; container: HTMLElement } | null = null;

function mount(style: ArrowStyle): { container: HTMLElement; store: InteractionStore } {
  act(() => arrowStyleSetting.set(style));
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => {
    root.render(createElement(TrainerScreen, { question, onExit: () => undefined, reducedMotion: true }));
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
  act(() => arrowStyleSetting.set("auto"));
});

let clock = 0;
function pointerAt(point: Point2) {
  clock += 16;
  return { pointerId: 1, pointerType: "touch" as const, point, timestampMs: clock };
}

function targetCentre(match: Record<string, unknown>): Point2 {
  const hit = (window.__pilotTargets ?? []).find((entry) =>
    Object.entries(match).every(([key, value]) => (entry.target as unknown as Record<string, unknown>)[key] === value),
  );
  if (hit === undefined) throw new Error(`no target for ${JSON.stringify(match)}`);
  return hit.centre;
}

const down = (store: InteractionStore, p: Point2) => act(() => void store.dispatch({ kind: "pointerDown", pointer: pointerAt(p) }));
const move = (store: InteractionStore, p: Point2) => act(() => void store.dispatch({ kind: "pointerMove", pointer: pointerAt(p) }));
const up = (store: InteractionStore, p: Point2) => act(() => void store.dispatch({ kind: "pointerUp", pointer: pointerAt(p) }));

function drag(store: InteractionStore, from: Point2, to: Point2): void {
  down(store, from);
  move(store, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
  move(store, to);
  up(store, to);
}

function openOxygen(store: InteractionStore): void {
  const o = targetCentre({ kind: "atom", atomId: "o1" });
  down(store, o);
  up(store, o);
}

function check(container: HTMLElement): { tone: string | null; headline: string } {
  const button = [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === "Check");
  if (button === undefined || button.disabled) throw new Error("no enabled Check");
  act(() => button.click());
  const sheet = container.querySelector("[data-answer-sheet]");
  return {
    tone: sheet?.getAttribute("data-answer-sheet") ?? null,
    headline: (container.querySelector("[data-sheet-headline]")?.textContent ?? "").trim(),
  };
}

function drawWin(store: InteractionStore): void {
  openOxygen(store);
  drag(store, targetCentre({ kind: "lonePair", atomId: "o1" }), targetCentre({ kind: "atom", atomId: "c1" }));
  drag(store, targetCentre({ kind: "bondEndHandle", bondId: "b-cbr", atomId: "br1" }), targetCentre({ kind: "atom", atomId: "br1" }));
}

function drawMiss(store: InteractionStore): void {
  openOxygen(store);
  drag(store, targetCentre({ kind: "lonePair", atomId: "o1" }), targetCentre({ kind: "atom", atomId: "br1" }));
}

describe("the drag style never changes a verdict", () => {
  it("grades the same win and the same miss under every style", () => {
    const results: Record<string, unknown> = {};
    for (const style of ARROW_STYLES) {
      let { container, store } = mount(style);
      drawWin(store);
      const win = check(container);
      act(() => mounted?.root.unmount());
      mounted?.container.remove();
      mounted = null;

      ({ container, store } = mount(style));
      drawMiss(store);
      const miss = check(container);
      results[style] = { win, miss };
    }
    // The win is a win and the miss a miss, first, so "all equal" cannot
    // pass by all three being equally broken.
    const auto = results.auto as { win: { tone: string }; miss: { tone: string } };
    expect(auto.win.tone).toBe("good");
    expect(auto.miss.tone).not.toBe("good");
    expect(results.curved).toEqual(results.auto);
    expect(results.dashed).toEqual(results.auto);
  });
});

describe("what the style does change", () => {
  it("draws the drag under the finger in the chosen style", () => {
    for (const [style, expected] of [["auto", "dashed"], ["curved", "curved"], ["dashed", "dashed"]] as const) {
      const { container, store } = mount(style);
      openOxygen(store);
      const lp = targetCentre({ kind: "lonePair", atomId: "o1" });
      down(store, lp);
      move(store, { x: lp.x + 30, y: lp.y - 40 });
      expect(container.querySelector("[data-drag-style]")?.getAttribute("data-drag-style")).toBe(expected);
      up(store, { x: lp.x + 30, y: lp.y - 40 });
      act(() => mounted?.root.unmount());
      mounted?.container.remove();
      mounted = null;
    }
  });

  it("previews the landing once the machine snaps to a target", () => {
    const { container, store } = mount("auto");
    openOxygen(store);
    const lp = targetCentre({ kind: "lonePair", atomId: "o1" });
    down(store, lp);
    move(store, { x: lp.x + 30, y: lp.y - 40 });
    expect(container.querySelector("[data-snap-halo]")).toBeNull();
    move(store, targetCentre({ kind: "atom", atomId: "c1" }));
    expect(container.querySelector("[data-snap-halo]")).not.toBeNull();
    expect(container.querySelector("[data-drag-style]")?.hasAttribute("data-snapped")).toBe(true);
  });
});

describe("the verdict is painted on the molecule", () => {
  it("marks the offending push amber on a miss, and clears with the sheet", () => {
    const { container, store } = mount("auto");
    drawMiss(store);
    expect(container.querySelector("[data-push-mark]")).toBeNull();
    check(container);
    expect(container.querySelectorAll('[data-push-mark="near"]').length).toBe(1);
    expect(container.querySelector('[data-push-mark="good"]')).toBeNull();
    const gotIt = [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === "Got it");
    if (gotIt === undefined) throw new Error("no Got it");
    act(() => gotIt.click());
    expect(container.querySelector("[data-push-mark]")).toBeNull();
  });

  it("marks every push green on the win", () => {
    const { container, store } = mount("curved");
    drawWin(store);
    check(container);
    expect(container.querySelectorAll('[data-push-mark="good"]').length).toBe(2);
  });
});

/* ---------------- round two: what is actually painted, and where ---------------- */

/** The opacity the eye gets: the product of every opacity attribute from the element up to the canvas. */
function effectiveOpacity(element: Element): number {
  let opacity = 1;
  for (let node: Element | null = element; node !== null && node.tagName.toLowerCase() !== "svg"; node = node.parentElement) {
    const own = node.getAttribute("opacity");
    if (own !== null) opacity *= Number(own);
  }
  return opacity;
}

function circleCentre(element: Element): Point2 {
  return { x: Number(element.getAttribute("cx")), y: Number(element.getAttribute("cy")) };
}

const distance = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.y - b.y);

describe("the verdict is visible, not merely present", () => {
  for (const style of ARROW_STYLES) {
    it(`under reduced motion, a ${style} win holds both arrows green at full opacity`, () => {
      const { container, store } = mount(style);
      drawWin(store);
      check(container);
      const records = [...container.querySelectorAll("[data-push-record]")];
      expect(records.length).toBe(2);
      for (const record of records) {
        expect(effectiveOpacity(record)).toBeGreaterThan(0.9);
        // The arrow itself carries the win's colour, not only a ring beside it.
        const painted = [...record.querySelectorAll("path, line")].filter(
          (shape) => shape.getAttribute("fill") === "var(--good)" || shape.getAttribute("stroke") === "var(--good)",
        );
        expect(painted.length).toBeGreaterThan(0);
      }
    });
  }

  it("rings the atom the wrong arrow hit, and calmly marks where it should have gone", () => {
    const { container, store } = mount("auto");
    drawMiss(store);
    const bromine = targetCentre({ kind: "atom", atomId: "br1" });
    const carbon = targetCentre({ kind: "atom", atomId: "c1" });
    check(container);
    const ring = container.querySelector('[data-push-mark="near"]');
    if (ring === null) throw new Error("no miss ring");
    expect(distance(circleCentre(ring), bromine)).toBeLessThan(1);
    expect(effectiveOpacity(ring)).toBeGreaterThan(0.9);
    const hint = container.querySelector("[data-push-hint] circle");
    if (hint === null) throw new Error("no hint on the right target");
    expect(distance(circleCentre(hint), carbon)).toBeLessThan(1);
  });
});

describe("reduced motion on a win: hold the green arrows, then cut to the product", () => {
  // Owner ruling, 30 Sep 2026: both are seen and nothing moves.
  it("paints the green arrows first and the settled product after about a second", () => {
    vi.useFakeTimers();
    try {
      const { container, store } = mount("dashed");
      drawWin(store);
      check(container);
      const canvas = container.querySelector("[data-pilot-canvas]");
      if (canvas === null) throw new Error("no canvas");
      // Before the cut: the drawing frame, both arrows green and at full opacity.
      expect(canvas.getAttribute("data-win-t")).toBe("0.00");
      const before = [...container.querySelectorAll("[data-push-record]")];
      expect(before.length).toBe(2);
      for (const record of before) expect(effectiveOpacity(record)).toBeGreaterThan(0.9);
      // Still held just short of the cut.
      act(() => void vi.advanceTimersByTime(900));
      expect(canvas.getAttribute("data-win-t")).toBe("0.00");
      // After it: the settled product, in one step, and the arrows no longer painted.
      act(() => void vi.advanceTimersByTime(200));
      expect(canvas.getAttribute("data-win-t")).toBe("1.00");
      for (const record of container.querySelectorAll("[data-push-record]")) expect(effectiveOpacity(record)).toBeLessThan(0.05);
    } finally {
      vi.useRealTimers();
    }
  });
});
