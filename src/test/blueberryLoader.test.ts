// @vitest-environment jsdom
/**
 * The loader's four promises, owner 2026-10-01: the bar finishes before the
 * page shows, reduced motion takes the instant path, only compositor-friendly
 * properties move, and assistive tech is told what is happening.
 *
 * Half of this reads the source (the repo's habit for "what does this file
 * animate"), half renders the real LoaderGate in jsdom around a lazy page whose
 * chunk resolves when the test says so.
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement, lazy } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  FADE_S,
  FILL_SPRING,
  LoaderGate,
  OPEN_S,
  SHORT_SHOW_MS,
  SHOW_AFTER_MS,
  runFinish,
  type FinishSteps,
} from "@/components/ui/blueberry-loader";

const SOURCE = readFileSync("src/components/ui/blueberry-loader.tsx", "utf8");

/** Records each step as it starts and as it ends, so the order can be read. */
function recorder() {
  const log: string[] = [];
  const step = (name: string) => async (arg?: unknown) => {
    log.push(arg === undefined ? name : `${name}(${String(arg)})`);
    await new Promise((r) => setTimeout(r, 5));
    log.push(`${name} done`);
  };
  const steps: FinishSteps = { fill: step("fill"), squash: step("squash"), splat: step("splat"), open: step("open") };
  return { log, steps, done: () => log.push("PAGE") };
}

describe("runFinish: the page waits for a full bar", () => {
  it("runs fill, squash, splat, open in that order, and only then lets the page out", async () => {
    const { log, steps, done } = recorder();
    await runFinish(steps, false, done);
    expect(log).toEqual([
      "fill(false)", "fill done", "squash", "squash done", "splat", "splat done", `open(${OPEN_S})`, "open done", "PAGE",
    ]);
  });

  it("takes the instant path when short: bar jumps full, a fade, no squash and no splat", async () => {
    const { log, steps, done } = recorder();
    await runFinish(steps, true, done);
    expect(log).toEqual(["fill(true)", "fill done", `open(${FADE_S})`, "open done", "PAGE"]);
  });

  it("never reveals the page while the bar is still filling", async () => {
    let release = () => {};
    const done = vi.fn();
    const steps: FinishSteps = {
      fill: () => new Promise<void>((r) => (release = r)),
      squash: async () => {},
      splat: async () => {},
      open: async () => {},
    };
    const running = runFinish(steps, false, done);
    await new Promise((r) => setTimeout(r, 20));
    expect(done).not.toHaveBeenCalled();
    release();
    await running;
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("keeps the owner's reference spring curve (damping ratio of 210/34/0.9), only faster", () => {
    const ratio = (k: number, c: number, m: number) => c / (2 * Math.sqrt(k * m));
    const { stiffness, damping, mass } = FILL_SPRING;
    expect(ratio(stiffness, damping, mass)).toBeCloseTo(ratio(210, 34, 0.9), 6);
    expect(ratio(stiffness, damping, mass)).toBeGreaterThan(1);
  });

  it("is the only path to safeToRemove in the loader", () => {
    expect(SOURCE.match(/remove\.current\?\.\(\)/g)).toHaveLength(1);
    expect(SOURCE).toMatch(/runFinish\(steps, short, \(\) => \{\s*if \(live\) remove\.current\?\.\(\);/);
  });
});

describe("only transform, opacity and clip-path move", () => {
  const ALLOWED = new Set(["x", "y", "scaleX", "scaleY", "opacity", "clipPath"]);

  /** The keys of every object literal handed to animate() as its target. */
  function animatedKeys(): string[] {
    const keys: string[] = [];
    for (const m of SOURCE.matchAll(/animate\([^,]+,\s*\{([^}]*)\}/g)) {
      for (const k of m[1].matchAll(/(\w+)\s*:/g)) keys.push(k[1]);
    }
    const bounce = SOURCE.match(/const BOUNCE = \{([\s\S]*?)\};/);
    expect(bounce, "the BOUNCE keyframes moved").not.toBeNull();
    for (const k of bounce![1].matchAll(/^\s*(\w+)\s*:/gm)) keys.push(k[1]);
    return keys;
  }

  it("animate() targets only transform, opacity and clip-path", () => {
    const keys = animatedKeys();
    expect(keys.length).toBeGreaterThan(5);
    expect(keys.filter((k) => !ALLOWED.has(k))).toEqual([]);
  });

  it("motion values drive only transforms", () => {
    const styles = [...SOURCE.matchAll(/<motion\.div[^>]*style=\{[^{]*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(styles.length).toBe(2);
    for (const s of styles) {
      for (const k of s.matchAll(/(\w+)\s*(?::|,|$)/g)) expect(["x", "scaleX", "fill"]).toContain(k[1]);
    }
  });

  it("uses no CSS transition or keyframe utility that could animate layout", () => {
    expect(SOURCE).not.toMatch(/\b(?:transition|animate)-\w/);
    expect(SOURCE).not.toMatch(/\bwidth\s*:/);
  });

  it("uses two colours: the primary token and the page ground, no literal hues", () => {
    expect(SOURCE.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
    expect(SOURCE).not.toMatch(/rgba?\(/);
    const colours = new Set([...SOURCE.matchAll(/\bbg-([a-z]+)/g)].map((m) => m[1]));
    expect([...colours].sort()).toEqual(["background", "primary"]);
  });
});

/* -------------------------------------------- the real gate, in jsdom -- */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
});

/**
 * One matchMedia for the whole file. motion reads the preference once and then
 * listens for "change", so flipping it between tests has to fire that event
 * rather than swap the stub.
 */
let reduceMotion = false;
const mediaListeners = new Set<() => void>();
window.matchMedia = ((query: string) => ({
  get matches() {
    return reduceMotion && query.includes("reduce");
  },
  media: query,
  onchange: null,
  addListener: (fn: () => void) => mediaListeners.add(fn),
  removeListener: (fn: () => void) => mediaListeners.delete(fn),
  addEventListener: (_: string, fn: () => void) => mediaListeners.add(fn),
  removeEventListener: (_: string, fn: () => void) => mediaListeners.delete(fn),
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

function prefersReducedMotion(reduce: boolean) {
  reduceMotion = reduce;
  for (const fn of mediaListeners) fn();
}

/**
 * Real time, in 20 ms slices, each in its own act(). One long act() would hold
 * every render and effect until it ends, so the loader would "mount" at the
 * end of the wait and the timings under test would be fiction.
 */
async function wait(ms: number) {
  for (let t = 0; t < ms; t += 20) await act(() => new Promise<void>((r) => setTimeout(r, 20)));
}

/** Mounts the gate around a lazy page; `resolve()` delivers its chunk. */
function mountGate() {
  let resolve = () => {};
  const chunk = new Promise<{ default: () => ReturnType<typeof createElement> }>((r) => {
    resolve = () => r({ default: () => createElement("main", { id: "page" }, "the page") });
  });
  const Page = lazy(() => chunk);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(LoaderGate, null, createElement(Page))));
  return {
    resolve: () => act(async () => resolve()),
    bar: () => document.querySelector<HTMLElement>('[role="progressbar"]'),
    page: () => document.getElementById("page"),
  };
}

describe("LoaderGate in a real render", () => {
  it("shows nothing for a load faster than SHOW_AFTER_MS", async () => {
    prefersReducedMotion(false);
    const gate = mountGate();
    await wait(SHOW_AFTER_MS / 4);
    await gate.resolve();
    await wait(SHOW_AFTER_MS * 2);
    expect(gate.bar()).toBeNull();
    expect(gate.page()).not.toBeNull();
  });

  it("keeps covering the page after it arrives, until the finish has run", async () => {
    prefersReducedMotion(false);
    const gate = mountGate();
    await wait(SHOW_AFTER_MS + SHORT_SHOW_MS + 100);
    const bar = gate.bar()!;
    expect(bar).not.toBeNull();
    // (d) while loading: labelled, bounded, no fake number, region busy.
    expect(bar.getAttribute("aria-label")).toBe("Loading Blueberry");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    const layer = bar.closest("[aria-busy]")!;
    expect(layer.getAttribute("aria-busy")).toBe("true");

    await gate.resolve();
    await wait(50);
    // (a) the page is mounted underneath, and the loader is still on top of it.
    expect(gate.page()).not.toBeNull();
    expect(gate.bar()).not.toBeNull();
    // (d) done: the bar states 100, the region is no longer busy or clickable,
    // and the live region says so.
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(layer.getAttribute("aria-busy")).toBe("false");
    expect(layer.className).toContain("pointer-events-none");
    expect(layer.querySelector('[aria-live="polite"]')!.textContent).toBe("Blueberry has loaded");

    for (let i = 0; i < 40 && gate.bar() !== null; i++) await wait(100);
    expect(gate.bar(), "the loader never let go").toBeNull();
    expect(gate.page()).not.toBeNull();
  });

  it("(b) reduced motion: no bounce, no splat, the bar fills and the layer fades", async () => {
    prefersReducedMotion(true);
    const gate = mountGate();
    await wait(SHOW_AFTER_MS + SHORT_SHOW_MS + 100);
    const layer = gate.bar()!.closest("[aria-busy]") as HTMLElement;
    const berry = layer.querySelector<HTMLElement>(".origin-bottom")!;
    const disc = layer.lastElementChild!.previousElementSibling as HTMLElement;
    expect(berry.style.transform).toBe("");
    await gate.resolve();
    await wait(60);
    expect(berry.style.transform).toBe("");
    expect(disc.style.clipPath).toBe("circle(0px at 0px 0px)");
    for (let i = 0; i < 20 && gate.bar() !== null; i++) await wait(50);
    expect(gate.bar()).toBeNull();
  });
});
