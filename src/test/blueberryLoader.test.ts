// @vitest-environment jsdom
/**
 * The loader's promises. Rewritten 28 Oct when the berry-on-a-bar loader was
 * removed (owner: "really ugly"): the page still waits for the fade, reduced
 * motion takes the instant path, only compositor-friendly properties move, the
 * glass shader stays out of the first load, and assistive tech is told what is
 * happening.
 *
 * Half of this reads the source (the repo's habit for "what does this file
 * animate"), half renders the real LoaderGate in jsdom around a lazy page whose
 * chunk resolves when the test says so.
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { act, createElement, lazy } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LoaderGate, SHOW_AFTER_MS } from "@/components/ui/blueberry-loader";

const SOURCE = readFileSync("src/components/ui/blueberry-loader.tsx", "utf8");

describe("the removed bar loader stays removed", () => {
  it("has no bar fill, ball, splat disc or creep", () => {
    // Code only: the header comment says what was removed, by name.
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const gone of ["CREEP_TO", "FILL_SPRING", "runFinish", "splat", "clipPath", "scaleX", "bg-primary"]) {
      expect(code, gone).not.toContain(gone);
    }
  });

  it("is the only path to safeToRemove in the loader", () => {
    expect(SOURCE.match(/remove\.current\?\.\(\)/g)).toHaveLength(1);
  });
});

describe("only transform and opacity move", () => {
  const ALLOWED = new Set(["y", "opacity"]);

  it("animate() targets only transform and opacity", () => {
    const keys: string[] = [];
    for (const m of SOURCE.matchAll(/animate\([^,]+,\s*\{([^}]*)\}/g)) {
      for (const k of m[1].matchAll(/(\w+)\s*:/g)) keys.push(k[1]);
    }
    expect(keys.length).toBeGreaterThan(2);
    expect(keys.filter((k) => !ALLOWED.has(k))).toEqual([]);
  });

  it("uses no CSS transition or keyframe utility that could animate layout", () => {
    expect(SOURCE).not.toMatch(/\b(?:transition|animate)-\w/);
    expect(SOURCE).not.toMatch(/\bwidth\s*:/);
  });
});

describe("the shader is never in the first load", () => {
  it("is reached only through a dynamic import, and only with WebGL2 and motion allowed", () => {
    expect(SOURCE).toMatch(/lazy\(\(\) =>\s*import\("@\/components\/ui\/liquid-glass-logo-reveal"\)/);
    expect(SOURCE).not.toMatch(/^import .*liquid-glass-logo-reveal/m);
    expect(SOURCE).toContain("if (!reduced && hasWebGL2()) setGlass(true);");
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

  it("covers the page after it arrives, until the fade has run, and tells assistive tech", async () => {
    prefersReducedMotion(false);
    const gate = mountGate();
    await wait(SHOW_AFTER_MS + 100);
    const bar = gate.bar()!;
    expect(bar).not.toBeNull();
    // While loading: labelled, bounded, no fake number, region busy.
    expect(bar.getAttribute("aria-label")).toBe("Loading Blueberry");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    const layer = bar.closest("[aria-busy]")!;
    expect(layer.getAttribute("aria-busy")).toBe("true");

    await gate.resolve();
    await wait(40);
    // The page is mounted underneath, and the loader is still on top of it.
    expect(gate.page()).not.toBeNull();
    expect(gate.bar()).not.toBeNull();
    // Done: it states 100, the region is no longer busy or clickable, and the live region says so.
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(layer.getAttribute("aria-busy")).toBe("false");
    expect(layer.className).toContain("pointer-events-none");
    expect(layer.querySelector('[aria-live="polite"]')!.textContent).toBe("Blueberry has loaded");

    for (let i = 0; i < 40 && gate.bar() !== null; i++) await wait(100);
    expect(gate.bar(), "the loader never let go").toBeNull();
    expect(gate.page()).not.toBeNull();
  });

  it("reduced motion: Bloom sits still, no canvas, and the layer lets go", async () => {
    prefersReducedMotion(true);
    const gate = mountGate();
    await wait(SHOW_AFTER_MS + 100);
    const layer = gate.bar()!.closest("[aria-busy]") as HTMLElement;
    expect(layer.querySelector("canvas")).toBeNull();
    await gate.resolve();
    await wait(60);
    for (let i = 0; i < 20 && gate.bar() !== null; i++) await wait(50);
    expect(gate.bar()).toBeNull();
  });
});
