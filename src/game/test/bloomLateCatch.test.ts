// @vitest-environment jsdom

/**
 * The lesson-complete diamond catch when the diamond count lands AFTER the
 * beat mounted (BloomLessonComplete.tsx; BeatRunner passes `banked`, which is
 * null until the store's receipt arrives). Before 25 Oct the face beats were
 * scheduled once at mount, so a late count drew the diamond but Bloom never
 * went wide-eyed or bounced for it.
 *
 * Berry is stubbed to a probe that records the behaviour it was handed, since
 * the explicit cheer mood hides the behaviour from the DOM.
 */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const behaviours: string[] = [];
vi.mock("../mascot/Berry", () => ({
  Berry: (props: { behaviour?: string }) => {
    behaviours.push(props.behaviour ?? "idle");
    return null;
  },
}));

import { BloomLessonComplete } from "../mascot/progression/BloomLessonComplete";
import { LESSON_CATCH_START_MS, catchBeats } from "../mascot/progression/progression";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLElement | null = null;
beforeEach(() => {
  vi.useFakeTimers();
  behaviours.length = 0;
});
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.useRealTimers();
});

const render = (diamonds: number | null) =>
  act(() => root!.render(createElement(BloomLessonComplete, { reducedMotion: false, xp: 10, diamonds })));

function mount(diamonds: number | null): void {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  render(diamonds);
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const last = () => behaviours[behaviours.length - 1];

describe("BloomLessonComplete diamond catch", () => {
  it("plays the catch face when the count is there at mount", () => {
    mount(5);
    const beats = catchBeats(LESSON_CATCH_START_MS);
    advance(beats.fallAt);
    expect(last()).toBe("wideEyed");
    advance(beats.landAt - beats.fallAt);
    expect(last()).toBe("bounce");
  });

  it("plays it when the count arrives after mount, still before the catch's beat", () => {
    mount(null);
    advance(300);
    expect(container!.querySelector(".bloom-catch")).toBeNull();
    render(5);
    expect(container!.querySelector(".bloom-catch")).not.toBeNull();
    const beats = catchBeats(LESSON_CATCH_START_MS);
    // The catch keeps its usual beat, measured from the screen opening.
    advance(beats.fallAt - 300 - 1);
    expect(behaviours).not.toContain("wideEyed");
    advance(1);
    expect(last()).toBe("wideEyed");
    advance(beats.landAt - beats.fallAt);
    expect(last()).toBe("bounce");
  });

  it("plays it at once when the count arrives after the catch's beat has passed", () => {
    mount(null);
    advance(LESSON_CATCH_START_MS + 2000);
    expect(behaviours).not.toContain("wideEyed");
    render(3);
    const beats = catchBeats(0);
    advance(beats.fallAt);
    expect(last()).toBe("wideEyed");
    advance(beats.landAt - beats.fallAt);
    expect(last()).toBe("bounce");
  });

  it("plays no catch when the count arrives as 0", () => {
    mount(null);
    render(0);
    advance(LESSON_CATCH_START_MS + 5000);
    expect(behaviours).not.toContain("wideEyed");
    expect(container!.querySelector(".bloom-catch")).toBeNull();
  });
});
