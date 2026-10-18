// @vitest-environment jsdom
/**
 * Save as you go, wired: the runners keep a bookmark through a remount.
 *
 * WHY THIS FILE EXISTS. lessonSave.test.ts pins the pure module, and every one
 * of its tests passed while the app lost saves: BeatRunner's own save effect
 * ran for a practice node on mount, saw nothing answered, and deleted the
 * practice bookmark before PracticeRunner could read it. And the drawing
 * steps never wrote at all. So this suite mounts the real runner over a real
 * (jsdom) localStorage:
 *   1. a practice node's saved run survives the mount and is offered first,
 *      not after the priming preview;
 *   2. a lesson saved inside its "Draw it" items is offered with the right
 *      count, CONTINUE keeps the bookmark, and the step reopens on the next
 *      drawing rather than the first.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BeatRunner } from "../beats/BeatRunner";
import { lessonPoolItems, planLesson, reportStep, startRun } from "../beats/template";
import { practicePool } from "../beats/practice/pools";
import { answerProblem, startPracticeRun } from "../beats/practice/run";
import { saveKey, saveLesson, savePractice } from "../resume/lessonSave";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
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
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false;
  };
  window.localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

/** Let lazy chunks and effects settle. */
async function settle(until: () => boolean, tries = 60): Promise<void> {
  for (let i = 0; i < tries && !until(); i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  }
}

const promptUp = () => host.querySelector('[data-resume="continue"]') !== null;

describe("a practice node keeps its save through the lesson runner's mount", () => {
  it("offers the saved run, and the bookmark is still there", async () => {
    const node = "u1-rank-cation";
    const ids = practicePool(node).map((entry) => entry.id);
    expect(ids.length).toBeGreaterThan(1);
    savePractice(window.localStorage, node, ids, answerProblem(startPracticeRun(ids), true));
    act(() => root.render(createElement(BeatRunner, { node, onExit: () => {}, reducedMotion: true })));
    await settle(promptUp);
    expect(window.localStorage.getItem(saveKey(node))).not.toBeNull();
    expect(host.textContent).toContain("1 problem done");
    expect(promptUp()).toBe(true);
  });
});

describe("a lesson saved inside its drawings reopens on the next drawing", () => {
  it("counts the drawings, keeps the bookmark on CONTINUE, and skips the finished ones", async () => {
    const node = "u1-x2";
    const plan = planLesson(node)!;
    const at = plan.steps.findIndex((step) => (step.beat as { draws?: string }).draws !== undefined);
    expect(at).toBeGreaterThan(0);
    const draws = lessonPoolItems((plan.steps[at]!.beat as { draws: string }).draws, "draw");
    expect(draws.length).toBeGreaterThan(1);

    let run = startRun(plan);
    for (let i = 0; i < at; i += 1) {
      run = reportStep(run, plan.steps[i]!.beat.kind === "meet" ? { cleared: 0, total: 0 } : { cleared: 1, total: 1 });
    }
    const before = run.totalBeats;
    const done = draws.slice(0, 1).map((entry) => entry.id);
    saveLesson(window.localStorage, node, run, null, undefined, before + 1, {
      pool: { step: `content:${at}:draws`, done, cleared: 1, missed: [] },
      drawsDone: null,
      recycleDraws: null,
    });

    act(() => root.render(createElement(BeatRunner, { node, onExit: () => {}, reducedMotion: true })));
    await settle(promptUp);
    expect(promptUp()).toBe(true);
    expect(host.textContent).toContain(`${before + 1} questions done and saved`);

    act(() => (host.querySelector('[data-resume="continue"]') as HTMLButtonElement).click());
    const next = (draws[1]!.item as { beat: { prompt: string } }).beat.prompt;
    await settle(() => host.textContent?.includes(next) === true);
    expect(host.textContent).toContain(next);
    const kept = JSON.parse(window.localStorage.getItem(saveKey(node)) ?? "null") as { open?: { pool?: { done: string[] } } } | null;
    expect(kept?.open?.pool?.done).toEqual(done);
  });
});
