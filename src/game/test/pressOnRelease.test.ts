// @vitest-environment jsdom

/**
 * Buttons press and hold (owner, 17 Oct "Next" list). The face sinks on
 * pointer down and stays down until release, and the action fires on release
 * only if the pointer is still on the button, so a drag off cancels.
 *
 * The sink is CSS (:active); the action is onClick, which the browser sends
 * only on release over the same control and never after a pointercancel. A
 * handler on onPointerDown commits the moment the finger lands, so this file
 * holds three things:
 *   1. No button-like control in src/game acts on pointer down. Drag, scrub
 *      and full-screen skip surfaces use pointer events on purpose and are
 *      listed by name with how many such handlers each may carry.
 *   2. Mounted, a pointerdown alone picks nothing on the match board and the
 *      lesson's answer tiles; a click picks.
 *   3. The reason chips keep their picked look while held, because the
 *      highlight that used to be set on pointer down is now `:active`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SEED_CORPUS } from "@blueberry/curriculum";
import { MatchBoard } from "../beats/match/MatchBoard";
import { ALKENE_OXIDATION_BOARD } from "../beats/match/boards";
import { ProblemView } from "../lesson/ProblemView";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Paths from node:path, not URL: under jsdom the global URL is jsdom's.
const GAME = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ */
/* 1. The source scan                                                   */
/* ------------------------------------------------------------------ */

/**
 * Files that may act on pointer down, and how many such handlers each holds.
 * Every entry is a drag, a scrub or a tap-anywhere-to-skip stage, where the
 * gesture starts on pointer down and nothing is chosen that a drag off would
 * need to cancel. A new entry here is a decision, not a fix.
 */
const ALLOWED: Readonly<Record<string, number>> = {
  "beats/sort/SortBeatView.tsx": 1, // drag to reorder
  "beats/trace/FreehandCanvas.tsx": 1, // drawing
  "beats/trace/GuidedCanvas.tsx": 1, // drawing
  "beats/trace/ScratchpadCanvas.tsx": 1, // drawing
  "cards/ui/Run.tsx": 1, // swipe to grade
  "tabs/trainer/engine/TrainerCanvas.tsx": 1, // arrow drawing
  "tabs/trainer/engine/StepStrip.tsx": 1, // scrub
  "lesson/RewardMoment.tsx": 1, // tap anywhere skips the animation
  "lesson/StreakScreen.tsx": 1, // tap anywhere skips the animation
  "mastery/RankUpMoment.tsx": 1, // tap anywhere skips the animation
  "render/svg/MoleculeSvg.tsx": 1, // onAtomPointerDown, no caller today
};

/** A button inside a skip stage stops the stage's pointer down and does nothing else. */
const STOP_ONLY = "onPointerDown={(event) => event.stopPropagation()}";

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : tsxFiles(path);
    return name.endsWith(".tsx") ? [path] : [];
  });
}

describe("button-like controls commit on release", () => {
  it("leaves pointer-down handlers only on drag, scrub and skip surfaces", () => {
    const found: Record<string, number> = {};
    for (const path of tsxFiles(GAME)) {
      const rel = relative(GAME, path).replaceAll("\\", "/");
      const source = readFileSync(path, "utf8").replaceAll(STOP_ONLY, "");
      // Both the JSX prop and a handler bag spread onto a button.
      const count = (source.match(/onPointerDown=|onPointerDown:/g) ?? []).length;
      if (count > 0) found[rel] = count;
    }
    const over = Object.entries(found)
      .filter(([rel, count]) => count > (ALLOWED[rel] ?? 0))
      .map(([rel, count]) => `${rel}: ${count}`);
    expect(over, "move these actions to onClick").toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Mounted                                                           */
/* ------------------------------------------------------------------ */

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function mount(element: ReturnType<typeof createElement>): HTMLElement {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root?.render(element));
  return host;
}

function pointerDown(element: Element): void {
  act(() => {
    element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
  });
}

function click(element: HTMLElement): void {
  act(() => element.click());
}

describe("the match board", () => {
  it("picks a tile on click, not on pointer down", () => {
    const view = mount(createElement(MatchBoard, { beat: ALKENE_OXIDATION_BOARD, level: 1 }));
    const tile = view.querySelector<HTMLButtonElement>("button[aria-pressed]");
    expect(tile).not.toBeNull();
    if (tile === null) return;
    pointerDown(tile);
    expect(tile.getAttribute("aria-pressed")).toBe("false");
    click(tile);
    expect(tile.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("the lesson's answer tiles", () => {
  const problem = SEED_CORPUS.find((entry) => entry.answer.kind === "major_product");

  it("has a major product question to mount", () => {
    expect(problem).toBeDefined();
  });

  it("picks a product on click, not on pointer down, and Check waits for the pick", () => {
    if (problem === undefined) return;
    const view = mount(createElement(ProblemView, { problem, locked: false, onSubmit: () => {}, onSkip: () => {} }));
    const tile = view.querySelector<HTMLButtonElement>(".option-tile");
    const check = [...view.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Check");
    expect(tile).not.toBeNull();
    expect(check).toBeDefined();
    if (tile === null || check === undefined) return;
    pointerDown(tile);
    expect(tile.getAttribute("aria-pressed")).toBe("false");
    expect(view.querySelector(".reason-chips"), "no reason row before a product is picked").toBeNull();
    expect(check.disabled).toBe(true);
    click(tile);
    expect(tile.getAttribute("aria-pressed")).toBe("true");
    expect(view.querySelector(".reason-chips")).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* 3. The held look                                                     */
/* ------------------------------------------------------------------ */

describe("the reason chips", () => {
  it("keep the picked look while held, now the pick waits for release", () => {
    const css = readFileSync(join(GAME, "lesson/scheme.css"), "utf8");
    expect(css).toMatch(/\.reason-chip:active:not\(:disabled\)\s*\{[^}]*border-color:\s*var\(--bb-primary\)/);
  });
});
