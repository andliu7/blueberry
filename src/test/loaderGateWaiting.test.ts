// @vitest-environment jsdom
/**
 * LoaderGate's `waiting` prop: a wait the caller knows about that is not a
 * chunk (the #/app gate restoring a stored session, AppGate.tsx). The berry
 * shows after the same SHOW_AFTER_MS, and clearing the wait runs its finish.
 * Real time in slices, as blueberryLoader.test.ts does, so motion's own timers
 * behave as they do in a browser.
 */
import { afterEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LoaderGate, SHOW_AFTER_MS } from "@/components/ui/blueberry-loader";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function wait(ms: number) {
  for (let t = 0; t < ms; t += 20) await act(() => new Promise<void>((r) => setTimeout(r, 20)));
}

const bar = () => document.querySelector<HTMLElement>('[role="progressbar"]');

function render(waiting: boolean) {
  act(() => root!.render(createElement(LoaderGate, { waiting }, waiting ? null : createElement("main", { id: "page" }))));
}

describe("LoaderGate waiting", () => {
  it("shows nothing before SHOW_AFTER_MS, the berry after it, and finishes when the wait clears", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    render(true);
    await wait(SHOW_AFTER_MS / 2);
    expect(bar()).toBeNull();
    await wait(SHOW_AFTER_MS);
    expect(bar()).not.toBeNull();
    expect(bar()!.closest("[aria-busy]")!.getAttribute("aria-busy")).toBe("true");

    render(false);
    await wait(40);
    // The finish has started: the bar states 100 and the page is underneath.
    expect(bar()!.getAttribute("aria-valuenow")).toBe("100");
    expect(document.getElementById("page")).not.toBeNull();
    for (let i = 0; i < 40 && bar() !== null; i++) await wait(100);
    expect(bar(), "the loader never let go").toBeNull();
  });

  it("never shows for a wait shorter than SHOW_AFTER_MS", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    render(true);
    await wait(SHOW_AFTER_MS / 4);
    render(false);
    await wait(SHOW_AFTER_MS * 2);
    expect(bar()).toBeNull();
  });
});
