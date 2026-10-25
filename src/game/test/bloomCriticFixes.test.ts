// @vitest-environment jsdom

/**
 * Bloom critic fixes, 25 Oct (run wf_40263fac-f74), beside bloomWiringFixes.test.ts
 * and in its pattern. The hint ring and sparkle replays live in
 * useBerryReactions.test.ts and the late diamond catch in bloomLateCatch.test.ts.
 *
 * 1. Rung 0 (or showHowTo) still puts one Bloom in the frame: the how-to row
 *    has no berry of its own beside the bar berry or the tray's verdict berry.
 * 2. The gallery says what the app does: the trainer's peek face, and rows
 *    for the streak rest-day save and the Charged state.
 * 3. PathwayTab hands Path Bloom the unlock through PathUnlockContext, and
 *    the hop fires when it turns true.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { MCQ_BEATS } from "../beats/mcq";
import { McqRunner } from "../beats/mcq/McqRunner";
import type { McqBeat } from "../beats/types";
import { BIBLE_ROWS } from "../mascot/bloomBible";
import { trainerOpening } from "../tabs/trainer/engine/TrainerScreen";
import { PathMascot, PathUnlockContext, type BloomMove } from "../tabs/pathway/PathMascot";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(here, path), "utf8");

let mounted: { root: Root; container: HTMLElement } | null = null;
afterEach(() => {
  if (mounted !== null) {
    const { root, container } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = null;
  }
});

function mountElement(element: ReturnType<typeof createElement>): { container: HTMLElement; root: Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => root.render(element));
  return { container, root };
}

/** Every Bloom on screen is a Berry root ([data-state]) with a face (.bb-eyes[data-mood]). */
const blooms = (root: ParentNode) => [...root.querySelectorAll("[data-state] .bb-eyes")];

const wordBeatAt = (level: 0 | 1): McqBeat => {
  const found = MCQ_BEATS.find((beat) => beat.levels.includes(level) && beat.options.every((o) => o.text.length > 0));
  if (found === undefined) throw new Error(`no rung-${level} word MCQ beat`);
  return found;
};

function answerRight(container: HTMLElement, beat: McqBeat): void {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="Answer options"] button')];
  const index = beat.options.findIndex((o) => o.id === beat.correctOptionId);
  act(() => buttons[index]!.click());
  const check = [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === "Check");
  act(() => check!.click());
}

/* ------------------------------------------ 1. one Bloom on rung 0 -- */

describe("the how-to line never adds a second Bloom", () => {
  const cases: readonly { readonly name: string; readonly level: 0 | 1; readonly showHowTo?: boolean }[] = [
    { name: "showHowTo true", level: 1, showHowTo: true },
    { name: "rung 0 with showHowTo unset", level: 0 },
  ];
  for (const c of cases) {
    it(`${c.name}: one Bloom before the answer and one after`, () => {
      const beat = wordBeatAt(c.level);
      const { container } = mountElement(
        createElement(McqRunner, {
          node: beat.node,
          level: c.level,
          beats: [beat],
          onExit: () => undefined,
          reducedMotion: true,
          ...(c.showHowTo === undefined ? {} : { showHowTo: c.showHowTo }),
        }),
      );
      // The how-to line is up, so this is the frame the critic counted two Blooms in.
      expect(container.textContent).toContain("Pick one, then press Check.");
      expect(blooms(container)).toHaveLength(1);
      answerRight(container, beat);
      expect(container.textContent).toContain("Read the reason, then press Continue.");
      expect(blooms(container)).toHaveLength(1);
      expect(blooms(container.querySelector("[data-answer-tray]")!)).toHaveLength(1);
    });
  }
});

/* ----------------------------------------------- 2. gallery truth -- */

describe("the Bible gallery shows what the app does", () => {
  const byName = (name: string) => {
    const found = BIBLE_ROWS.find((r) => r.name === name);
    if (found === undefined) throw new Error(`no Bible row ${name}`);
    return found;
  };

  it("the mechanism peek wears the trainer's own opening face and motion", () => {
    const opening = trainerOpening(false);
    expect(byName("Peek during a mechanism problem").demo).toMatchObject({ mood: opening.mood, behaviour: opening.behaviour, chain: opening.chain });
  });

  it("has a built row for the rest-day save, drawn as StreakScreen draws it", () => {
    const r = byName("Streak saved by a rest day");
    expect(r.decision).toBe("built");
    expect(r.demo).toMatchObject({ mood: "calm", behaviour: "wave" });
    expect(read("../lesson/StreakScreen.tsx")).toMatch(/<Berry mood="calm" behaviour="wave"/);
  });

  it("has a built row for Charged", () => {
    const r = byName("Charged");
    expect(r.decision).toBe("built");
    expect(r.demo?.state).toBe("charged");
    expect(read("../app/ui/Hud.tsx")).toMatch(/state="charged"/);
  });
});

/* -------------------------------------------- 3. the path unlock -- */

describe("PathwayTab tells Path Bloom about the unlock", () => {
  it("wraps PathMascot in PathUnlockContext with the chip's unlock flag", () => {
    expect(read("../tabs/pathway/PathwayTab.tsx")).toMatch(/<PathUnlockContext\.Provider value=\{unlock\}>\s*<PathMascot>/);
  });

  it("the hop fires when that flag turns true", () => {
    const seen: BloomMove[] = [];
    const tree = (unlocked: boolean) =>
      createElement(
        PathUnlockContext.Provider,
        { value: unlocked },
        createElement(PathMascot, {
          children: (move: BloomMove) => {
            seen.push(move);
            return null;
          },
        }),
      );
    const { root } = mountElement(tree(false));
    const before = seen[seen.length - 1]!;
    act(() => root.render(tree(true)));
    const after = seen[seen.length - 1]!;
    expect(after.behaviour).toBe("bounce");
    expect(after.behaviourKey).toBeGreaterThan(before.behaviourKey);
  });
});
